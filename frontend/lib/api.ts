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
  if (!src || typeof src !== "string") return "";
  let clean = src.trim();
  if (!clean) return "";

  // Strip localhost / 127.0.0.1 / private IP / current domain prefixes so images load on any computer
  if (/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|0\.0\.0\.0|sriexplainer\.in|sriexplainer-in\.vercel\.app)(:\d+)?/i.test(clean)) {
    clean = clean.replace(/^https?:\/\/[^\/]+/i, "");
  }

  // Handle external HTTPS / HTTP URLs
  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    if (/\/uploads\//i.test(clean)) {
      const match = clean.match(/\/uploads\/.+$/i);
      if (match) clean = match[0];
    } else {
      if (clean.startsWith("http://") && !clean.includes("localhost")) {
        return clean.replace(/^http:\/\//i, "https://");
      }
      return clean;
    }
  }

  const normalized = clean.startsWith("/") ? clean : `/${clean}`;
  if (normalized.startsWith("/api/uploads/")) return normalized;
  if (normalized.startsWith("/uploads/")) return `/api${normalized}`;
  return `/api/uploads${normalized}`;
};
