import { createContext, useContext, useEffect, useReducer, useCallback } from "react";
import * as authService from "../services/authService";
import { setMemoryToken } from "../api/axios";

/* ── State shape ── */
const initialState = {
  user: null,
  loading: true,
  ready: false,
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

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const data = await authService.restoreSessionRefresh();
        setMemoryToken(data.accessToken);
        dispatch({ type: "SET_USER", payload: data.user });
      } catch {
        dispatch({ type: "CLEAR_USER" });
      }
    };
    restoreSession();
  }, []);

  useEffect(() => {
    const handleForceLogout = () => {
      setMemoryToken(null);
      dispatch({ type: "CLEAR_USER" });
    };
    window.addEventListener("auth:logout", handleForceLogout);
    return () => window.removeEventListener("auth:logout", handleForceLogout);
  }, []);

  const register = useCallback(async (name, email, password) => {
    const data = await authService.register(name, email, password);
    setMemoryToken(data.accessToken);
    dispatch({ type: "SET_USER", payload: data.user });
    return data;
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authService.login(email, password);
    setMemoryToken(data.accessToken);
    dispatch({ type: "SET_USER", payload: data.user });
    return data;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setMemoryToken(null);
    dispatch({ type: "CLEAR_USER" });
  }, []);

  const logoutAll = useCallback(async () => {
    await authService.logoutAll();
    setMemoryToken(null);
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
