import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../lib/socket';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

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

const QUALITY_PRESETS = {
  low: 300000,
  medium: 800000,
  high: 1500000,
  hd: 2500000,
};

const QUALITY_ORDER = ['low', 'medium', 'high', 'hd'];

const KEYFRAMES_CSS = `
  @keyframes vcDotBounce {
    0%, 80%, 100% { transform: scale(0.5); opacity: 0.3; }
    40% { transform: scale(1); opacity: 1; }
  }
  @keyframes vcFadeIn {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }
  @keyframes vcPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

export default function VideoCall({ userName, peerInfo }) {
  // peerInfo = { socketId, uid, name }
  const { socket, callState, endCall: contextEndCall, setCallState, setCallPeer } = useSocket();

  // ── State ──
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [callTimer, setCallTimer] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [remoteMediaState, setRemoteMediaState] = useState({ audio: true, video: true });
  const [connectionQuality, setConnectionQuality] = useState('good'); // 'excellent' | 'good' | 'poor' | 'reconnecting'
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [iceServersConfig, setIceServersConfig] = useState(null);
  const [currentBitrateLabel, setCurrentBitrateLabel] = useState('high');
  const [networkStats, setNetworkStats] = useState({ packetLoss: 0, jitter: 0, rtt: 0, bitrate: 0 });
  const [isCallConnected, setIsCallConnected] = useState(false);

  // ── Refs ──
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const currentTargetRef = useRef(peerInfo?.socketId || null);
  const timerRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const statsIntervalRef = useRef(null);
  const prevStatsRef = useRef(null);
  const iceRestartAttemptRef = useRef(0);
  const disconnectTimerRef = useRef(null);
  const failedTimerRef = useRef(null);
  const isMountedRef = useRef(true);
  const isCallerRef = useRef(callState === 'calling');
  const styleRef = useRef(null);
  const iceServersRef = useRef(null);

  // Keep target ref in sync
  useEffect(() => {
    if (peerInfo?.socketId) {
      currentTargetRef.current = peerInfo.socketId;
    }
  }, [peerInfo?.socketId]);

  // ── Inject keyframes ──
  useEffect(() => {
    if (!styleRef.current) {
      const style = document.createElement('style');
      style.textContent = KEYFRAMES_CSS;
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

  // ── Format timer ──
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ── Fetch TURN/ICE servers ──
  useEffect(() => {
    let cancelled = false;
    async function fetchICE() {
      try {
        const res = await fetch(`${SOCKET_URL}/api/turn-credentials`);
        const data = await res.json();
        if (!cancelled && data.iceServers) {
          setIceServersConfig({ iceServers: data.iceServers });
          iceServersRef.current = { iceServers: data.iceServers };
        }
      } catch (err) {
        console.warn('[VideoCall] Failed to fetch TURN config, using STUN fallback:', err);
        const fallback = {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        };
        if (!cancelled) {
          setIceServersConfig(fallback);
          iceServersRef.current = fallback;
        }
      }
    }
    fetchICE();
    return () => { cancelled = true; };
  }, []);

  // ── Set bitrate on video sender ──
  const setBitrate = useCallback(async (presetName) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    const maxBitrate = QUALITY_PRESETS[presetName];
    if (!maxBitrate) return;

    const senders = pc.getSenders();
    const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
    if (!videoSender) return;

    try {
      const params = videoSender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }
      params.encodings[0].maxBitrate = maxBitrate;
      await videoSender.setParameters(params);
      setCurrentBitrateLabel(presetName);
    } catch (err) {
      console.warn('[VideoCall] setBitrate error:', err);
    }
  }, []);

  // ── End call (local cleanup + context) ──
  const handleEndCall = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
    if (disconnectTimerRef.current) {
      clearTimeout(disconnectTimerRef.current);
      disconnectTimerRef.current = null;
    }
    if (failedTimerRef.current) {
      clearTimeout(failedTimerRef.current);
      failedTimerRef.current = null;
    }

    pendingCandidatesRef.current = [];
    currentTargetRef.current = null;

    contextEndCall();
  }, [contextEndCall]);

  // ── ICE restart ──
  const attemptIceRestart = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc || pc.signalingState === 'closed') return;

    console.log('[VideoCall] Attempting ICE restart...');
    iceRestartAttemptRef.current += 1;

    try {
      pc.restartIce();
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      if (currentTargetRef.current) {
        socket?.emit('offer', { targetSocketId: currentTargetRef.current, offer });
      }
    } catch (err) {
      console.error('[VideoCall] ICE restart failed:', err);
    }
  }, [socket]);

  // ── Create peer connection ──
  const createPeerConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    const config = iceServersRef.current || {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    const pc = new RTCPeerConnection(config);

    pc.onicecandidate = (event) => {
      if (event.candidate && currentTargetRef.current) {
        socket?.emit('ice-candidate', {
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
      const state = pc.iceConnectionState;
      console.log('[VideoCall] ICE state:', state);

      switch (state) {
        case 'connected':
        case 'completed':
          setIsReconnecting(false);
          setIsCallConnected(true);
          setConnectionQuality('good');
          iceRestartAttemptRef.current = 0;
          if (disconnectTimerRef.current) {
            clearTimeout(disconnectTimerRef.current);
            disconnectTimerRef.current = null;
          }
          if (failedTimerRef.current) {
            clearTimeout(failedTimerRef.current);
            failedTimerRef.current = null;
          }
          break;

        case 'disconnected':
          setConnectionQuality('reconnecting');
          setIsReconnecting(true);
          // Wait 3 seconds then try ICE restart
          disconnectTimerRef.current = setTimeout(() => {
            if (peerConnectionRef.current && peerConnectionRef.current.iceConnectionState === 'disconnected') {
              attemptIceRestart();
            }
          }, 3000);
          break;

        case 'failed':
          setConnectionQuality('reconnecting');
          setIsReconnecting(true);
          if (iceRestartAttemptRef.current < 3) {
            attemptIceRestart();
            // If still failed after 5 more seconds, end call
            failedTimerRef.current = setTimeout(() => {
              if (peerConnectionRef.current && peerConnectionRef.current.iceConnectionState === 'failed') {
                console.log('[VideoCall] ICE failed after restart, ending call');
                handleEndCall();
              }
            }, 5000);
          } else {
            console.log('[VideoCall] Max ICE restart attempts reached, ending call');
            handleEndCall();
          }
          break;

        case 'closed':
          break;

        default:
          break;
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
  }, [socket, attemptIceRestart, handleEndCall]);

  // ── Network quality monitor ──
  useEffect(() => {
    if (!isCallConnected) return;

    statsIntervalRef.current = setInterval(async () => {
      const pc = peerConnectionRef.current;
      if (!pc || pc.connectionState === 'closed') return;

      try {
        const stats = await pc.getStats();
        let packetsLost = 0;
        let packetsReceived = 0;
        let jitter = 0;
        let roundTripTime = 0;
        let bytesSent = 0;
        let bytesReceived = 0;
        let timestamp = 0;

        stats.forEach((report) => {
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            packetsLost = report.packetsLost || 0;
            packetsReceived = report.packetsReceived || 0;
            jitter = report.jitter || 0;
            bytesReceived = report.bytesReceived || 0;
            timestamp = report.timestamp;
          }
          if (report.type === 'outbound-rtp' && report.kind === 'video') {
            bytesSent = report.bytesSent || 0;
            if (!timestamp) timestamp = report.timestamp;
          }
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            roundTripTime = report.currentRoundTripTime || 0;
          }
        });

        const totalPackets = packetsReceived + packetsLost;
        const packetLossPercent = totalPackets > 0 ? (packetsLost / totalPackets) * 100 : 0;
        const jitterMs = jitter * 1000; // convert to ms

        // Calculate bitrate delta
        let bitrate = 0;
        if (prevStatsRef.current && timestamp) {
          const timeDiff = (timestamp - prevStatsRef.current.timestamp) / 1000;
          if (timeDiff > 0) {
            const bytesDiff = (bytesReceived - prevStatsRef.current.bytesReceived) + (bytesSent - prevStatsRef.current.bytesSent);
            bitrate = (bytesDiff * 8) / timeDiff; // bits per second
          }
        }
        prevStatsRef.current = { timestamp, bytesReceived, bytesSent, packetsLost };

        setNetworkStats({ packetLoss: packetLossPercent, jitter: jitterMs, rtt: roundTripTime * 1000, bitrate });

        // Adaptive quality
        if (packetLossPercent > 5 || jitterMs > 50) {
          setConnectionQuality('poor');
          setBitrate('low');
        } else if (packetLossPercent > 2 || jitterMs > 30) {
          setConnectionQuality('good');
          setBitrate('medium');
        } else {
          setConnectionQuality('excellent');
          // Gradually increase quality
          const currentIdx = QUALITY_ORDER.indexOf(currentBitrateLabel);
          if (currentIdx < QUALITY_ORDER.length - 1) {
            setBitrate(QUALITY_ORDER[currentIdx + 1]);
          }
        }
      } catch (err) {
        // Stats collection error, ignore
      }
    }, 3000);

    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
    };
  }, [isCallConnected, setBitrate, currentBitrateLabel]);

  // ── Get user media ──
  useEffect(() => {
    let cancelled = false;

    async function getMedia() {
      // Try HD first
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
          audio: true,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        setLocalStream(stream);
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        return;
      } catch (err) {
        console.warn('[VideoCall] HD media failed, trying fallback:', err);
      }

      // Fallback to 480p
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } },
          audio: true,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        setLocalStream(stream);
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        return;
      } catch (err) {
        console.warn('[VideoCall] 480p media failed, trying audio-only:', err);
      }

      // Audio only fallback
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        setLocalStream(stream);
        localStreamRef.current = stream;
        setIsCameraOff(true);
        return;
      } catch (err) {
        console.error('[VideoCall] No media available:', err);
      }
    }

    getMedia();

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Socket event listeners for WebRTC signaling ──
  useEffect(() => {
    if (!socket) return;

    const handleOffer = async ({ senderSocketId, offer }) => {
      console.log('[VideoCall] Received offer from', senderSocketId);
      currentTargetRef.current = senderSocketId;

      // Update callPeer socketId if needed
      setCallPeer((prev) => prev ? { ...prev, socketId: senderSocketId } : prev);

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
        console.error('[VideoCall] Error handling offer:', err);
      }
    };

    const handleAnswer = async ({ senderSocketId, answer }) => {
      console.log('[VideoCall] Received answer from', senderSocketId);
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
        console.error('[VideoCall] Error handling answer:', err);
      }
    };

    const handleIceCandidate = async ({ candidate }) => {
      try {
        if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          pendingCandidatesRef.current.push(candidate);
        }
      } catch (err) {
        console.error('[VideoCall] ICE candidate error:', err);
      }
    };

    const handleCallEnded = ({ senderName }) => {
      console.log('[VideoCall] Call ended by', senderName);
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
      pendingCandidatesRef.current = [];
      // Reset context state
      setCallPeer(null);
      setCallState('idle');
    };

    const handleReceiveMessage = (msg) => {
      setMessages((prev) => [...prev, { ...msg, isMine: false }]);
    };

    const handleMediaToggled = ({ mediaType, enabled }) => {
      setRemoteMediaState((prev) => ({ ...prev, [mediaType]: enabled }));
    };

    const handleUserLeft = ({ socketId }) => {
      if (currentTargetRef.current === socketId) {
        handleEndCall();
      }
    };

    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('call-ended', handleCallEnded);
    socket.on('receive-message', handleReceiveMessage);
    socket.on('media-toggled', handleMediaToggled);
    socket.on('user-left', handleUserLeft);

    return () => {
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('call-ended', handleCallEnded);
      socket.off('receive-message', handleReceiveMessage);
      socket.off('media-toggled', handleMediaToggled);
      socket.off('user-left', handleUserLeft);
    };
  }, [socket, createPeerConnection, handleEndCall, setCallPeer, setCallState]);

  // ── Initiate WebRTC if we are the caller — wait for ICE config + local stream ──
  useEffect(() => {
    if (!socket || !isCallerRef.current) return;
    if (!iceServersConfig) return;
    if (!localStreamRef.current) return;

    // The call was accepted (callState changed to 'connected' in context)
    // Create offer and send
    async function startCall() {
      console.log('[VideoCall] Caller: creating offer');
      try {
        const pc = createPeerConnection();
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', { targetSocketId: currentTargetRef.current, offer });
      } catch (err) {
        console.error('[VideoCall] Error creating offer:', err);
        handleEndCall();
      }
    }

    // Small delay to ensure everything is set up
    const timer = setTimeout(startCall, 300);
    return () => clearTimeout(timer);
  }, [socket, iceServersConfig, createPeerConnection, handleEndCall, localStream]);

  // ── Call timer ──
  useEffect(() => {
    if (isCallConnected) {
      timerRef.current = setInterval(() => {
        setCallTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isCallConnected]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
      if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current);
      if (failedTimerRef.current) clearTimeout(failedTimerRef.current);
    };
  }, []);

  // ── Actions ──
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        socket?.emit('toggle-media', {
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
        socket?.emit('toggle-media', {
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
      senderSocketId: socket?.id,
      senderName: userName,
      message: text,
      timestamp: Date.now(),
      isMine: true,
    };
    setMessages((prev) => [...prev, msg]);
    socket?.emit('send-message', {
      targetSocketId: currentTargetRef.current,
      message: text,
      senderName: userName,
    });
    setMessageInput('');
  };

  // ── UI Components ──
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

  // ── Quality bars indicator ──
  const QualityBars = () => {
    let activeBars = 3;
    let barColor = COLORS.teal;

    if (connectionQuality === 'excellent') {
      activeBars = 4;
      barColor = COLORS.accept;
    } else if (connectionQuality === 'good') {
      activeBars = 3;
      barColor = COLORS.teal;
    } else if (connectionQuality === 'poor') {
      activeBars = 1;
      barColor = COLORS.reject;
    } else if (connectionQuality === 'reconnecting') {
      activeBars = 0;
      barColor = COLORS.reject;
    }

    return (
      <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end' }} title={`Quality: ${connectionQuality}`}>
        {[8, 12, 16, 20].map((h, i) => (
          <div
            key={i}
            style={{
              width: 3,
              height: h,
              borderRadius: 2,
              background: i < activeBars ? barColor : COLORS.textSecondary + '44',
              transition: 'background 0.3s',
            }}
          />
        ))}
      </div>
    );
  };

  const peerName = peerInfo?.name || 'Unknown';

  // ═════════════════════════════════════════════
  //  RENDER
  // ═════════════════════════════════════════════

  // ── Connecting / Calling screen ──
  if (callState === 'calling' || (!isCallConnected && callState === 'connected' && !remoteStream)) {
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
        <Avatar name={peerName} size={90} fontSize={36} />

        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 22, fontWeight: 600, color: COLORS.text, margin: 0 }}>
            {callState === 'calling' ? `Calling ${peerName}` : `Connecting to ${peerName}`}
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
                  animation: `vcDotBounce 1.4s ease-in-out ${i * 0.16}s infinite both`,
                }}
              />
            ))}
          </div>
        </div>

        <button
          onClick={handleEndCall}
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

  // ── Active call screen ──
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

      {/* Remote camera off / no stream placeholder */}
      {(!remoteStream || !remoteMediaState.video) && (
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
          <Avatar name={peerName} size={100} fontSize={40} />
          <p style={{ color: COLORS.textSecondary, fontSize: 15 }}>
            {!remoteStream ? 'Connecting video...' : 'Camera Off'}
          </p>
        </div>
      )}

      {/* Reconnecting overlay */}
      {isReconnecting && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.7)',
            zIndex: 30,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              border: `3px solid ${COLORS.border}`,
              borderTopColor: COLORS.teal,
              borderRadius: '50%',
              animation: 'vcPulse 1s linear infinite',
              marginBottom: 16,
            }}
          />
          <p style={{ color: COLORS.text, fontSize: 18, fontWeight: 600 }}>Reconnecting...</p>
          <p style={{ color: COLORS.textSecondary, fontSize: 13, marginTop: 4 }}>
            Please wait while we restore your connection
          </p>
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
          <Avatar name={peerName} size={36} fontSize={14} />
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: COLORS.text, margin: 0 }}>
              {peerName}
            </p>
            <p style={{ fontSize: 12, color: COLORS.teal, margin: 0 }}>{formatTime(callTimer)}</p>
          </div>
        </div>

        <QualityBars />
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

        <IconButton onClick={handleEndCall} bg={COLORS.reject} size={60} title="End Call">
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
            animation: 'vcFadeIn 0.3s ease-out',
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
            <h3 style={{ fontSize: 16, fontWeight: 600, color: COLORS.text, margin: 0 }}>Chat</h3>
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
            {messages.length === 0 && (
              <p style={{ color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 40 }}>
                No messages yet. Say hello! 👋
              </p>
            )}
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
                  <p style={{ fontSize: 11, color: COLORS.teal, marginBottom: 4, fontWeight: 600, margin: 0, marginBottom: 4 }}>
                    {msg.senderName}
                  </p>
                )}
                <p style={{ margin: 0 }}>{msg.message}</p>
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
