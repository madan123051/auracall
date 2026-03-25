import React, { useState, useEffect } from "react";
import { useAuth } from "../components/AuthProvider";
import Dashboard from "../components/Dashboard";

const THEME = {
  bg: "#070B10",
  cardBg: "#0D1117",
  teal: "#00BFA6",
  tealHover: "#00E5C3",
  text: "#FFFFFF",
  textSecondary: "#8B949E",
  border: "#21262D",
  inputBg: "#161B22",
};

const styles = {
  landingContainer: {
    minHeight: "100vh",
    backgroundColor: THEME.bg,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    position: "relative",
    overflow: "hidden",
  },
  bgGlow1: {
    position: "absolute",
    top: "-200px",
    left: "-200px",
    width: "500px",
    height: "500px",
    borderRadius: "50%",
    background: `radial-gradient(circle, rgba(0,191,166,0.08) 0%, transparent 70%)`,
    pointerEvents: "none",
  },
  bgGlow2: {
    position: "absolute",
    bottom: "-150px",
    right: "-150px",
    width: "400px",
    height: "400px",
    borderRadius: "50%",
    background: `radial-gradient(circle, rgba(0,191,166,0.06) 0%, transparent 70%)`,
    pointerEvents: "none",
  },
  heroSection: {
    textAlign: "center",
    zIndex: 1,
    maxWidth: "440px",
  },
  logoContainer: {
    marginBottom: "16px",
  },
  logoIcon: {
    width: "80px",
    height: "80px",
    borderRadius: "24px",
    background: `linear-gradient(135deg, ${THEME.teal}, #0088cc)`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "36px",
    margin: "0 auto 16px auto",
    boxShadow: `0 8px 32px rgba(0,191,166,0.3)`,
  },
  logoText: {
    fontSize: "42px",
    fontWeight: "800",
    background: `linear-gradient(135deg, ${THEME.teal}, ${THEME.tealHover}, #00D9FF)`,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    letterSpacing: "-1px",
    lineHeight: "1.1",
  },
  tagline: {
    fontSize: "18px",
    color: THEME.textSecondary,
    marginTop: "12px",
    lineHeight: "1.5",
    fontWeight: "400",
  },
  featuresRow: {
    display: "flex",
    gap: "12px",
    margin: "36px 0",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  featureChip: {
    padding: "10px 18px",
    borderRadius: "12px",
    backgroundColor: THEME.cardBg,
    border: `1px solid ${THEME.border}`,
    fontSize: "13px",
    color: THEME.text,
    fontWeight: "500",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  featureIcon: {
    fontSize: "16px",
  },
  loginCard: {
    padding: "32px",
    borderRadius: "20px",
    backgroundColor: THEME.cardBg,
    border: `1px solid ${THEME.border}`,
    backdropFilter: "blur(20px)",
    width: "100%",
    maxWidth: "380px",
    boxShadow: `0 8px 40px rgba(0,0,0,0.4)`,
  },
  loginTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: THEME.text,
    textAlign: "center",
    marginBottom: "8px",
  },
  loginSubtitle: {
    fontSize: "14px",
    color: THEME.textSecondary,
    textAlign: "center",
    marginBottom: "28px",
  },
  googleBtn: {
    width: "100%",
    padding: "14px 24px",
    borderRadius: "14px",
    border: "none",
    backgroundColor: THEME.teal,
    color: "#000",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    transition: "all 0.3s ease",
    boxShadow: `0 4px 16px rgba(0,191,166,0.3)`,
  },
  googleIcon: {
    width: "20px",
    height: "20px",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    margin: "24px 0",
  },
  dividerLine: {
    flex: 1,
    height: "1px",
    backgroundColor: THEME.border,
  },
  dividerText: {
    fontSize: "12px",
    color: THEME.textSecondary,
    fontWeight: "500",
  },
  securityNote: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 16px",
    borderRadius: "10px",
    backgroundColor: THEME.inputBg,
    fontSize: "12px",
    color: THEME.textSecondary,
    lineHeight: "1.4",
  },
  errorMsg: {
    padding: "12px",
    borderRadius: "10px",
    backgroundColor: "rgba(248,81,73,0.1)",
    color: "#F85149",
    fontSize: "13px",
    textAlign: "center",
    marginBottom: "16px",
  },
  loadingScreen: {
    minHeight: "100vh",
    backgroundColor: THEME.bg,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "20px",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: `3px solid ${THEME.border}`,
    borderTopColor: THEME.teal,
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  footer: {
    marginTop: "40px",
    fontSize: "12px",
    color: THEME.textSecondary,
    textAlign: "center",
    zIndex: 1,
  },
};

export default function Home() {
  const { currentUser, loading, login } = useAuth();
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    setLoginError("");
    setIsLoggingIn(true);
    try {
      await login();
    } catch (error) {
      console.error("[Home] Login error:", error);
      if (error.code === "auth/popup-closed-by-user") {
        setLoginError("Sign-in popup was closed. Please try again.");
      } else if (error.code === "auth/popup-blocked") {
        setLoginError("Pop-up blocked by browser. Please allow pop-ups and try again.");
      } else {
        setLoginError(error.message || "Failed to sign in. Please try again.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.spinner} />
        <div style={{ color: THEME.textSecondary, fontSize: "14px" }}>Loading AuraCall...</div>
        <style jsx global>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Logged in — show Dashboard
  if (currentUser) {
    return <Dashboard />;
  }

  // Landing page
  return (
    <div style={styles.landingContainer}>
      {/* Background glows */}
      <div style={styles.bgGlow1} />
      <div style={styles.bgGlow2} />

      {/* Hero */}
      <div style={styles.heroSection}>
        <div style={styles.logoContainer}>
          <div style={styles.logoIcon}>📡</div>
          <div style={styles.logoText}>AuraCall</div>
        </div>
        <div style={styles.tagline}>
          Crystal-clear video calls, real-time chat, and seamless connections — all in one place.
        </div>

        {/* Features */}
        <div style={styles.featuresRow}>
          <div style={styles.featureChip}>
            <span style={styles.featureIcon}>🎥</span>
            HD Video
          </div>
          <div style={styles.featureChip}>
            <span style={styles.featureIcon}>💬</span>
            Real-time Chat
          </div>
          <div style={styles.featureChip}>
            <span style={styles.featureIcon}>👥</span>
            Friends
          </div>
          <div style={styles.featureChip}>
            <span style={styles.featureIcon}>🔒</span>
            Encrypted
          </div>
        </div>

        {/* Login Card */}
        <div style={styles.loginCard}>
          <div style={styles.loginTitle}>Welcome Back</div>
          <div style={styles.loginSubtitle}>Sign in to continue to AuraCall</div>

          {loginError && <div style={styles.errorMsg}>{loginError}</div>}

          <button
            style={{
              ...styles.googleBtn,
              ...(isLoggingIn ? { opacity: 0.7, cursor: "not-allowed" } : {}),
            }}
            onClick={handleLogin}
            disabled={isLoggingIn}
            onMouseEnter={(e) => {
              if (!isLoggingIn) {
                e.target.style.backgroundColor = THEME.tealHover;
                e.target.style.boxShadow = `0 6px 24px rgba(0,191,166,0.4)`;
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = THEME.teal;
              e.target.style.boxShadow = `0 4px 16px rgba(0,191,166,0.3)`;
            }}
          >
            <svg style={styles.googleIcon} viewBox="0 0 24 24">
              <path
                fill="#000"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="#000"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#000"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#000"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {isLoggingIn ? "Signing in..." : "Continue with Google"}
          </button>

          <div style={styles.divider}>
            <div style={styles.dividerLine} />
            <div style={styles.dividerText}>SECURE</div>
            <div style={styles.dividerLine} />
          </div>

          <div style={styles.securityNote}>
            <span>🔐</span>
            <span>
              Your data is protected with end-to-end encryption. We never store your call content.
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <div>AuraCall © {new Date().getFullYear()} — Built with WebRTC & Firebase</div>
      </div>

      {/* Global animation styles */}
      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
