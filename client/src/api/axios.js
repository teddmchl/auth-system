import axios from "axios";

/**
 * Race-condition-safe token refresh interceptor.
 *
 * Problem: If multiple requests fire simultaneously and all get a 401,
 * naive implementations call /refresh N times in parallel — the first
 * succeeds, the rest fail because the old refresh token is already rotated.
 *
 * Solution: Use a flag + promise queue pattern.
 *  1. The FIRST 401 sets isRefreshing = true and kicks off the refresh.
 *  2. Subsequent 401s during refresh are paused: their resolve/reject
 *     callbacks are pushed onto a queue (failedQueue).
 *  3. When refresh succeeds, the queue is flushed — all paused requests
 *     retry with the new access token.
 *  4. If refresh fails, the queue is rejected and the user is logged out.
 */

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true, // send httpOnly refresh cookie
});

let isRefreshing = false;
let failedQueue = []; // [{ resolve, reject }]
let memoryToken = null;

export const setMemoryToken = (token) => {
  memoryToken = token;
};

const flushQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
};

/* ── Request interceptor: attach access token ── */
api.interceptors.request.use(
  (config) => {
    if (memoryToken) {
      config.headers.Authorization = `Bearer ${memoryToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* ── Response interceptor: handle 401, refresh, retry ── */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh on 401, and not on the refresh endpoint itself
    // _retry flag prevents infinite loops
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url === "/auth/refresh" ||
      originalRequest.url === "/auth/login"
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Another refresh is already in flight — queue this request
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    // We are the first — kick off the refresh
    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data } = await api.post("/auth/refresh");
      const newToken = data.accessToken;

      // Set the in-memory token directly
      setMemoryToken(newToken);

      // Update the Authorization header for the axios default headers too
      api.defaults.headers.common.Authorization = `Bearer ${newToken}`;

      // Flush all queued requests with the new token
      flushQueue(null, newToken);

      // Retry the original request
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      // Refresh failed — clear everything and notify queued requests
      flushQueue(refreshError, null);
      setMemoryToken(null);

      // Dispatch a custom event so AuthContext can update state
      window.dispatchEvent(new CustomEvent("auth:logout"));

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
