import React, { useEffect, useRef } from 'react';
import { useSocket } from '../lib/socket';
import { startRingtone, stopRingtone, warmUpAudio } from '../lib/sounds';

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

const keyframesStyle = `
  @keyframes icoPulseRing {
    0% { transform: scale(1); opacity: 0.6; }
    100% { transform: scale(2.2); opacity: 0; }
  }
  @keyframes icoFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }
  @keyframes icoFadeIn {
    0% { opacity: 0; transform: scale(0.9); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes icoShake {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(15deg); }
    50% { transform: rotate(-15deg); }
    75% { transform: rotate(10deg); }
  }
`;

export default function IncomingCallOverlay() {
  const { callState, incomingCallInfo, acceptCall, rejectCall } = useSocket();
  const autoRejectRef = useRef(null);
  const styleRef = useRef(null);

  // ── Ringtone: play when incoming, stop when not ──
  useEffect(() => {
    if (callState === 'incoming' && incomingCallInfo) {
      startRingtone();
    } else {
      stopRingtone();
    }
    return () => {
      stopRingtone();
    };
  }, [callState, incomingCallInfo]);

  // Auto-reject after 30 seconds
  useEffect(() => {
    if (callState === 'incoming' && incomingCallInfo) {
      autoRejectRef.current = setTimeout(() => {
        rejectCall();
      }, 30000);
    }
    return () => {
      if (autoRejectRef.current) {
        clearTimeout(autoRejectRef.current);
        autoRejectRef.current = null;
      }
    };
  }, [callState, incomingCallInfo, rejectCall]);

  // Inject keyframes
  useEffect(() => {
    if (!styleRef.current) {
      const style = document.createElement('style');
      style.textContent = keyframesStyle;
      document.head.appendChild(style);
      styleRef.current = style;
    }
    return () => {
      if (styleRef.current) {
        document.head.removeChild(styleRef.current);
        styleRef.current = null;
      }
    };
  }, []);

  // Handle accept — unlock audio + stop ringtone first
  const handleAccept = () => {
    warmUpAudio(); // Unlock AudioContext on user gesture for Mobile Safari
    stopRingtone();
    acceptCall();
  };

  // Handle reject — stop ringtone first
  const handleReject = () => {
    stopRingtone();
    rejectCall();
  };

  if (callState !== 'incoming' || !incomingCallInfo) return null;

  const { callerName, callType } = incomingCallInfo;
  const initial = (callerName || '?')[0].toUpperCase();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: `radial-gradient(ellipse at center, ${COLORS.bgPrimary} 0%, ${COLORS.bgDeep} 70%)`,
        animation: 'icoFadeIn 0.3s ease-out',
      }}
    >
      {/* Pulse rings */}
      <div style={{ position: 'relative', width: 120, height: 120, marginBottom: 32 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: `2px solid ${COLORS.teal}`,
              animation: `icoPulseRing 2s ease-out ${i * 0.6}s infinite`,
            }}
          />
        ))}

        {/* Avatar */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.tealDark})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 44,
            fontWeight: 700,
            color: '#fff',
            boxShadow: `0 0 40px ${COLORS.teal}33`,
          }}
        >
          {initial}
        </div>
      </div>

      {/* Caller info */}
      <div style={{ textAlign: 'center', zIndex: 1, marginBottom: 12 }}>
        <h2
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: COLORS.text,
            margin: 0,
            marginBottom: 8,
          }}
        >
          {callerName}
        </h2>
        <p
          style={{
            color: COLORS.teal,
            fontSize: 15,
            margin: 0,
            animation: 'icoFloat 2s ease-in-out infinite',
            letterSpacing: '0.5px',
          }}
        >
          Incoming {callType === 'audio' ? 'Audio' : 'Video'} Call...
        </p>
      </div>

      {/* Phone icon shaking */}
      <div
        style={{
          fontSize: 36,
          marginBottom: 32,
          animation: 'icoShake 0.5s ease-in-out infinite',
        }}
      >
        📞
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 48, zIndex: 1 }}>
        {/* Decline */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={handleReject}
            style={{
              width: 68,
              height: 68,
              borderRadius: '50%',
              border: 'none',
              background: COLORS.reject,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: `0 6px 24px ${COLORS.reject}55`,
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow = `0 8px 32px ${COLORS.reject}77`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = `0 6px 24px ${COLORS.reject}55`;
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.11 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91" />
              <line x1="23" y1="1" x2="1" y2="23" />
            </svg>
          </button>
          <p style={{ color: COLORS.textSecondary, fontSize: 13, marginTop: 10, fontWeight: 500 }}>
            Decline
          </p>
        </div>

        {/* Accept */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={handleAccept}
            style={{
              width: 68,
              height: 68,
              borderRadius: '50%',
              border: 'none',
              background: COLORS.accept,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: `0 6px 24px ${COLORS.accept}55`,
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow = `0 8px 32px ${COLORS.accept}77`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = `0 6px 24px ${COLORS.accept}55`;
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </button>
          <p style={{ color: COLORS.textSecondary, fontSize: 13, marginTop: 10, fontWeight: 500 }}>
            Accept
          </p>
        </div>
      </div>
    </div>
  );
}
