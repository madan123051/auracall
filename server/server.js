const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();

const CORS_ORIGIN = process.env.CORS_ORIGIN || process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';

app.use(cors({
  origin: CORS_ORIGIN === '*' ? '*' : CORS_ORIGIN.split(',').map(s => s.trim()),
  methods: ['GET', 'POST'],
}));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN === '*' ? '*' : CORS_ORIGIN.split(',').map(s => s.trim()),
    methods: ['GET', 'POST'],
  },
});

// ── Firebase Admin SDK (optional) ──
let firebaseAdmin = null;
try {
  const admin = require('firebase-admin');
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
    });
    firebaseAdmin = admin;
    console.log('🔐  Firebase Admin initialized with service account');
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp();
    firebaseAdmin = admin;
    console.log('🔐  Firebase Admin initialized with application default credentials');
  } else {
    console.warn('⚠️   Firebase Admin not configured — running without authentication');
  }
} catch (err) {
  console.warn('⚠️   Firebase Admin not available — running without authentication:', err.message);
}

// ── Track online users: socketId → { userName, room, status, uid } ──
const onlineUsers = new Map();

// ── Active call rooms: roomId → { participants: [uid1, uid2], createdAt, startTime } ──
const activeCallRooms = new Map();

// ── Rate limiting: socketId → { count, resetTime } ──
const rateLimitMap = new Map();

const RATE_LIMIT_MAX = 10; // max events per second
const RATE_LIMIT_WINDOW = 1000; // 1 second

// ── UID → socketId lookup ──
function getSocketIdByUid(uid) {
  for (const [socketId, info] of onlineUsers.entries()) {
    if (info.uid === uid) return socketId;
  }
  return null;
}

// ── Generate a deterministic call room ID from two UIDs ──
function generateCallRoomId(uid1, uid2) {
  const sorted = [uid1, uid2].sort();
  return sorted[0] + '_' + sorted[1] + '_call';
}

// ── Rate limiter check ──
function checkRateLimit(socketId) {
  const now = Date.now();
  let entry = rateLimitMap.get(socketId);

  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
    rateLimitMap.set(socketId, entry);
  }

  entry.count += 1;

  if (entry.count > RATE_LIMIT_MAX) {
    return false; // rate limited
  }
  return true;
}

// ── Helper: validate targetSocketId exists ──
function isValidTarget(targetSocketId) {
  return targetSocketId && onlineUsers.has(targetSocketId);
}

// ── Helper: broadcast updated user list to everyone ──
function broadcastOnlineUsers() {
  const users = [];
  onlineUsers.forEach((info, socketId) => {
    users.push({
      socketId,
      userName: info.userName,
      room: info.room,
      status: info.status,
      uid: info.uid || null,
    });
  });
  io.emit('online-users', users);
}

// ── Helper: clean up a call room ──
function cleanupCallRoom(roomId) {
  const room = activeCallRooms.get(roomId);
  if (!room) return 0;

  const duration = room.startTime ? Math.floor((Date.now() - room.startTime) / 1000) : 0;
  activeCallRooms.delete(roomId);
  return duration;
}

// ── Helper: leave all call rooms for a socket ──
function leaveCallRoomsForSocket(socket) {
  const user = onlineUsers.get(socket.id);
  if (!user || !user.uid) return;

  for (const [roomId, room] of activeCallRooms.entries()) {
    if (room.participants.includes(user.uid)) {
      const duration = cleanupCallRoom(roomId);
      socket.leave(roomId);

      // Notify the other participant
      const otherUid = room.participants.find(uid => uid !== user.uid);
      if (otherUid) {
        const otherSocketId = getSocketIdByUid(otherUid);
        if (otherSocketId) {
          const otherSocket = io.sockets.sockets.get(otherSocketId);
          if (otherSocket) {
            otherSocket.leave(roomId);
          }
          io.to(otherSocketId).emit('call-ended', {
            senderSocketId: socket.id,
            senderName: user.userName || 'Unknown',
            duration: duration,
          });

          // Reset other user's status
          const otherUser = onlineUsers.get(otherSocketId);
          if (otherUser) {
            otherUser.status = 'available';
            onlineUsers.set(otherSocketId, otherUser);
          }
        }
      }

      break; // A user can only be in one call room at a time
    }
  }
}

// ── Health check endpoint ──
app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'AuraCall Signaling Server',
    users: onlineUsers.size,
    activeRooms: activeCallRooms.size,
    authEnabled: !!firebaseAdmin,
  });
});

// ── TURN credentials endpoint ──
app.get('/api/turn-credentials', (req, res) => {
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
  ];
  // Add TURN if configured via TURN_URL env var
  if (process.env.TURN_URL) {
    iceServers.push({
      urls: process.env.TURN_URL,
      username: process.env.TURN_USERNAME || '',
      credential: process.env.TURN_CREDENTIAL || '',
    });
  }
  // Add custom TURN servers from JSON env var
  if (process.env.TURN_SERVERS_JSON) {
    try {
      const customServers = JSON.parse(process.env.TURN_SERVERS_JSON);
      if (Array.isArray(customServers)) {
        iceServers.push(...customServers);
      }
    } catch (err) {
      console.warn('⚠️   Failed to parse TURN_SERVERS_JSON:', err.message);
    }
  }
  // Add Metered TURN relay servers if API key is configured
  if (process.env.METERED_API_KEY) {
    const meteredKey = process.env.METERED_API_KEY;
    iceServers.push(
      { urls: 'turn:global.relay.metered.ca:80', username: meteredKey, credential: meteredKey },
      { urls: 'turn:global.relay.metered.ca:80?transport=tcp', username: meteredKey, credential: meteredKey },
      { urls: 'turn:global.relay.metered.ca:443', username: meteredKey, credential: meteredKey },
      { urls: 'turns:global.relay.metered.ca:443?transport=tcp', username: meteredKey, credential: meteredKey },
    );
  }
  console.log(`🧊  Returning ${iceServers.length} ICE servers`);
  res.json({ iceServers });
});

// ── Socket authentication middleware ──
io.use(async (socket, next) => {
  // If Firebase Admin is not configured, skip auth
  if (!firebaseAdmin) {
    socket.userId = null;
    socket.userName = 'User';
    console.log('⚠️   Auth skipped (Firebase Admin not configured) for socket', socket.id);
    return next();
  }

  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const decoded = await firebaseAdmin.auth().verifyIdToken(token);
    socket.userId = decoded.uid;
    socket.userName = decoded.name || decoded.email || 'User';
    next();
  } catch (err) {
    console.error('🔒  Token verification failed:', err.message);
    next(new Error('Invalid token'));
  }
});

// ── Socket.IO connection handling ──
io.on('connection', (socket) => {
  console.log(`✅  Connected: ${socket.id} (userId=${socket.userId || 'none'})`);

  // ── Join room (now accepts uid) ──
  socket.on('join-room', ({ userName, room, uid }) => {
    if (!checkRateLimit(socket.id)) return;

    // If Firebase auth is active, validate the UID matches the token
    if (firebaseAdmin && socket.userId && uid && uid !== socket.userId) {
      console.warn(`⚠️   UID mismatch: socket.userId=${socket.userId}, claimed uid=${uid}`);
      socket.emit('error', { message: 'UID mismatch with authentication token' });
      return;
    }

    const effectiveUid = uid || socket.userId || null;
    const roomId = room || 'lobby';
    socket.join(roomId);

    onlineUsers.set(socket.id, {
      userName: userName || socket.userName || 'User',
      room: roomId,
      status: 'available',
      uid: effectiveUid,
    });
    console.log(`👤  ${userName} joined room "${roomId}" (${socket.id}) uid=${effectiveUid || 'none'}`);

    // Notify others in the room
    socket.to(roomId).emit('user-joined', {
      socketId: socket.id,
      userName: userName || socket.userName || 'User',
      uid: effectiveUid,
    });

    broadcastOnlineUsers();
  });

  // ── Call a specific user by socketId ──
  socket.on('call-user', ({ targetSocketId, callerName, callerSocketId, callType }) => {
    if (!checkRateLimit(socket.id)) return;

    const caller = onlineUsers.get(socket.id);
    console.log(`📞  ${caller?.userName || socket.id} calling ${targetSocketId} (${callType || 'video'})`);

    if (!isValidTarget(targetSocketId)) {
      socket.emit('call-failed', {
        reason: 'offline',
        targetSocketId,
        message: 'User is not available',
      });
      return;
    }

    io.to(targetSocketId).emit('incoming-call', {
      callerSocketId: socket.id,
      callerName: callerName || caller?.userName || 'Unknown',
      callerUid: caller?.uid || null,
      callType: callType || 'video',
    });

    // Update status
    if (caller) {
      caller.status = 'calling';
      onlineUsers.set(socket.id, caller);
    }
  });

  // ── Call a user by Firebase UID ──
  socket.on('call-user-by-uid', ({ targetUid, callerName, callerUid, callType }) => {
    if (!checkRateLimit(socket.id)) return;

    const caller = onlineUsers.get(socket.id);

    // Validate callerUid matches auth if Firebase is active
    if (firebaseAdmin && socket.userId && callerUid && callerUid !== socket.userId) {
      console.warn(`⚠️   Caller UID mismatch: socket.userId=${socket.userId}, callerUid=${callerUid}`);
      return;
    }

    const targetSocketId = getSocketIdByUid(targetUid);

    console.log(`📞  ${caller?.userName || socket.id} calling uid=${targetUid} → socketId=${targetSocketId} (${callType || 'video'})`);

    if (!targetSocketId) {
      // Target user is offline
      socket.emit('call-failed', {
        reason: 'offline',
        targetUid,
        message: 'User is not online',
      });
      return;
    }

    const target = onlineUsers.get(targetSocketId);

    // Check if target is already in a call
    if (target && (target.status === 'in-call' || target.status === 'calling')) {
      socket.emit('call-busy', {
        targetUid,
        targetSocketId,
        message: 'User is busy',
      });
      return;
    }

    io.to(targetSocketId).emit('incoming-call', {
      callerSocketId: socket.id,
      callerName: callerName || caller?.userName || 'Unknown',
      callerUid: callerUid || caller?.uid || socket.userId || null,
      callType: callType || 'video',
    });

    // Update caller status
    if (caller) {
      caller.status = 'calling';
      onlineUsers.set(socket.id, caller);
    }

    broadcastOnlineUsers();
  });

  // ── Accept call ──
  socket.on('accept-call', ({ callerSocketId, callerUid }) => {
    if (!checkRateLimit(socket.id)) return;

    const accepter = onlineUsers.get(socket.id);

    // ── Handle stale callerSocketId: if caller reconnected, resolve via UID ──
    let effectiveCallerSocketId = callerSocketId;
    if (!isValidTarget(effectiveCallerSocketId) && callerUid) {
      const resolvedSocketId = getSocketIdByUid(callerUid);
      if (resolvedSocketId) {
        console.log(`🔄  Stale callerSocketId ${callerSocketId} → resolved via UID ${callerUid} to ${resolvedSocketId}`);
        effectiveCallerSocketId = resolvedSocketId;
      }
    }

    const caller = onlineUsers.get(effectiveCallerSocketId);
    console.log(`✅  ${accepter?.userName || socket.id} accepted call from ${effectiveCallerSocketId} (original: ${callerSocketId}, callerUid: ${callerUid || 'none'})`);

    if (!isValidTarget(effectiveCallerSocketId)) {
      socket.emit('call-failed', {
        reason: 'offline',
        message: 'Caller is no longer available',
      });
      return;
    }

    // ── Create dynamic call room ──
    const accepterUid = accepter?.uid || socket.userId || socket.id;
    const resolvedCallerUid = caller?.uid || callerUid || effectiveCallerSocketId;
    const callRoomId = generateCallRoomId(accepterUid, resolvedCallerUid);

    const now = Date.now();
    activeCallRooms.set(callRoomId, {
      participants: [accepterUid, resolvedCallerUid],
      createdAt: now,
      startTime: now,
    });

    // Join both sockets to the call room
    socket.join(callRoomId);
    const callerSocket = io.sockets.sockets.get(effectiveCallerSocketId);
    if (callerSocket) {
      callerSocket.join(callRoomId);
    }

    // Emit joined-call-room to both
    io.to(socket.id).emit('joined-call-room', { roomId: callRoomId });
    io.to(effectiveCallerSocketId).emit('joined-call-room', { roomId: callRoomId });

    // Notify caller that call was accepted
    io.to(effectiveCallerSocketId).emit('call-accepted', {
      accepterSocketId: socket.id,
      accepterName: accepter?.userName || 'Unknown',
      accepterUid: accepter?.uid || null,
    });

    // Update statuses
    if (accepter) {
      accepter.status = 'in-call';
      accepter.callStartTime = now;
      onlineUsers.set(socket.id, accepter);
    }
    if (caller) {
      caller.status = 'in-call';
      caller.callStartTime = now;
      onlineUsers.set(effectiveCallerSocketId, caller);
    }

    console.log(`🏠  Call room created: ${callRoomId}`);
    broadcastOnlineUsers();
  });

  // ── Reject call ──
  socket.on('reject-call', ({ callerSocketId }) => {
    if (!checkRateLimit(socket.id)) return;

    const rejecter = onlineUsers.get(socket.id);
    console.log(`❌  ${rejecter?.userName || socket.id} rejected call from ${callerSocketId}`);

    if (isValidTarget(callerSocketId)) {
      io.to(callerSocketId).emit('call-rejected', {
        rejecterSocketId: socket.id,
        rejecterName: rejecter?.userName || 'Unknown',
      });
    }

    // Reset caller status
    const caller = onlineUsers.get(callerSocketId);
    if (caller) {
      caller.status = 'available';
      onlineUsers.set(callerSocketId, caller);
    }
    broadcastOnlineUsers();
  });

  // ── WebRTC offer ──
  socket.on('offer', ({ targetSocketId, offer }) => {
    if (!checkRateLimit(socket.id)) return;

    if (!isValidTarget(targetSocketId)) return;

    console.log(`📡  Offer from ${socket.id} → ${targetSocketId}`);
    io.to(targetSocketId).emit('offer', {
      senderSocketId: socket.id,
      offer,
    });
  });

  // ── WebRTC answer ──
  socket.on('answer', ({ targetSocketId, answer }) => {
    if (!checkRateLimit(socket.id)) return;

    if (!isValidTarget(targetSocketId)) return;

    console.log(`📡  Answer from ${socket.id} → ${targetSocketId}`);
    io.to(targetSocketId).emit('answer', {
      senderSocketId: socket.id,
      answer,
    });
  });

  // ── ICE candidate ──
  socket.on('ice-candidate', ({ targetSocketId, candidate }) => {
    if (!checkRateLimit(socket.id)) return;

    if (!isValidTarget(targetSocketId)) return;

    io.to(targetSocketId).emit('ice-candidate', {
      senderSocketId: socket.id,
      candidate,
    });
  });

  // ── End call ──
  socket.on('end-call', ({ targetSocketId, duration }) => {
    if (!checkRateLimit(socket.id)) return;

    const user = onlineUsers.get(socket.id);
    console.log(`🔚  ${user?.userName || socket.id} ended call`);

    // Calculate duration from call room if available
    let callDuration = duration || 0;
    if (user && user.uid) {
      for (const [roomId, room] of activeCallRooms.entries()) {
        if (room.participants.includes(user.uid)) {
          callDuration = room.startTime ? Math.floor((Date.now() - room.startTime) / 1000) : callDuration;

          // Leave call room for both participants
          socket.leave(roomId);
          const otherUid = room.participants.find(uid => uid !== user.uid);
          if (otherUid) {
            const otherSocketId = getSocketIdByUid(otherUid);
            if (otherSocketId) {
              const otherSocket = io.sockets.sockets.get(otherSocketId);
              if (otherSocket) {
                otherSocket.leave(roomId);
              }
            }
          }

          // Rejoin lobby for both
          socket.join('lobby');
          if (user) {
            user.room = 'lobby';
          }

          activeCallRooms.delete(roomId);
          console.log(`🏠  Call room destroyed: ${roomId} (duration: ${callDuration}s)`);
          break;
        }
      }
    }

    if (targetSocketId && isValidTarget(targetSocketId)) {
      io.to(targetSocketId).emit('call-ended', {
        senderSocketId: socket.id,
        senderName: user?.userName || 'Unknown',
        duration: callDuration,
      });

      const target = onlineUsers.get(targetSocketId);
      if (target) {
        target.status = 'available';
        target.callStartTime = null;
        target.room = 'lobby';
        onlineUsers.set(targetSocketId, target);

        // Rejoin lobby
        const targetSocket = io.sockets.sockets.get(targetSocketId);
        if (targetSocket) {
          targetSocket.join('lobby');
        }
      }
    }

    if (user) {
      user.status = 'available';
      user.callStartTime = null;
      user.room = 'lobby';
      onlineUsers.set(socket.id, user);
    }

    broadcastOnlineUsers();
  });

  // ── Chat message ──
  socket.on('send-message', ({ targetSocketId, message, senderName }) => {
    if (!checkRateLimit(socket.id)) return;

    const user = onlineUsers.get(socket.id);
    const payload = {
      senderSocketId: socket.id,
      senderName: senderName || user?.userName || 'Unknown',
      message,
      timestamp: Date.now(),
    };

    if (targetSocketId) {
      if (!isValidTarget(targetSocketId)) return;
      io.to(targetSocketId).emit('receive-message', payload);
    } else {
      // Broadcast to room
      const room = user?.room || 'lobby';
      socket.to(room).emit('receive-message', payload);
    }
  });

  // ── Toggle media (mute / camera) ──
  socket.on('toggle-media', ({ targetSocketId, mediaType, enabled }) => {
    if (!checkRateLimit(socket.id)) return;

    const user = onlineUsers.get(socket.id);
    console.log(`🎛️  ${user?.userName || socket.id} toggled ${mediaType}: ${enabled}`);

    if (targetSocketId && isValidTarget(targetSocketId)) {
      io.to(targetSocketId).emit('media-toggled', {
        senderSocketId: socket.id,
        mediaType,
        enabled,
      });
    }
  });

  // ── Disconnect ──
  socket.on('disconnect', () => {
    const user = onlineUsers.get(socket.id);
    console.log(`🔌  Disconnected: ${user?.userName || socket.id} (${socket.id})`);

    // Clean up any active call rooms this user was in
    leaveCallRoomsForSocket(socket);

    if (user) {
      // Notify room
      socket.to(user.room).emit('user-left', {
        socketId: socket.id,
        userName: user.userName,
        uid: user.uid || null,
      });
    }

    onlineUsers.delete(socket.id);
    rateLimitMap.delete(socket.id);
    broadcastOnlineUsers();
  });
});

// ── Periodic rate limit cleanup (every 30 seconds) ──
setInterval(() => {
  const now = Date.now();
  for (const [socketId, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime + 5000) {
      rateLimitMap.delete(socketId);
    }
  }
}, 30000);

// ── Start server ──
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀  AuraCall Signaling Server running on http://localhost:${PORT}`);
  console.log(`    Auth: ${firebaseAdmin ? 'Firebase Admin ✅' : 'Disabled ⚠️'}`);
  console.log('');
});
