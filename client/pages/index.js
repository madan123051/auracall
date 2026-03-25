import { useState } from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';

const VideoCall = dynamic(() => import('../components/VideoCall'), { ssr: false });

export default function Home() {
  const [userName, setUserName] = useState('');
  const [joined, setJoined] = useState(false);

  const handleJoin = (e) => {
    e.preventDefault();
    if (userName.trim().length >= 2) {
      setJoined(true);
    }
  };

  if (joined) {
    return (
      <>
        <Head>
          <title>AuraCall — Video Calls</title>
          <meta name="description" content="AuraCall — Crystal clear video calls" />
        </Head>
        <VideoCall userName={userName.trim()} />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>AuraCall — Join</title>
      </Head>
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #070B10 0%, #0D1117 50%, #070B10 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Ambient glow */}
        <div
          style={{
            position: 'absolute',
            width: 500,
            height: 500,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,191,166,0.08) 0%, transparent 70%)',
            top: '20%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
        />

        <form
          onSubmit={handleJoin}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 32,
            animation: 'fade-in 0.6s ease-out',
            zIndex: 1,
          }}
        >
          {/* Logo */}
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 20,
                background: 'linear-gradient(135deg, #00BFA6, #00897B)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                boxShadow: '0 8px 32px rgba(0,191,166,0.3)',
              }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15.05 5A5 5 0 0 1 19 8.95M15.05 1A9 9 0 0 1 23 8.94M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <h1 style={{ fontSize: 36, fontWeight: 700, color: '#F0F6FC', letterSpacing: '-0.5px' }}>
              Aura<span style={{ color: '#00BFA6' }}>Call</span>
            </h1>
            <p style={{ color: '#8B949E', marginTop: 8, fontSize: 15 }}>
              Crystal clear video calls, anywhere
            </p>
          </div>

          {/* Input */}
          <div style={{ width: 320 }}>
            <input
              type="text"
              placeholder="Enter your name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                padding: '16px 20px',
                borderRadius: 14,
                border: '1px solid #21262D',
                background: '#161B22',
                color: '#F0F6FC',
                fontSize: 16,
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#00BFA6')}
              onBlur={(e) => (e.target.style.borderColor = '#21262D')}
            />
          </div>

          {/* Button */}
          <button
            type="submit"
            disabled={userName.trim().length < 2}
            style={{
              width: 320,
              padding: '16px 0',
              borderRadius: 14,
              border: 'none',
              background: userName.trim().length >= 2
                ? 'linear-gradient(135deg, #00BFA6, #00897B)'
                : '#21262D',
              color: userName.trim().length >= 2 ? '#fff' : '#8B949E',
              fontSize: 16,
              fontWeight: 600,
              cursor: userName.trim().length >= 2 ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              boxShadow: userName.trim().length >= 2
                ? '0 4px 24px rgba(0,191,166,0.3)'
                : 'none',
            }}
          >
            Join AuraCall
          </button>

          <p style={{ color: '#484F58', fontSize: 13 }}>
            No account needed · Peer-to-peer encrypted
          </p>
        </form>
      </div>
    </>
  );
}
