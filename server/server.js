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

// ── Track online users: socketId → { userName, room, status, uid } ──
const onlineUsers = new Map();

// ── UID → socketId lookup ──
function getSocketIdByUid(uid) {
  for (const [socketId, info] of onlineUsers.entries()) {
    if (info.uid === uid) return socketId;
  }
  return null;
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

// ── Health check endpoint ──
app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'AuraCall Signaling Server', users: onlineUsers.size });
});

// ── TURN credentials endpoint ──
app.get('/api/turn-credentials', (req, res) => {
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];
  // Add TURN if configured
  if (process.env.TURN_URL) {
    iceServers.push({
      urls: process.env.TURN_URL,
      username: process.env.TURN_USERNAME || '',
      credential: process.env.TURN_CREDENTIAL || '',
    });
  }
  res.json({ iceServers });
});

// ── Socket.IO connection handling ──
io.on('connection', (socket) => {
  console.log(`✅  Connected: ${socket.id}`);

  // ── Join room (now accepts uid) ──
  socket.on('join-room', ({ userName, room, uid }) => {
    const roomId = room || 'lobby';
    socket.join(roomId);

    onlineUsers.set(socket.id, { userName, room: roomId, status: 'available', uid: uid || null });
    console.log(`👤  ${userName} joined room "${roomId}" (${socket.id}) uid=${uid || 'none'}`);

    // Notify others in the room
    socket.to(roomId).emit('user-joined', {
      socketId: socket.id,
      userName,
      uid: uid || null,
    });

    broadcastOnlineUsers();
  });

  // ── Call a specific user by socketId ──
  socket.on('call-user', ({ targetSocketId, callerName, callerSocketId, callType }) => {
    const caller = onlineUsers.get(socket.id);
    console.log(`📞  ${caller?.userName || socket.id} calling ${targetSocketId} (${callType || 'video'})`);

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
    const caller = onlineUsers.get(socket.id);
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
      callerUid: callerUid || caller?.uid || null,
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
  socket.on('accept-call', ({ callerSocketId }) => {
    const accepter = onlineUsers.get(socket.id);
    console.log(`✅  ${accepter?.userName || socket.id} accepted call from ${callerSocketId}`);

    io.to(callerSocketId).emit('call-accepted', {
      accepterSocketId: socket.id,
      accepterName: accepter?.userName || 'Unknown',
      accepterUid: accepter?.uid || null,
    });

    // Update statuses
    if (accepter) {
      accepter.status = 'in-call';
      onlineUsers.set(socket.id, accepter);
    }
    const caller = onlineUsers.get(callerSocketId);
    if (caller) {
      caller.status = 'in-call';
      onlineUsers.set(callerSocketId, caller);
    }

    broadcastOnlineUsers();
  });

  // ── Reject call ──
  socket.on('reject-call', ({ callerSocketId }) => {
    const rejecter = onlineUsers.get(socket.id);
    console.log(`❌  ${rejecter?.userName || socket.id} rejected call from ${callerSocketId}`);

    io.to(callerSocketId).emit('call-rejected', {
      rejecterSocketId: socket.id,
      rejecterName: rejecter?.userName || 'Unknown',
    });

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
    console.log(`📡  Offer from ${socket.id} → ${targetSocketId}`);
    io.to(targetSocketId).emit('offer', {
      senderSocketId: socket.id,
      offer,
    });
  });

  // ── WebRTC answer ──
  socket.on('answer', ({ targetSocketId, answer }) => {
    console.log(`📡  Answer from ${socket.id} → ${targetSocketId}`);
    io.to(targetSocketId).emit('answer', {
      senderSocketId: socket.id,
      answer,
    });
  });

  // ── ICE candidate ──
  socket.on('ice-candidate', ({ targetSocketId, candidate }) => {
    io.to(targetSocketId).emit('ice-candidate', {
      senderSocketId: socket.id,
      candidate,
    });
  });

  // ── End call ──
  socket.on('end-call', ({ targetSocketId }) => {
    const user = onlineUsers.get(socket.id);
    console.log(`🔚  ${user?.userName || socket.id} ended call`);

    if (targetSocketId) {
      io.to(targetSocketId).emit('call-ended', {
        senderSocketId: socket.id,
        senderName: user?.userName || 'Unknown',
      });

      const target = onlineUsers.get(targetSocketId);
      if (target) {
        target.status = 'available';
        onlineUsers.set(targetSocketId, target);
      }
    }

    if (user) {
      user.status = 'available';
      onlineUsers.set(socket.id, user);
    }

    broadcastOnlineUsers();
  });

  // ── Chat message ──
  socket.on('send-message', ({ targetSocketId, message, senderName }) => {
    const user = onlineUsers.get(socket.id);
    const payload = {
      senderSocketId: socket.id,
      senderName: senderName || user?.userName || 'Unknown',
      message,
      timestamp: Date.now(),
    };

    if (targetSocketId) {
      io.to(targetSocketId).emit('receive-message', payload);
    } else {
      // Broadcast to room
      const room = user?.room || 'lobby';
      socket.to(room).emit('receive-message', payload);
    }
  });

  // ── Toggle media (mute / camera) ──
  socket.on('toggle-media', ({ targetSocketId, mediaType, enabled }) => {
    const user = onlineUsers.get(socket.id);
    console.log(`🎛️  ${user?.userName || socket.id} toggled ${mediaType}: ${enabled}`);

    if (targetSocketId) {
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

    if (user) {
      // Notify room
      socket.to(user.room).emit('user-left', {
        socketId: socket.id,
        userName: user.userName,
        uid: user.uid || null,
      });
    }

    onlineUsers.delete(socket.id);
    broadcastOnlineUsers();
  });
});

// ── Start server ──
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀  AuraCall Signaling Server running on http://localhost:${PORT}\n`);
});
