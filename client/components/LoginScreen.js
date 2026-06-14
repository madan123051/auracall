import React, { useState } from "react";
import { useAuth } from "./AuthProvider";

function SparkIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 3 1.3 4.2L17.5 9l-4.2 1.8L12 15l-1.3-4.2L6.5 9l4.2-1.8L12 3Z" />
      <path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z" />
    </svg>
  );
}

export default function LoginScreen() {
  const { loginWithGoogle, loginAnonymously } = useAuth();
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");

  const signIn = async (method) => {
    setLoading(method);
    setError("");
    try {
      if (method === "google") await loginWithGoogle();
      else await loginAnonymously();
    } catch (signInError) {
      setError(signInError.message || "Sign in failed. Please try again.");
    } finally {
      setLoading("");
    }
  };

  return (
    <main className="modern-login-page">
      <div className="login-orb login-orb-one" />
      <div className="login-orb login-orb-two" />

      <section className="login-story-panel">
        <div className="modern-login-brand">
          <div className="brand-mark">A</div>
          <span>
            <strong>AuraCall X</strong>
            <small>Connect intelligently</small>
          </span>
        </div>

        <div className="login-story-copy">
          <span className="section-kicker">Communication, upgraded</span>
          <h1>Every conversation feels closer.</h1>
          <p>AI-assisted chat, automatic language translation, and protected calls in one beautifully simple workspace.</p>
        </div>

        <div className="login-feature-grid">
          <article>
            <span><SparkIcon /></span>
            <strong>AI chat</strong>
            <small>Write faster with smart replies and conversation summaries.</small>
          </article>
          <article>
            <span>文</span>
            <strong>Live translation</strong>
            <small>Read incoming messages in your preferred language.</small>
          </article>
          <article>
            <span>✓</span>
            <strong>Protected calls</strong>
            <small>Reliable voice and video calling across your devices.</small>
          </article>
        </div>
      </section>

      <section className="login-action-panel">
        <div className="login-action-card">
          <span className="section-kicker">Welcome to Aura</span>
          <h2>Start connecting.</h2>
          <p>Your chats, calls, language preferences, and profile stay together.</p>

          {error && <div className="login-error">{error}</div>}

          <button
            className="login-google-button"
            type="button"
            disabled={Boolean(loading)}
            onClick={() => signIn("google")}
          >
            <span>G</span>
            {loading === "google" ? "Signing in..." : "Continue with Google"}
          </button>
          <button
            className="login-guest-button"
            type="button"
            disabled={Boolean(loading)}
            onClick={() => signIn("guest")}
          >
            {loading === "guest" ? "Creating your space..." : "Explore as guest"}
          </button>

          <small className="login-terms">By continuing, you agree to use AuraCall responsibly and respect other users.</small>
        </div>
      </section>
    </main>
  );
}
