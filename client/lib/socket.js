import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

const SocketContext = createContext(null);

export function SocketProvider({ user, children }) {
  // user = { uid, displayName, photoURL }
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [callState, setCallState] = useState('idle'); // 'idle' | 'calling' | 'incoming' | 'connected'
  const [incomingCallInfo, setIncomingCallInfo] = useState(null);
  const [callPeer, setCallPeer] = useState(null); // { socketId, uid, name }

  const socketRef = useRef(null);
  const callStateRef = useRef('idle');
  const callPeerRef = useRef(null);
  const autoRejectTimerRef = useRef(null);

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

    const s = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
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

    // ── Call rejected ──
    s.on('call-rejected', ({ rejecterName }) => {
      console.log('[Socket] Call rejected by', rejecterName);
      setCallState('idle');
      setCallPeer(null);
      setIncomingCallInfo(null);
    });

    // ── Call ended ──
    s.on('call-ended', ({ senderName }) => {
      console.log('[Socket] Call ended by', senderName);
      setCallState('idle');
      setCallPeer(null);
      setIncomingCallInfo(null);
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

    return () => {
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
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

  // ── End current call ──
  const endCall = useCallback(() => {
    if (!socketRef.current) return;

    const peer = callPeerRef.current;
    if (peer?.socketId) {
      socketRef.current.emit('end-call', { targetSocketId: peer.socketId });
    }

    setCallState('idle');
    setCallPeer(null);
    setIncomingCallInfo(null);
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
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
