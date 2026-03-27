/**
 * =============================================================================
 * AuraCall — Call Context (Firestore-Based)
 * =============================================================================
 * Replaces Socket.io with Firestore for call signaling.
 * Same React context API as before — VideoCall.js and IncomingCallOverlay.js
 * continue to use useSocket() without changes.
 *
 * How calls work now:
 * 1. Caller creates doc in Firestore `calls/{callId}`
 * 2. Callee listens for incoming calls via onSnapshot query
 * 3. Accept/reject updates the call doc status
 * 4. WebRTC signaling (offer/answer/ICE) happens via call doc fields + subcollections
 * 5. No external server needed!
 *
 * Firestore structure:
 *   calls/{callId} → { callerUid, calleeUid, callerName, calleeName, callType, status, offer, answer, createdAt }
 *   calls/{callId}/callerCandidates/{id} → { candidate }
 *   calls/{callId}/calleeCandidates/{id} → { candidate }
 * =============================================================================
 */

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { db } from './firebase';
import {
  collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot,
  query, where, orderBy, limit, serverTimestamp, addDoc, getDoc, getDocs
} from 'firebase/firestore';

const SocketContext = createContext(null);

export function SocketProvider({ user, children }) {
  // user = { uid, displayName, photoURL }
  const [isConnected, setIsConnected] = useState(true); // Always "connected" with Firestore
  const [onlineUsers, setOnlineUsers] = useState([]); // Now handled by presence.js — kept for API compat
  const [callState, setCallState] = useState('idle');
  const [incomingCallInfo, setIncomingCallInfo] = useState(null);
  const [callPeer, setCallPeer] = useState(null);
  const [callEndInfo, setCallEndInfo] = useState(null);
  const [callRoom, setCallRoom] = useState(null); // = callId for Firestore signaling
  const [activeCallId, setActiveCallId] = useState(null);

  const callStateRef = useRef('idle');
  const callPeerRef = useRef(null);
  const activeCallIdRef = useRef(null);
  const autoRejectTimerRef = useRef(null);
  const endCallTimerRef = useRef(null);
  const callDocUnsubRef = useRef(null);

  // Keep refs in sync
  useEffect(() => { callStateRef.current = callState; }, [callState]);
  useEffect(() => { callPeerRef.current = callPeer; }, [callPeer]);
  useEffect(() => { activeCallIdRef.current = activeCallId; }, [activeCallId]);

  // ── Clean up stale calls on mount ──
  // FIX: Use single-field query + client-side filtering to avoid composite index issues.
  useEffect(() => {
    if (!user?.uid) return;

    // Clean up any stale "calling" docs where this user is caller (from previous sessions)
    async function cleanStaleCalls() {
      try {
        const q = query(
          collection(db, 'calls'),
          where('callerUid', '==', user.uid)
        );
        const snap = await getDocs(q);
        snap.forEach(async (docSnap) => {
          const data = docSnap.data();
          // Client-side filter: only clean up active calls
          if (data.status !== 'calling' && data.status !== 'connected') return;
          const createdAt = data.createdAt?.toMillis?.() || 0;
          // If older than 2 minutes, it's stale
          if (Date.now() - createdAt > 2 * 60 * 1000) {
            await updateDoc(docSnap.ref, { status: 'ended' }).catch(() => {});
          }
        });
      } catch (e) {
        console.error('[CallContext] cleanStaleCalls error:', e);
      }
    }
    cleanStaleCalls();
  }, [user?.uid]);

  // ── Listen for incoming calls (where I am the callee) ──
  // FIX: Use single-field query + client-side filtering to avoid composite index issues.
  // The original compound query (calleeUid + status) silently fails without a composite index.
  // Same pattern used in chat.js markAsRead and friends.js throughout.
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'calls'),
      where('calleeUid', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified') {
          const data = change.doc.data();

          // Client-side filter: only process calls with 'calling' status
          if (data.status !== 'calling') {
            // If a call we were ringing for got cancelled/ended, dismiss it
            if (change.type === 'modified' && activeCallIdRef.current === change.doc.id) {
              if (data.status === 'ended' && callStateRef.current === 'incoming') {
                console.log('[CallContext] Incoming call cancelled by caller');
                setCallState('idle');
                setIncomingCallInfo(null);
                setActiveCallId(null);
              }
            }
            return;
          }

          // Skip if call is too old (> 60 seconds — missed call)
          const createdAt = data.createdAt?.toMillis?.() || 0;
          if (createdAt && Date.now() - createdAt > 60000) {
            return;
          }

          // Ignore if already in a call
          if (callStateRef.current === 'connected' || callStateRef.current === 'calling') {
            console.log('[CallContext] Already in call, auto-rejecting incoming');
            updateDoc(change.doc.ref, { status: 'busy' }).catch(() => {});
            return;
          }

          // Don't re-trigger if we're already showing this call
          if (callStateRef.current === 'incoming' && activeCallIdRef.current === change.doc.id) {
            return;
          }

          console.log('[CallContext] Incoming call from', data.callerName);
          setActiveCallId(change.doc.id);
          setIncomingCallInfo({
            callId: change.doc.id,
            callerSocketId: null, // Not needed for Firestore signaling
            callerName: data.callerName || 'Unknown',
            callerUid: data.callerUid,
            callType: data.callType || 'video',
          });
          setCallState('incoming');
        }
      });
    }, (error) => {
      console.error('[CallContext] Incoming call listener error:', error);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // ── Listen for status changes on the active call doc ──
  useEffect(() => {
    if (!activeCallId) {
      if (callDocUnsubRef.current) {
        callDocUnsubRef.current();
        callDocUnsubRef.current = null;
      }
      return;
    }

    const callRef = doc(db, 'calls', activeCallId);
    const unsub = onSnapshot(callRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();

      // Call was rejected by the other side
      if (data.status === 'rejected' && callStateRef.current === 'calling') {
        console.log('[CallContext] Call rejected');
        setCallState('idle');
        setCallPeer(null);
        setIncomingCallInfo(null);
        setActiveCallId(null);
        setCallRoom(null);
      }

      // Other user is busy
      if (data.status === 'busy' && callStateRef.current === 'calling') {
        console.log('[CallContext] User is busy');
        setCallEndInfo({
          peerName: callPeerRef.current?.name || 'User',
          duration: 0,
          reason: 'User is busy on another call',
        });
        setCallState('ended');
        setCallPeer(null);
        setCallRoom(null);

        if (endCallTimerRef.current) clearTimeout(endCallTimerRef.current);
        endCallTimerRef.current = setTimeout(() => {
          setCallState('idle');
          setCallEndInfo(null);
          setActiveCallId(null);
        }, 3000);
      }

      // Call ended by the other side
      if (data.status === 'ended' && (callStateRef.current === 'connected' || callStateRef.current === 'calling')) {
        console.log('[CallContext] Call ended by remote');
        setCallEndInfo({
          peerName: callPeerRef.current?.name || 'Unknown',
          duration: data.duration || 0,
          reason: 'Call ended',
        });
        setCallState('ended');
        setCallPeer(null);
        setCallRoom(null);
        setIncomingCallInfo(null);

        if (endCallTimerRef.current) clearTimeout(endCallTimerRef.current);
        endCallTimerRef.current = setTimeout(() => {
          setCallState('idle');
          setCallEndInfo(null);
          setActiveCallId(null);
        }, 3000);
      }

      // Call was accepted (I am the caller, other side accepted)
      if (data.status === 'connected' && callStateRef.current === 'calling') {
        console.log('[CallContext] Call accepted by', data.calleeName || callPeerRef.current?.name);
        setCallPeer((prev) => ({
          ...(prev || {}),
          uid: data.calleeUid || prev?.uid,
          name: data.calleeName || prev?.name || 'Unknown',
        }));
        setCallState('connected');
      }
    }, (error) => {
      console.error('[CallContext] Call doc listener error:', error);
    });

    callDocUnsubRef.current = unsub;
    return () => {
      unsub();
      callDocUnsubRef.current = null;
    };
  }, [activeCallId]);

  // ── Call a user by UID ──
  const callUser = useCallback(async (targetSocketId, targetName, targetUid, callType = 'video') => {
    if (!user?.uid) return;

    console.log('[CallContext] Calling user:', targetName, targetUid);

    setCallPeer({
      socketId: null,
      uid: targetUid,
      name: targetName || 'Unknown',
    });
    setCallState('calling');

    // Create call document in Firestore
    const callRef = doc(collection(db, 'calls'));
    const callId = callRef.id;

    try {
      await setDoc(callRef, {
        callerUid: user.uid,
        callerName: user.displayName || 'User',
        calleeUid: targetUid,
        calleeName: targetName || 'Unknown',
        callType: callType,
        status: 'calling',
        createdAt: serverTimestamp(),
      });

      setActiveCallId(callId);
      setCallRoom(callId);

      // Auto-timeout after 45 seconds if not answered
      if (autoRejectTimerRef.current) clearTimeout(autoRejectTimerRef.current);
      autoRejectTimerRef.current = setTimeout(async () => {
        if (callStateRef.current === 'calling' && activeCallIdRef.current === callId) {
          console.log('[CallContext] Call timeout — no answer');
          try {
            await updateDoc(callRef, { status: 'ended' });
          } catch (e) {}
          setCallEndInfo({
            peerName: targetName || 'User',
            duration: 0,
            reason: 'No answer',
          });
          setCallState('ended');
          setCallPeer(null);
          setCallRoom(null);

          if (endCallTimerRef.current) clearTimeout(endCallTimerRef.current);
          endCallTimerRef.current = setTimeout(() => {
            setCallState('idle');
            setCallEndInfo(null);
            setActiveCallId(null);
          }, 3000);
        }
      }, 45000);

    } catch (error) {
      console.error('[CallContext] Failed to create call:', error);
      setCallState('idle');
      setCallPeer(null);
    }
  }, [user?.uid, user?.displayName]);

  // ── Accept incoming call ──
  const acceptCall = useCallback(async () => {
    if (!activeCallId || !incomingCallInfo) return;

    const { callerUid, callerName } = incomingCallInfo;

    console.log('[CallContext] Accepting call from', callerName);

    setCallPeer({
      socketId: null,
      uid: callerUid,
      name: callerName || 'Unknown',
    });
    setCallState('connected');
    setCallRoom(activeCallId);
    setIncomingCallInfo(null);

    if (autoRejectTimerRef.current) {
      clearTimeout(autoRejectTimerRef.current);
      autoRejectTimerRef.current = null;
    }

    // Update call status in Firestore
    try {
      await updateDoc(doc(db, 'calls', activeCallId), {
        status: 'connected',
        calleeName: user?.displayName || 'User',
        answeredAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('[CallContext] Failed to accept call:', error);
    }
  }, [activeCallId, incomingCallInfo, user?.displayName]);

  // ── Reject incoming call ──
  const rejectCall = useCallback(async () => {
    if (!activeCallId) return;

    console.log('[CallContext] Rejecting call');

    try {
      await updateDoc(doc(db, 'calls', activeCallId), {
        status: 'rejected',
      });
    } catch (e) {
      console.warn('[CallContext] Failed to update rejection:', e);
    }

    setCallState('idle');
    setIncomingCallInfo(null);
    setActiveCallId(null);
    setCallRoom(null);

    if (autoRejectTimerRef.current) {
      clearTimeout(autoRejectTimerRef.current);
      autoRejectTimerRef.current = null;
    }
  }, [activeCallId]);

  // ── End current call ──
  const endCall = useCallback(async (duration) => {
    console.log('[CallContext] Ending call, duration:', duration);

    if (autoRejectTimerRef.current) {
      clearTimeout(autoRejectTimerRef.current);
      autoRejectTimerRef.current = null;
    }

    if (activeCallIdRef.current) {
      try {
        await updateDoc(doc(db, 'calls', activeCallIdRef.current), {
          status: 'ended',
          endedAt: serverTimestamp(),
          duration: duration || 0,
        });
      } catch (e) {
        console.warn('[CallContext] Failed to update call end status:', e);
      }
    }

    setCallEndInfo({
      peerName: callPeerRef.current?.name || 'Unknown',
      duration: duration || 0,
      reason: 'You ended the call',
    });
    setCallState('ended');
    setCallPeer(null);
    setCallRoom(null);
    setIncomingCallInfo(null);

    if (endCallTimerRef.current) clearTimeout(endCallTimerRef.current);
    endCallTimerRef.current = setTimeout(() => {
      setCallState('idle');
      setCallEndInfo(null);
      setActiveCallId(null);
    }, 3000);
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket: null, // No socket needed — kept for API compatibility
        isConnected: true, // Always connected with Firestore
        onlineUsers, // Now handled by presence.js watchPresence — kept for API compat
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
        callRoom, // This is now the Firestore callId
        activeCallId, // NEW: the Firestore call doc ID
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
