import React from 'react';
import { useAuth } from '../components/AuthProvider';
import { SocketProvider, useSocket } from '../lib/socket';
import Dashboard from '../components/Dashboard';
import VideoCall from '../components/VideoCall';
import IncomingCallOverlay from '../components/IncomingCallOverlay';

// ── Login page (same as original) ──
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
        background: '#070B10',
        color: '#F0F6FC',
        gap: 24,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 18,
          background: 'linear-gradient(135deg, #00BFA6, #00897B)',
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
          Aura<span style={{ color: '#00BFA6' }}>Call</span>
        </h1>
        <p style={{ fontSize: 14, color: '#8B949E', marginTop: 8 }}>
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
            border: '1px solid #21262D',
            background: '#161B22',
            color: '#F0F6FC',
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
            background: 'linear-gradient(135deg, #00BFA6, #00897B)',
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
  const { callState, callPeer, callUser, endCall } = useSocket();

  const handleStartCall = React.useCallback(
    (friend, type) => {
      // friend has: uid, displayName, photoURL
      // Call by UID so we don't need their socketId
      callUser(null, friend.displayName, friend.uid, type || 'video');
    },
    [callUser]
  );

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
          alignItems: 'center',
          justifyContent: 'center',
          background: '#070B10',
          color: '#8B949E',
          fontSize: 16,
        }}
      >
        Loading...
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
