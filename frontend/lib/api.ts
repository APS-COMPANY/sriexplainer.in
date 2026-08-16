import axios from "axios";
import { showWarning } from "../components/notification-provider";

export const getApiUrl = () => {
  if (typeof window !== "undefined") {
    return `${window.location.origin.replace(/\/+$/, "")}/api`;
  }
  return "/api";
};

export const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token") || localStorage.getItem("sri_token") || null;
};

export const setToken = (t: string) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("token", t);
  localStorage.setItem("sri_token", t);
};

export const removeToken = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("sri_token");
};

export const api = axios.create({
  timeout: 45000,
});

api.interceptors.request.use((config) => {
  config.baseURL = getApiUrl();
  if (typeof window !== "undefined") {
    const token = getToken();
    if (token) {
      if (config.headers && typeof config.headers.set === "function") {
        config.headers.set("Authorization", `Bearer ${token}`);
      } else if (config.headers) {
        (config.headers as any).Authorization = `Bearer ${token}`;
      }
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      const msg = error.response.data?.message || "";
      const isSessionReplaced =
        msg.includes("signed in on another device") ||
        error.response.data?.sessionExpired;

      if (isSessionReplaced) {
        removeToken();
        showWarning("Your account was signed in on another device.");
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export const image = (src: string) => {
  if (!src) return "";
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  const clean = src.startsWith("/") ? src : `/${src}`;
  if (clean.startsWith("/api/uploads/")) return clean;
  if (clean.startsWith("/uploads/")) return `/api${clean}`;
  return `/api/uploads${clean}`;
};
