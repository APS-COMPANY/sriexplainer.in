"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, setToken } from "../lib/api";

declare global {
  interface Window {
    google?: any;
  }
}

export function GoogleAuthButton({ label = "Sign in with Google" }: { label?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const btnRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isRendered, setIsRendered] = useState(false);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "166190554359-lgi7mit0dtto8fc74tsm5cl6le8pbrn8.apps.googleusercontent.com";

  const performGoogleBackendAuth = async (email?: string, name?: string, avatar?: string, credential?: string) => {
    try {
      setLoading(true);
      setError("");
      const res = await api.post("/auth/google", { credential, email, name, avatar });
      if (res.data.token) {
        setToken(res.data.token);
        console.log("[Auth State]: Google login successful, token persisted:", res.data.token.substring(0, 15) + "...");
        
        const fromApp = searchParams.get("fromApp") === "true" || (typeof window !== "undefined" && window.location.search.includes("fromApp=true"));
        if (fromApp) {
          window.location.href = `sriexplainer://auth?token=${res.data.token}`;
          return;
        }

        const targetUrl = searchParams.get("redirect") || "/";
        window.location.href = targetUrl;
      } else {
        setError("Login failed. Please try again.");
      }
    } catch (err: any) {
      console.error("Google auth server error:", err);
      if (err?.code === "ECONNABORTED" || err?.message?.includes("timeout")) {
        setError("Server is waking up... Please click again in 5 seconds.");
      } else {
        const serverMsg = err?.response?.data?.message;
        const statusMsg = err?.response?.status ? `(Error ${err.response.status})` : "";
        const netMsg = err?.message || "";
        const msg = serverMsg ? `${serverMsg} ${statusMsg}` : (netMsg ? `${netMsg} ${statusMsg}` : "Google authentication failed. Please try again.");
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const redirectToGoogleOAuth = (isAppFlow: boolean = false) => {
    if (typeof window === "undefined") return;
    setLoading(true);
    const redirectUri = isAppFlow ? "https://sriexplainer.in/login?fromApp=true" : "https://sriexplainer.in/login";
    const nonce = Math.random().toString(36).substring(2);
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=id_token%20token&scope=openid%20email%20profile&nonce=${nonce}&prompt=select_account`;
    
    if (isAppFlow) {
      window.open(authUrl, "_system");
    } else {
      window.location.href = authUrl;
    }
  };

  const triggerGooglePopupOAuth = () => {
    if (typeof window === "undefined") return;

    if (window.google?.accounts?.oauth2) {
      setLoading(true);
      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
          callback: async (response: any) => {
            if (response.error) {
              setLoading(false);
              return;
            }
            if (response.access_token) {
              try {
                const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                  headers: { Authorization: `Bearer ${response.access_token}` },
                });
                const userInfo = await userRes.json();
                if (userInfo.email) {
                  await performGoogleBackendAuth(userInfo.email, userInfo.name, userInfo.picture);
                } else {
                  redirectToGoogleOAuth();
                }
              } catch (e) {
                console.error("Error fetching user info:", e);
                redirectToGoogleOAuth();
              }
            } else {
              setLoading(false);
            }
          },
        });
        tokenClient.requestAccessToken({ prompt: "select_account" });
      } catch (err) {
        console.error("Token client error:", err);
        redirectToGoogleOAuth();
      }
    } else {
      redirectToGoogleOAuth();
    }
  };

  const handleGoogleClick = () => {
    if (typeof window !== "undefined") {
      const isCapacitor = (window as any).Capacitor?.isNativePlatform?.() || !!(window as any).Capacitor;
      if (isCapacitor) {
        redirectToGoogleOAuth(true);
        return;
      }
    }

    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment() || notification.isDismissedMoment()) {
            triggerGooglePopupOAuth();
          }
        });
      } catch {
        triggerGooglePopupOAuth();
      }
    } else {
      triggerGooglePopupOAuth();
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check URL hash for returning Google OAuth token response
    if (window.location.hash && (window.location.hash.includes("id_token=") || window.location.hash.includes("access_token="))) {
      const params = new URLSearchParams(window.location.hash.substring(1));
      const idToken = params.get("id_token");
      const accessToken = params.get("access_token");

      if (idToken) {
        performGoogleBackendAuth(undefined, undefined, undefined, idToken);
        window.history.replaceState(null, "", window.location.pathname);
        return;
      } else if (accessToken) {
        fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.email) {
              performGoogleBackendAuth(data.email, data.name, data.picture);
            }
          })
          .catch(() => {});
        window.history.replaceState(null, "", window.location.pathname);
        return;
      }
    }

    const parseJwt = (token: string) => {
      try {
        if (!token) return null;
        let base64Url = token.split(".")[1];
        if (!base64Url) return null;
        let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        while (base64.length % 4 !== 0) {
          base64 += "=";
        }
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );
        return JSON.parse(jsonPayload);
      } catch {
        try {
          let base64Url = token.split(".")[1];
          let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
          while (base64.length % 4 !== 0) {
            base64 += "=";
          }
          return JSON.parse(atob(base64));
        } catch {
          return null;
        }
      }
    };

    const initGoogle = () => {
      if (!window.google?.accounts?.id || !clientId) return;

      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: any) => {
            try {
              const payload = parseJwt(response.credential);
              await performGoogleBackendAuth(
                payload?.email,
                payload?.name,
                payload?.picture,
                response.credential
              );
            } catch {
              await performGoogleBackendAuth(undefined, undefined, undefined, response.credential);
            }
          },
        });

        const tryRender = (attemptsLeft: number) => {
          if (btnRef.current && window.google?.accounts?.id) {
            try {
              window.google.accounts.id.renderButton(btnRef.current, {
                theme: "filled_dark",
                size: "large",
                width: 350,
                text: "continue_with",
                shape: "rectangular",
              });
              if (btnRef.current.children.length > 0) {
                setIsRendered(true);
                return;
              }
            } catch (err) {
              console.warn("Google renderButton notice:", err);
            }
          }
          if (attemptsLeft > 0) {
            setTimeout(() => tryRender(attemptsLeft - 1), 150);
          }
        };

        tryRender(3);
      } catch (e) {
        console.error("Google init error:", e);
      }
    };

    if (document.getElementById("google-gis-script")) {
      initGoogle();
    } else {
      const script = document.createElement("script");
      script.id = "google-gis-script";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => initGoogle();
      document.body.appendChild(script);
    }
  }, []);

  return (
    <div className="w-full flex flex-col items-center">
      {error && <p className="mb-2 text-xs text-red-400 text-center">{error}</p>}
      
      {/* Official Google Button Container */}
      <div ref={btnRef} className={isRendered ? "w-full min-h-[40px] flex justify-center" : "hidden"} />

      {/* Branded Google Button -> Triggers real Google OAuth account selector */}
      {!isRendered && (
        <button
          type="button"
          onClick={handleGoogleClick}
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl bg-[#131927] border border-white/10 hover:border-white/20 text-white font-medium text-xs flex items-center justify-center gap-3 transition-all shadow-md active:scale-95"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          {loading ? "Connecting to Google..." : label}
        </button>
      )}
    </div>
  );
}
