import api from "../api/axios";

export const login = async (email, password) => {
  const { data } = await api.post("/auth/login", { email, password });
  return data;
};

export const register = async (name, email, password) => {
  const { data } = await api.post("/auth/register", { name, email, password });
  return data;
};

export const logout = async () => {
  try {
    await api.post("/auth/logout");
  } catch (err) {
    // ignore
  }
};

export const logoutAll = async () => {
  try {
    await api.post("/auth/logout-all");
  } catch (err) {
    // ignore
  }
};

export const restoreSessionRefresh = async () => {
  const { data } = await api.post("/auth/refresh");
  return data;
};

export const getMe = async () => {
  const { data } = await api.get("/auth/me");
  return data;
};
