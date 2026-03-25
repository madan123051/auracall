import React from 'react';
import { useAuth } from '../components/AuthProvider';
import { SocketProvider, useSocket } from '../lib/socket';
import Dashboard from '../components/Dashboard';
import VideoCall from '../components/VideoCall';
import IncomingCallOverlay from '../components/IncomingCallOverlay';

const COLORS = {
  bgDeep: '#070B10',
  bgPrimary: '#0D1117',
  bgCard: '#161B22',
  border: '#21262D',
  teal: '#00BFA6',
  tealDark: '#00897B',
  accept: '#22C55E',
  reject: '#EF4444',
  text: '#F0F6FC',
  textSecondary: '#8B949E',
};

// ── Format seconds to MM:SS ──
function formatTime(secs) {
  if (!secs || secs < 0) return '00:00';
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ── Call Ended Screen ──
function CallEndedScreen() {
  const { callEndInfo } = useSocket();

  if (!callEndInfo) return null;

  const initial = (callEndInfo.peerName || '?')[0].toUpperCase();

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: `radial-gradient(ellipse at center, ${COLORS.bgPrimary} 0%, ${COLORS.bgDeep} 70%)`,
        color: COLORS.text,
        gap: 20,
        animation: 'endFadeIn 0.4s ease-out',
      }}
    >
      <style>{`
        @keyframes endFadeIn {
          0% { opacity: 0; transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes endSlideUp {
          0% { opacity: 0; transform: translateY(16px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes endProgressBar {
          0% { width: 100%; }
          100% { width: 0%; }
        }
      `}</style>

      {/* Avatar */}
      <div
        style={{
          width: 90,
          height: 90,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.tealDark})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 36,
          fontWeight: 700,
          color: '#fff',
          boxShadow: `0 0 40px ${COLORS.teal}22`,
        }}
      >
        {initial}
      </div>

      {/* Call ended text */}
      <div style={{ textAlign: 'center', animation: 'endSlideUp 0.5s ease-out' }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0, marginBottom: 8 }}>
          Call Ended
        </h2>
        <p style={{ fontSize: 18, color: COLORS.text, margin: 0, marginBottom: 4 }}>
          {callEndInfo.peerName}
        </p>
        {callEndInfo.duration > 0 && (
          <p style={{ fontSize: 15, color: COLORS.teal, margin: 0, marginBottom: 8 }}>
            Duration: {formatTime(callEndInfo.duration)}
          </p>
        )}
        <p style={{ fontSize: 13, color: COLORS.textSecondary, margin: 0 }}>
          {callEndInfo.reason}
        </p>
      </div>

      {/* Auto-dismiss progress bar */}
      <div
        style={{
          width: 200,
          height: 3,
          borderRadius: 2,
          background: COLORS.border,
          marginTop: 16,
          overflow: 'hidden',
          animation: 'endSlideUp 0.6s ease-out',
        }}
      >
        <div
          style={{
            height: '100%',
            background: COLORS.teal,
            borderRadius: 2,
            animation: 'endProgressBar 3s linear forwards',
          }}
        />
      </div>
    </div>
  );
}

// ── Login page ──
function LoginPage() {
  const { loginWithGoogle, loginAnonymously } = useAuth();
  const [loading, setLoading] = React.useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error('Google login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousLogin = async () => {
    setLoading(true);
    try {
      await loginAnonymously();
    } catch (err) {
      console.error('Anonymous login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: COLORS.bgDeep,
        color: COLORS.text,
        gap: 24,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 18,
          background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.tealDark})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 8,
        }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 7l-7 5 7 5V7z" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
      </div>

      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>
          Aura<span style={{ color: COLORS.teal }}>Call</span>
        </h1>
        <p style={{ fontSize: 14, color: COLORS.textSecondary, marginTop: 8 }}>
          Crystal-clear video calls, anywhere
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 280, marginTop: 16 }}>
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            padding: '14px 24px',
            borderRadius: 14,
            border: `1px solid ${COLORS.border}`,
            background: COLORS.bgCard,
            color: COLORS.text,
            fontSize: 15,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            transition: 'all 0.2s',
          }}
        >
          {loading ? 'Signing in...' : '🔵 Continue with Google'}
        </button>

        <button
          onClick={handleAnonymousLogin}
          disabled={loading}
          style={{
            padding: '14px 24px',
            borderRadius: 14,
            border: 'none',
            background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.tealDark})`,
            color: '#fff',
            fontSize: 15,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            transition: 'all 0.2s',
          }}
        >
          {loading ? 'Signing in...' : '🚀 Try as Guest'}
        </button>
      </div>
    </div>
  );
}

// ── App content when logged in (inside SocketProvider) ──
function AppContent() {
  const { currentUser } = useAuth();
  const { callState, callPeer, callUser, endCall, callEndInfo } = useSocket();

  const handleStartCall = React.useCallback(
    (friend, type) => {
      // friend has: uid, displayName, photoURL
      // Call by UID so we don't need their socketId
      callUser(null, friend.displayName, friend.uid, type || 'video');
    },
    [callUser]
  );

  // Show end call screen
  if (callState === 'ended') {
    return <CallEndedScreen />;
  }

  // Show VideoCall when in a call
  if (callState === 'connected' || callState === 'calling') {
    return (
      <>
        <IncomingCallOverlay />
        <VideoCall
          userName={currentUser?.displayName || 'User'}
          peerInfo={callPeer}
        />
      </>
    );
  }

  // Default: Dashboard with incoming call overlay
  return (
    <>
      <IncomingCallOverlay />
      <Dashboard onStartVideoCall={handleStartCall} />
    </>
  );
}

// ── Main page component ──
export default function Home() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: `radial-gradient(ellipse at center, ${COLORS.bgPrimary} 0%, ${COLORS.bgDeep} 70%)`,
          color: COLORS.textSecondary,
          fontSize: 16,
          gap: 20,
        }}
      >
        <style>{`
          @keyframes loadingLogoPulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.08); opacity: 0.7; }
          }
          @keyframes loadingFadeIn {
            0% { opacity: 0; }
            100% { opacity: 1; }
          }
          @keyframes loadingDot {
            0%, 80%, 100% { opacity: 0.3; }
            40% { opacity: 1; }
          }
        `}</style>

        {/* Animated logo */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.tealDark})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'loadingLogoPulse 2s ease-in-out infinite',
            boxShadow: `0 0 40px ${COLORS.teal}33`,
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 7l-7 5 7 5V7z" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
        </div>

        <div style={{ textAlign: 'center', animation: 'loadingFadeIn 0.6s ease-out' }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: COLORS.text, margin: 0 }}>
            Aura<span style={{ color: COLORS.teal }}>Call</span>
          </h1>
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 12 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: COLORS.teal,
                  animation: `loadingDot 1.4s ease-in-out ${i * 0.16}s infinite both`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  return (
    <SocketProvider
      user={{
        uid: currentUser.uid,
        displayName: currentUser.displayName || 'User',
        photoURL: currentUser.photoURL || '',
      }}
    >
      <AppContent />
    </SocketProvider>
  );
}
