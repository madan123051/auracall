import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { auth } from './firebase'; // import the auth instance for token refresh

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

const SocketContext = createContext(null);

export function SocketProvider({ user, children }) {
  // user = { uid, displayName, photoURL }
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [callState, setCallState] = useState('idle'); // 'idle' | 'calling' | 'incoming' | 'connected' | 'ended'
  const [incomingCallInfo, setIncomingCallInfo] = useState(null);
  const [callPeer, setCallPeer] = useState(null); // { socketId, uid, name }
  const [callEndInfo, setCallEndInfo] = useState(null); // { peerName, duration, reason }
  const [callRoom, setCallRoom] = useState(null); // dynamic call room ID

  const socketRef = useRef(null);
  const callStateRef = useRef('idle');
  const callPeerRef = useRef(null);
  const autoRejectTimerRef = useRef(null);
  const endCallTimerRef = useRef(null);

  // Keep refs in sync
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    callPeerRef.current = callPeer;
  }, [callPeer]);

  // ── Connect socket when user exists ──
  useEffect(() => {
    if (!user || !user.uid) return;

    let cancelled = false;

    async function connectSocket() {
      // Get Firebase auth token if available
      let token = null;
      try {
        token = await auth.currentUser?.getIdToken();
      } catch (err) {
        console.warn('[Socket] Could not get auth token:', err.message);
      }

      if (cancelled) return;

      const s = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        auth: { token },
      });

      socketRef.current = s;
      setSocket(s);

      s.on('connect', () => {
        console.log('[Socket] Connected:', s.id);
        setIsConnected(true);
        // Join room with uid
        s.emit('join-room', {
          userName: user.displayName || 'User',
          room: 'lobby',
          uid: user.uid,
        });
      });

      s.on('disconnect', () => {
        console.log('[Socket] Disconnected');
        setIsConnected(false);
      });

      s.on('reconnect', () => {
        console.log('[Socket] Reconnected:', s.id);
        setIsConnected(true);
        // Re-join room on reconnect
        s.emit('join-room', {
          userName: user.displayName || 'User',
          room: 'lobby',
          uid: user.uid,
        });
      });

      // ── Auth error handling ──
      s.on('connect_error', (err) => {
        if (err.message === 'Authentication required' || err.message === 'Invalid token') {
          console.error('[Socket] Auth error, refreshing token...');
          // Try to refresh and reconnect
          auth.currentUser?.getIdToken(true).then((newToken) => {
            s.auth = { token: newToken };
            s.connect();
          }).catch((refreshErr) => {
            console.error('[Socket] Token refresh failed:', refreshErr.message);
          });
        } else {
          console.error('[Socket] Connection error:', err.message);
        }
      });

      // ── Online users ──
      s.on('online-users', (users) => {
        setOnlineUsers(users.filter((u) => u.socketId !== s.id));
      });

      // ── Incoming call ──
      s.on('incoming-call', ({ callerSocketId, callerName, callerUid, callType }) => {
        console.log('[Socket] Incoming call from', callerName, callerUid);
        // Ignore if already in a call
        if (callStateRef.current === 'connected' || callStateRef.current === 'calling') {
          console.log('[Socket] Already in call, auto-rejecting');
          s.emit('reject-call', { callerSocketId });
          return;
        }

        setIncomingCallInfo({ callerSocketId, callerName, callerUid, callType });
        setCallState('incoming');
      });

      // ── Call accepted ──
      s.on('call-accepted', ({ accepterSocketId, accepterName, accepterUid }) => {
        console.log('[Socket] Call accepted by', accepterName);
        setCallPeer((prev) => ({
          ...(prev || {}),
          socketId: accepterSocketId,
          uid: accepterUid || prev?.uid || null,
          name: accepterName || prev?.name || 'Unknown',
        }));
        setCallState('connected');
      });

      // ── Joined call room ──
      s.on('joined-call-room', ({ roomId }) => {
        console.log('[Socket] Joined call room:', roomId);
        setCallRoom(roomId);
      });

      // ── Call rejected ──
      s.on('call-rejected', ({ rejecterName }) => {
        console.log('[Socket] Call rejected by', rejecterName);
        setCallState('idle');
        setCallPeer(null);
        setIncomingCallInfo(null);
      });

      // ── Call ended (remote) ──
      s.on('call-ended', ({ senderName, duration }) => {
        console.log('[Socket] Call ended by', senderName, 'duration:', duration);
        setCallEndInfo({
          peerName: senderName || 'Unknown',
          duration: duration || 0,
          reason: 'Remote ended the call',
        });
        setCallState('ended');
        setCallPeer(null);
        setCallRoom(null);
        setIncomingCallInfo(null);

        // Auto-dismiss after 3 seconds
        if (endCallTimerRef.current) clearTimeout(endCallTimerRef.current);
        endCallTimerRef.current = setTimeout(() => {
          setCallState('idle');
          setCallEndInfo(null);
          endCallTimerRef.current = null;
        }, 3000);
      });

      // ── Call failed (user offline) ──
      s.on('call-failed', ({ reason, message }) => {
        console.log('[Socket] Call failed:', reason, message);
        setCallState('idle');
        setCallPeer(null);
      });

      // ── Call busy ──
      s.on('call-busy', ({ targetUid, message }) => {
        console.log('[Socket] Call busy:', targetUid, message);
        setCallState('idle');
        setCallPeer(null);
      });

      // ── Server-side error ──
      s.on('error', ({ message }) => {
        console.error('[Socket] Server error:', message);
      });
    }

    connectSocket();

    return () => {
      cancelled = true;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocket(null);
      setIsConnected(false);
      if (endCallTimerRef.current) {
        clearTimeout(endCallTimerRef.current);
        endCallTimerRef.current = null;
      }
    };
  }, [user?.uid, user?.displayName]);

  // ── Call a user (by socketId, uid, or both) ──
  const callUser = useCallback((targetSocketId, targetName, targetUid, callType = 'video') => {
    if (!socketRef.current) return;

    setCallPeer({
      socketId: targetSocketId || null,
      uid: targetUid || null,
      name: targetName || 'Unknown',
    });
    setCallState('calling');

    if (targetUid && !targetSocketId) {
      // Call by UID (Firebase friends integration)
      socketRef.current.emit('call-user-by-uid', {
        targetUid,
        callerName: user?.displayName || 'User',
        callerUid: user?.uid,
        callType,
      });
    } else if (targetSocketId) {
      // Call by socket ID (legacy/lobby)
      socketRef.current.emit('call-user', {
        targetSocketId,
        callerName: user?.displayName || 'User',
        callerSocketId: socketRef.current.id,
        callType,
      });
    }
  }, [user?.displayName, user?.uid]);

  // ── Accept incoming call ──
  const acceptCall = useCallback(() => {
    if (!socketRef.current || !incomingCallInfo) return;

    const { callerSocketId, callerName, callerUid } = incomingCallInfo;

    setCallPeer({
      socketId: callerSocketId,
      uid: callerUid || null,
      name: callerName || 'Unknown',
    });
    setCallState('connected');
    setIncomingCallInfo(null);

    if (autoRejectTimerRef.current) {
      clearTimeout(autoRejectTimerRef.current);
      autoRejectTimerRef.current = null;
    }

    socketRef.current.emit('accept-call', { callerSocketId });
  }, [incomingCallInfo]);

  // ── Reject incoming call ──
  const rejectCall = useCallback(() => {
    if (!socketRef.current || !incomingCallInfo) return;

    socketRef.current.emit('reject-call', { callerSocketId: incomingCallInfo.callerSocketId });
    setCallState('idle');
    setIncomingCallInfo(null);

    if (autoRejectTimerRef.current) {
      clearTimeout(autoRejectTimerRef.current);
      autoRejectTimerRef.current = null;
    }
  }, [incomingCallInfo]);

  // ── End current call (accepts optional duration) ──
  const endCall = useCallback((duration) => {
    if (!socketRef.current) return;

    const peer = callPeerRef.current;
    if (peer?.socketId) {
      socketRef.current.emit('end-call', {
        targetSocketId: peer.socketId,
        duration: duration || 0,
      });
    }

    setCallEndInfo({
      peerName: peer?.name || 'Unknown',
      duration: duration || 0,
      reason: 'You ended the call',
    });
    setCallState('ended');
    setCallPeer(null);
    setCallRoom(null);
    setIncomingCallInfo(null);

    // Auto-dismiss after 3 seconds
    if (endCallTimerRef.current) clearTimeout(endCallTimerRef.current);
    endCallTimerRef.current = setTimeout(() => {
      setCallState('idle');
      setCallEndInfo(null);
      endCallTimerRef.current = null;
    }, 3000);
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        onlineUsers,
        callState,
        incomingCallInfo,
        callPeer,
        callUser,
        acceptCall,
        rejectCall,
        endCall,
        setCallState,
        setCallPeer,
        callEndInfo,
        callRoom,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
