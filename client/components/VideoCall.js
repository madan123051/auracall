import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

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
  glass: 'rgba(13,17,23,0.75)',
};

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function VideoCall({ userName }) {
  // ── State ──
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isInCall, setIsInCall] = useState(false);
  const [isCallIncoming, setIsCallIncoming] = useState(false);
  const [callerInfo, setCallerInfo] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [callTimer, setCallTimer] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingTo, setConnectingTo] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [remoteMediaState, setRemoteMediaState] = useState({ audio: true, video: true });

  // ── Refs ──
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const socketRef = useRef(null);
  const currentTargetRef = useRef(null);
  const timerRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);

  // ── Format timer ──
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ── Create peer connection ──
  const createPeerConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate && currentTargetRef.current) {
        socketRef.current?.emit('ice-candidate', {
          targetSocketId: currentTargetRef.current,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      setRemoteStream(stream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('ICE state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        endCall();
      }
    };

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    peerConnectionRef.current = pc;
    return pc;
  }, []);

  // ── End call ──
  const endCall = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (currentTargetRef.current) {
      socketRef.current?.emit('end-call', { targetSocketId: currentTargetRef.current });
    }

    currentTargetRef.current = null;
    pendingCandidatesRef.current = [];
    setIsInCall(false);
    setIsConnecting(false);
    setIsCallIncoming(false);
    setCallerInfo(null);
    setRemoteStream(null);
    setCallTimer(0);
    setShowChat(false);
    setConnectingTo('');
    setRemoteMediaState({ audio: true, video: true });

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // ── Initialize socket & media ──
  useEffect(() => {
    const socket = io('http://localhost:5000', { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to signaling server:', socket.id);
      socket.emit('join-room', { userName, room: 'lobby' });
    });

    // Get user media
    navigator.mediaDevices
      .getUserMedia({
        video: { width: 1280, height: 720, frameRate: 30 },
        audio: true,
      })
      .then((stream) => {
        setLocalStream(stream);
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.error('Media access error:', err);
        // Fallback: audio only
        navigator.mediaDevices
          .getUserMedia({ video: false, audio: true })
          .then((stream) => {
            setLocalStream(stream);
            localStreamRef.current = stream;
          })
          .catch((e) => console.error('No media available:', e));
      });

    // ── Socket event listeners ──

    socket.on('online-users', (users) => {
      setOnlineUsers(users.filter((u) => u.socketId !== socket.id));
    });

    socket.on('incoming-call', ({ callerSocketId, callerName, callType }) => {
      console.log('Incoming call from', callerName);
      setCallerInfo({ callerSocketId, callerName, callType });
      setIsCallIncoming(true);
    });

    socket.on('call-accepted', async ({ accepterSocketId, accepterName }) => {
      console.log('Call accepted by', accepterName);
      currentTargetRef.current = accepterSocketId;
      setIsConnecting(false);
      setIsInCall(true);

      try {
        const pc = createPeerConnection();
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', { targetSocketId: accepterSocketId, offer });
      } catch (err) {
        console.error('Error creating offer:', err);
        endCall();
      }
    });

    socket.on('call-rejected', ({ rejecterName }) => {
      console.log('Call rejected by', rejecterName);
      currentTargetRef.current = null;
      setIsConnecting(false);
      setConnectingTo('');
    });

    socket.on('offer', async ({ senderSocketId, offer }) => {
      console.log('Received offer from', senderSocketId);
      currentTargetRef.current = senderSocketId;

      try {
        const pc = createPeerConnection();
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // Flush pending ICE candidates
        for (const candidate of pendingCandidatesRef.current) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        pendingCandidatesRef.current = [];

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { targetSocketId: senderSocketId, answer });
      } catch (err) {
        console.error('Error handling offer:', err);
      }
    });

    socket.on('answer', async ({ senderSocketId, answer }) => {
      console.log('Received answer from', senderSocketId);
      try {
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));

          // Flush pending ICE candidates
          for (const candidate of pendingCandidatesRef.current) {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          }
          pendingCandidatesRef.current = [];
        }
      } catch (err) {
        console.error('Error handling answer:', err);
      }
    });

    socket.on('ice-candidate', async ({ candidate }) => {
      try {
        if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          pendingCandidatesRef.current.push(candidate);
        }
      } catch (err) {
        console.error('ICE candidate error:', err);
      }
    });

    socket.on('call-ended', ({ senderName }) => {
      console.log('Call ended by', senderName);
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      currentTargetRef.current = null;
      pendingCandidatesRef.current = [];
      setIsInCall(false);
      setIsConnecting(false);
      setIsCallIncoming(false);
      setCallerInfo(null);
      setRemoteStream(null);
      setCallTimer(0);
      setShowChat(false);
      setRemoteMediaState({ audio: true, video: true });
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    });

    socket.on('receive-message', (msg) => {
      setMessages((prev) => [...prev, { ...msg, isMine: false }]);
    });

    socket.on('media-toggled', ({ mediaType, enabled }) => {
      setRemoteMediaState((prev) => ({ ...prev, [mediaType]: enabled }));
    });

    socket.on('user-left', ({ socketId }) => {
      if (currentTargetRef.current === socketId) {
        endCall();
      }
    });

    return () => {
      socket.disconnect();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [userName, createPeerConnection, endCall]);

  // ── Call timer ──
  useEffect(() => {
    if (isInCall) {
      timerRef.current = setInterval(() => {
        setCallTimer((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setCallTimer(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isInCall]);

  // ── Actions ──
  const callUser = (targetSocketId, targetName) => {
    currentTargetRef.current = targetSocketId;
    setConnectingTo(targetName);
    setIsConnecting(true);
    socketRef.current?.emit('call-user', {
      targetSocketId,
      callerName: userName,
      callerSocketId: socketRef.current.id,
      callType: 'video',
    });
  };

  const acceptCall = () => {
    if (!callerInfo) return;
    currentTargetRef.current = callerInfo.callerSocketId;
    setIsCallIncoming(false);
    setIsInCall(true);
    createPeerConnection();
    socketRef.current?.emit('accept-call', { callerSocketId: callerInfo.callerSocketId });
  };

  const rejectCall = () => {
    if (!callerInfo) return;
    socketRef.current?.emit('reject-call', { callerSocketId: callerInfo.callerSocketId });
    setIsCallIncoming(false);
    setCallerInfo(null);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        socketRef.current?.emit('toggle-media', {
          targetSocketId: currentTargetRef.current,
          mediaType: 'audio',
          enabled: audioTrack.enabled,
        });
      }
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
        socketRef.current?.emit('toggle-media', {
          targetSocketId: currentTargetRef.current,
          mediaType: 'video',
          enabled: videoTrack.enabled,
        });
      }
    }
  };

  const sendMessage = () => {
    const text = messageInput.trim();
    if (!text) return;
    const msg = {
      senderSocketId: socketRef.current?.id,
      senderName: userName,
      message: text,
      timestamp: Date.now(),
      isMine: true,
    };
    setMessages((prev) => [...prev, msg]);
    socketRef.current?.emit('send-message', {
      targetSocketId: currentTargetRef.current,
      message: text,
      senderName: userName,
    });
    setMessageInput('');
  };

  // ── Shared UI helpers ──
  const Avatar = ({ name, size = 48, fontSize = 20 }) => (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.tealDark})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize,
        fontWeight: 700,
        color: '#fff',
        flexShrink: 0,
      }}
    >
      {(name || '?')[0].toUpperCase()}
    </div>
  );

  const IconButton = ({ onClick, bg, children, size = 52, title }) => (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: 'none',
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'transform 0.15s, box-shadow 0.15s',
        boxShadow: `0 4px 16px ${bg}44`,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      {children}
    </button>
  );

  // ── SVG Icons ──
  const MicIcon = ({ off }) =>
    off ? (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
        <path d="M17 16.95A7 7 0 0 1 5 12" />
        <path d="M19 12a7 7 0 0 1-.11 1.23" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    ) : (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    );

  const CameraIcon = ({ off }) =>
    off ? (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l2-3h6l2 3h3a2 2 0 0 1 2 2v9" />
      </svg>
    ) : (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 7l-7 5 7 5V7z" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    );

  const PhoneOffIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.11 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91" />
      <line x1="23" y1="1" x2="1" y2="23" />
    </svg>
  );

  const ChatIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );

  const PhoneIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );

  const VideoIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 7l-7 5 7 5V7z" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );

  // ═══════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════

  // ── A. INCOMING CALL SCREEN ──
  if (isCallIncoming && callerInfo) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: COLORS.bgDeep,
          gap: 32,
        }}
      >
        {/* Pulse rings */}
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: 140,
              height: 140,
              borderRadius: '50%',
              border: `2px solid ${COLORS.teal}`,
              animation: `pulse-ring 2s ease-out ${i * 0.6}s infinite`,
            }}
          />
        ))}

        <Avatar name={callerInfo.callerName} size={100} fontSize={40} />

        <div style={{ textAlign: 'center', zIndex: 1 }}>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: COLORS.text }}>
            {callerInfo.callerName}
          </h2>
          <p
            style={{
              color: COLORS.teal,
              marginTop: 8,
              fontSize: 15,
              animation: 'float 2s ease-in-out infinite',
            }}
          >
            Incoming {callerInfo.callType || 'Video'} Call...
          </p>
        </div>

        <div style={{ display: 'flex', gap: 40, zIndex: 1, marginTop: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <IconButton onClick={rejectCall} bg={COLORS.reject} size={64}>
              <PhoneOffIcon />
            </IconButton>
            <p style={{ color: COLORS.textSecondary, fontSize: 13, marginTop: 8 }}>Decline</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <IconButton onClick={acceptCall} bg={COLORS.accept} size={64}>
              <PhoneIcon />
            </IconButton>
            <p style={{ color: COLORS.textSecondary, fontSize: 13, marginTop: 8 }}>Accept</p>
          </div>
        </div>
      </div>
    );
  }

  // ── B. CONNECTING SCREEN ──
  if (isConnecting) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: COLORS.bgDeep,
          gap: 32,
        }}
      >
        <Avatar name={connectingTo} size={90} fontSize={36} />

        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 22, fontWeight: 600, color: COLORS.text }}>
            Calling {connectingTo}
          </h2>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 16 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: COLORS.teal,
                  animation: `dot-bounce 1.4s ease-in-out ${i * 0.16}s infinite both`,
                }}
              />
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            socketRef.current?.emit('end-call', { targetSocketId: currentTargetRef.current });
            currentTargetRef.current = null;
            setIsConnecting(false);
            setConnectingTo('');
          }}
          style={{
            marginTop: 24,
            padding: '12px 36px',
            borderRadius: 30,
            border: `1px solid ${COLORS.border}`,
            background: 'transparent',
            color: COLORS.reject,
            fontSize: 15,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    );
  }

  // ── C. ACTIVE CALL SCREEN ──
  if (isInCall) {
    return (
      <div style={{ height: '100vh', background: '#000', position: 'relative', overflow: 'hidden' }}>
        {/* Remote video (full screen) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            background: '#000',
          }}
        />

        {/* Remote video placeholder if no stream */}
        {!remoteStream && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: COLORS.bgDeep,
              gap: 16,
            }}
          >
            <Avatar name={connectingTo || 'U'} size={100} fontSize={40} />
            <p style={{ color: COLORS.textSecondary, fontSize: 15 }}>Connecting video...</p>
          </div>
        )}

        {/* Top bar overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            padding: '20px 24px',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar name={connectingTo || 'U'} size={36} fontSize={14} />
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, color: COLORS.text }}>
                {connectingTo || 'In Call'}
              </p>
              <p style={{ fontSize: 12, color: COLORS.teal }}>{formatTime(callTimer)}</p>
            </div>
          </div>

          {/* Quality bars */}
          <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
            {[8, 12, 16, 20].map((h, i) => (
              <div
                key={i}
                style={{
                  width: 3,
                  height: h,
                  borderRadius: 2,
                  background: i < 3 ? COLORS.teal : COLORS.textSecondary,
                }}
              />
            ))}
          </div>
        </div>

        {/* Local video PiP */}
        <div
          style={{
            position: 'absolute',
            top: 80,
            right: 20,
            width: 150,
            height: 200,
            borderRadius: 16,
            overflow: 'hidden',
            border: `2px solid ${COLORS.border}`,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            zIndex: 10,
          }}
        >
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
          />
          {isCameraOff && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: COLORS.bgCard,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Avatar name={userName} size={48} fontSize={20} />
            </div>
          )}
        </div>

        {/* Bottom controls bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '24px 0 36px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
            zIndex: 10,
          }}
        >
          <IconButton
            onClick={toggleMute}
            bg={isMuted ? COLORS.reject : 'rgba(255,255,255,0.15)'}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            <MicIcon off={isMuted} />
          </IconButton>

          <IconButton
            onClick={toggleCamera}
            bg={isCameraOff ? COLORS.reject : 'rgba(255,255,255,0.15)'}
            title={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
          >
            <CameraIcon off={isCameraOff} />
          </IconButton>

          <IconButton
            onClick={() => setShowChat(!showChat)}
            bg={showChat ? COLORS.teal : 'rgba(255,255,255,0.15)'}
            title="Chat"
          >
            <ChatIcon />
          </IconButton>

          <IconButton onClick={endCall} bg={COLORS.reject} size={60} title="End Call">
            <PhoneOffIcon />
          </IconButton>
        </div>

        {/* In-call chat sidebar */}
        {showChat && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: 340,
              background: COLORS.glass,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderLeft: `1px solid ${COLORS.border}`,
              display: 'flex',
              flexDirection: 'column',
              zIndex: 20,
              animation: 'fade-in 0.3s ease-out',
            }}
          >
            <div
              style={{
                padding: '20px 16px',
                borderBottom: `1px solid ${COLORS.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Chat</h3>
              <button
                onClick={() => setShowChat(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: COLORS.textSecondary,
                  cursor: 'pointer',
                  fontSize: 20,
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    alignSelf: msg.isMine ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                    padding: '10px 14px',
                    borderRadius: msg.isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: msg.isMine ? COLORS.teal : COLORS.bgCard,
                    color: COLORS.text,
                    fontSize: 14,
                  }}
                >
                  {!msg.isMine && (
                    <p style={{ fontSize: 11, color: COLORS.teal, marginBottom: 4, fontWeight: 600 }}>
                      {msg.senderName}
                    </p>
                  )}
                  <p>{msg.message}</p>
                </div>
              ))}
            </div>

            <div style={{ padding: 12, borderTop: `1px solid ${COLORS.border}`, display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="Type a message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: `1px solid ${COLORS.border}`,
                  background: COLORS.bgCard,
                  color: COLORS.text,
                  fontSize: 14,
                  outline: 'none',
                }}
              />
              <button
                onClick={sendMessage}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  border: 'none',
                  background: COLORS.teal,
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                }}
              >
                ➤
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── D. MAIN LOBBY SCREEN ──
  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: COLORS.bgDeep,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 24px',
          borderBottom: `1px solid ${COLORS.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: COLORS.bgPrimary,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.tealDark})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PhoneIcon />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>
            Aura<span style={{ color: COLORS.teal }}>Call</span>
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: COLORS.accept,
              boxShadow: `0 0 8px ${COLORS.accept}`,
            }}
          />
          <span style={{ fontSize: 14, color: COLORS.textSecondary }}>{userName}</span>
          <Avatar name={userName} size={32} fontSize={14} />
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Users list */}
        <div
          style={{
            flex: 1,
            padding: 24,
            overflowY: 'auto',
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 16 }}>
            Online Users ({onlineUsers.length})
          </h2>

          {onlineUsers.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: 60,
                color: COLORS.textSecondary,
                animation: 'fade-in 0.5s ease-out',
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>👋</div>
              <p style={{ fontSize: 18, fontWeight: 500, color: COLORS.text, marginBottom: 8 }}>
                No one else is here yet
              </p>
              <p style={{ fontSize: 14 }}>
                Open this app in another tab or device to start a call
              </p>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {onlineUsers.map((user) => (
              <div
                key={user.socketId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  borderRadius: 14,
                  background: COLORS.bgCard,
                  border: `1px solid ${COLORS.border}`,
                  transition: 'border-color 0.2s',
                  animation: 'fade-in 0.4s ease-out',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = COLORS.teal + '44')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = COLORS.border)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <Avatar name={user.userName} size={44} fontSize={18} />
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: COLORS.text }}>
                      {user.userName}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background:
                            user.status === 'in-call'
                              ? COLORS.reject
                              : COLORS.accept,
                        }}
                      />
                      <span style={{ fontSize: 12, color: COLORS.textSecondary }}>
                        {user.status === 'in-call' ? 'In a call' : 'Online'}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => callUser(user.socketId, user.userName)}
                    disabled={user.status === 'in-call'}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      border: 'none',
                      background:
                        user.status === 'in-call'
                          ? COLORS.border
                          : `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.tealDark})`,
                      cursor: user.status === 'in-call' ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'transform 0.15s',
                    }}
                    title="Video Call"
                    onMouseEnter={(e) =>
                      user.status !== 'in-call' && (e.currentTarget.style.transform = 'scale(1.1)')
                    }
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    <VideoIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Local video preview */}
        <div
          style={{
            width: 300,
            padding: 24,
            borderLeft: `1px solid ${COLORS.border}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 600, color: COLORS.textSecondary }}>Camera Preview</h3>
          <div
            style={{
              flex: 1,
              maxHeight: 260,
              borderRadius: 16,
              overflow: 'hidden',
              border: `1px solid ${COLORS.border}`,
              background: COLORS.bgCard,
              position: 'relative',
            }}
          >
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)',
              }}
            />
            {isCameraOff && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: COLORS.bgCard,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Avatar name={userName} size={56} fontSize={24} />
              </div>
            )}
          </div>

          {/* Quick controls */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              onClick={toggleMute}
              style={{
                padding: '10px 20px',
                borderRadius: 10,
                border: `1px solid ${isMuted ? COLORS.reject : COLORS.border}`,
                background: isMuted ? COLORS.reject + '22' : 'transparent',
                color: isMuted ? COLORS.reject : COLORS.text,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <MicIcon off={isMuted} />
              {isMuted ? 'Muted' : 'Mic On'}
            </button>
            <button
              onClick={toggleCamera}
              style={{
                padding: '10px 20px',
                borderRadius: 10,
                border: `1px solid ${isCameraOff ? COLORS.reject : COLORS.border}`,
                background: isCameraOff ? COLORS.reject + '22' : 'transparent',
                color: isCameraOff ? COLORS.reject : COLORS.text,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <CameraIcon off={isCameraOff} />
              {isCameraOff ? 'Cam Off' : 'Cam On'}
            </button>
          </div>

          {/* Recent messages in lobby */}
          {messages.length > 0 && (
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 8 }}>
                Messages
              </h3>
              <div
                style={{
                  maxHeight: 200,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                {messages.slice(-10).map((msg, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: COLORS.bgCard,
                      fontSize: 13,
                    }}
                  >
                    <span style={{ color: COLORS.teal, fontWeight: 600 }}>
                      {msg.senderName}:{' '}
                    </span>
                    <span style={{ color: COLORS.text }}>{msg.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
