import { createContext, useContext, useEffect, useReducer, useCallback } from "react";
import api from "../api/axios";

/* ── State shape ── */
const initialState = {
  user: null,
  loading: true,   // true while we're checking session on mount
  ready: false,    // true once initial check is done
};

/* ── Reducer ── */
const authReducer = (state, action) => {
  switch (action.type) {
    case "SET_USER":
      return { ...state, user: action.payload, loading: false, ready: true };
    case "CLEAR_USER":
      return { ...state, user: null, loading: false, ready: true };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    default:
      return state;
  }
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  /* ── On mount: try to restore session via /refresh ── */
  useEffect(() => {
    const restoreSession = async () => {
      const stored = localStorage.getItem("accessToken");
      if (!stored) {
        // No token at all — try silent refresh (cookie may still be valid)
        try {
          const { data } = await api.post("/auth/refresh");
          localStorage.setItem("accessToken", data.accessToken);
          dispatch({ type: "SET_USER", payload: data.user });
        } catch {
          dispatch({ type: "CLEAR_USER" });
        }
        return;
      }

      // Token exists — verify it's still valid
      try {
        const { data } = await api.get("/auth/me");
        dispatch({ type: "SET_USER", payload: data.user });
      } catch {
        // Access token may be expired — interceptor will refresh automatically
        // If it can't, the auth:logout event will fire
        dispatch({ type: "CLEAR_USER" });
      }
    };

    restoreSession();
  }, []);

  /* ── Listen for forced logout (interceptor couldn't refresh) ── */
  useEffect(() => {
    const handleForceLogout = () => {
      localStorage.removeItem("accessToken");
      dispatch({ type: "CLEAR_USER" });
    };
    window.addEventListener("auth:logout", handleForceLogout);
    return () => window.removeEventListener("auth:logout", handleForceLogout);
  }, []);

  /* ── register ── */
  const register = useCallback(async (name, email, password) => {
    const { data } = await api.post("/auth/register", { name, email, password });
    localStorage.setItem("accessToken", data.accessToken);
    dispatch({ type: "SET_USER", payload: data.user });
    return data;
  }, []);

  /* ── login ── */
  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("accessToken", data.accessToken);
    dispatch({ type: "SET_USER", payload: data.user });
    return data;
  }, []);

  /* ── logout ── */
  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore — we'll clear locally regardless
    }
    localStorage.removeItem("accessToken");
    dispatch({ type: "CLEAR_USER" });
  }, []);

  /* ── logoutAll ── */
  const logoutAll = useCallback(async () => {
    try {
      await api.post("/auth/logout-all");
    } catch {
      // ignore
    }
    localStorage.removeItem("accessToken");
    dispatch({ type: "CLEAR_USER" });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, register, login, logout, logoutAll }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
