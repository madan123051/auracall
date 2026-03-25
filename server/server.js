const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// ── Track online users: socketId → { userName, room, status } ──
const onlineUsers = new Map();

// ── Helper: broadcast updated user list to everyone ──
function broadcastOnlineUsers() {
  const users = [];
  onlineUsers.forEach((info, socketId) => {
    users.push({ socketId, userName: info.userName, room: info.room, status: info.status });
  });
  io.emit('online-users', users);
}

// ── Health check endpoint ──
app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'AuraCall Signaling Server', users: onlineUsers.size });
});

// ── Socket.IO connection handling ──
io.on('connection', (socket) => {
  console.log(`✅  Connected: ${socket.id}`);

  // ── Join room ──
  socket.on('join-room', ({ userName, room }) => {
    const roomId = room || 'lobby';
    socket.join(roomId);

    onlineUsers.set(socket.id, { userName, room: roomId, status: 'available' });
    console.log(`👤  ${userName} joined room "${roomId}" (${socket.id})`);

    // Notify others in the room
    socket.to(roomId).emit('user-joined', {
      socketId: socket.id,
      userName,
    });

    broadcastOnlineUsers();
  });

  // ── Call a specific user ──
  socket.on('call-user', ({ targetSocketId, callerName, callerSocketId, callType }) => {
    const caller = onlineUsers.get(socket.id);
    console.log(`📞  ${caller?.userName || socket.id} calling ${targetSocketId} (${callType || 'video'})`);

    io.to(targetSocketId).emit('incoming-call', {
      callerSocketId: socket.id,
      callerName: callerName || caller?.userName || 'Unknown',
      callType: callType || 'video',
    });

    // Update status
    if (caller) {
      caller.status = 'calling';
      onlineUsers.set(socket.id, caller);
    }
  });

  // ── Accept call ──
  socket.on('accept-call', ({ callerSocketId }) => {
    const accepter = onlineUsers.get(socket.id);
    console.log(`✅  ${accepter?.userName || socket.id} accepted call from ${callerSocketId}`);

    io.to(callerSocketId).emit('call-accepted', {
      accepterSocketId: socket.id,
      accepterName: accepter?.userName || 'Unknown',
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
