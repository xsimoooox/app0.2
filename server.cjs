const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const webpush = require('web-push');
const cors = require('cors');

require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

app.use(cors());
app.use(express.json());

const vapidPublic = process.env.VAPID_PUBLIC_KEY;
const vapidPrivate = process.env.VAPID_PRIVATE_KEY;

if (vapidPublic && vapidPrivate) {
  webpush.setVapidDetails('mailto:contact@wakwak.app', vapidPublic, vapidPrivate);
}

const onlineUsers = new Map();
const pushSubscriptions = new Map();
const callTurns = new Map();

function callPairKey(phoneA, phoneB) {
  return [phoneA, phoneB].filter(Boolean).sort().join('|');
}

function emitTurnChange(io, phoneA, phoneB, canSpeak) {
  const socketA = onlineUsers.get(phoneA);
  const socketB = onlineUsers.get(phoneB);
  if (socketA) io.to(socketA).emit('turn_change', { canSpeak });
  if (socketB) io.to(socketB).emit('turn_change', { canSpeak });
}

setInterval(() => {
  console.log('=== ONLINE USERS ===');
  for (const [phone, sid] of onlineUsers.entries()) {
    console.log(`  ${phone} → ${sid}`);
  }
  console.log(`  Total: ${onlineUsers.size} users`);
}, 30000);

app.post('/subscribe', (req, res) => {
  const { phoneNumber, subscription } = req.body;
  if (!phoneNumber || !subscription) {
    return res.status(400).json({ error: 'Missing data' });
  }
  pushSubscriptions.set(phoneNumber, subscription);
  console.log(`Push subscription saved: ${phoneNumber}`);
  return res.status(201).json({ message: 'Subscription saved' });
});

app.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: vapidPublic || '' });
});

app.post('/reject-call', (req, res) => {
  const { callerPhone, targetPhone } = req.body;
  const callerSocketId = onlineUsers.get(callerPhone);
  if (callerSocketId) {
    io.to(callerSocketId).emit('call_rejected', { by: targetPhone });
  }
  res.json({ ok: true });
});

app.get('/debug/users', (req, res) => {
  const users = {};
  for (const [phone, sid] of onlineUsers.entries()) {
    users[phone] = sid;
  }
  res.json({ total: onlineUsers.size, users });
});

io.on('connection', (socket) => {
  console.log(`[SOCKET] New connection: ${socket.id}`);

  socket.on('register_user', (phoneNumber) => {
    if (!phoneNumber) {
      console.error('[REGISTER] ERROR: phoneNumber is undefined/null');
      return;
    }

    const oldSocketId = onlineUsers.get(phoneNumber);
    if (oldSocketId && oldSocketId !== socket.id) {
      console.log(`[REGISTER] Updating socketId for ${phoneNumber}: ${oldSocketId} → ${socket.id}`);
    }

    onlineUsers.set(phoneNumber, socket.id);
    socket.data.phoneNumber = phoneNumber;

    console.log(`[REGISTER] OK: ${phoneNumber} → ${socket.id}`);
    console.log(`[REGISTER] Total online: ${onlineUsers.size}`);

    socket.emit('register_confirmed', {
      phoneNumber,
      socketId: socket.id,
    });

    io.emit('user_status_change', { phoneNumber, status: 'online' });
  });

  socket.on('call_user', async ({ callerPhone, targetPhone, callerName }) => {
    console.log(`[CALL] ${callerPhone} → ${targetPhone}`);

    if (!callerPhone || !targetPhone) {
      console.error(`[CALL] ERROR: callerPhone=${callerPhone}, targetPhone=${targetPhone}`);
      socket.emit('call_failed', { reason: 'invalid_phones', targetPhone });
      return;
    }

    const callerSocketId = onlineUsers.get(callerPhone);
    if (!callerSocketId) {
      console.error(`[CALL] ERROR: caller ${callerPhone} not registered`);
    }

    const targetSocketId = onlineUsers.get(targetPhone);
    console.log(`[CALL] Target socketId: ${targetSocketId || 'NOT FOUND'}`);
    console.log(`[CALL] Map size: ${onlineUsers.size}`);

    if (targetSocketId) {
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (!targetSocket) {
        console.error(`[CALL] Socket ${targetSocketId} exists in Map but not in io.sockets`);
        onlineUsers.delete(targetPhone);
        io.emit('user_status_change', { phoneNumber: targetPhone, status: 'offline' });
        socket.emit('call_failed', { reason: 'user_offline', targetPhone });
        return;
      }

      io.to(targetSocketId).emit('incoming_call', {
        callerPhone,
        callerName: callerName || callerPhone,
        targetPhone,
        timestamp: Date.now(),
      });
      console.log(`[CALL] incoming_call sent to ${targetPhone} (socket: ${targetSocketId})`);
      return;
    }

    const subscription = pushSubscriptions.get(targetPhone);
    if (subscription && vapidPublic && vapidPrivate) {
      const apiBase = process.env.WAKWAK_API_URL || `http://localhost:${process.env.PORT || 3001}`;
      const payload = JSON.stringify({
        type: 'incoming_call',
        callerPhone,
        callerName: callerName || callerPhone,
        targetPhone,
        timestamp: Date.now(),
        url: `/?action=accept_call&from=${encodeURIComponent(callerPhone)}`,
        apiBase,
      });
      try {
        await webpush.sendNotification(subscription, payload);
        console.log(`[CALL] Push sent to offline user: ${targetPhone}`);
      } catch (err) {
        console.error('[CALL] Push error:', err);
        if (err.statusCode === 410) {
          pushSubscriptions.delete(targetPhone);
        }
        socket.emit('call_failed', { reason: 'user_unreachable', targetPhone });
      }
      return;
    }

    console.log(`[CALL] ${targetPhone} is offline`);
    socket.emit('call_failed', { reason: 'user_offline', targetPhone });
  });

  socket.on('accept_call', ({ callerPhone, targetPhone }) => {
    console.log(`[ACCEPT] ${targetPhone} accepts call from ${callerPhone}`);
    const callerSocketId = onlineUsers.get(callerPhone);
    const key = callPairKey(callerPhone, targetPhone);
    callTurns.set(key, callerPhone);
    emitTurnChange(io, callerPhone, targetPhone, callerPhone);
    if (callerSocketId) {
      io.to(callerSocketId).emit('call_accepted', {
        by: targetPhone,
        timestamp: Date.now(),
      });
      io.emit('user_status_change', { phoneNumber: callerPhone, status: 'busy' });
      io.emit('user_status_change', { phoneNumber: targetPhone, status: 'busy' });
    } else {
      console.error(`[ACCEPT] Caller ${callerPhone} not found in map`);
    }
  });

  socket.on('reject_call', ({ callerPhone, targetPhone }) => {
    console.log(`[REJECT] ${targetPhone} rejects call from ${callerPhone}`);
    const callerSocketId = onlineUsers.get(callerPhone);
    if (callerSocketId) {
      io.to(callerSocketId).emit('call_rejected', { by: targetPhone });
    }
  });

  socket.on('voice_text', ({ callerPhone, targetPhone, text }) => {
    const key = callPairKey(callerPhone, targetPhone);
    const holder = callTurns.get(key);
    if (holder && holder !== callerPhone) {
      socket.emit('turn_denied', { reason: 'not_your_turn', canSpeak: holder });
      return;
    }
    const targetSocketId = onlineUsers.get(targetPhone);
    if (targetSocketId) {
      io.to(targetSocketId).emit('receive_voice_text', {
        from: callerPhone,
        text,
        timestamp: Date.now(),
      });
      callTurns.set(key, targetPhone);
      emitTurnChange(io, callerPhone, targetPhone, targetPhone);
    }
  });

  socket.on('sign_text', ({ callerPhone, targetPhone, text }) => {
    const key = callPairKey(callerPhone, targetPhone);
    const holder = callTurns.get(key);
    if (holder && holder !== callerPhone) {
      socket.emit('turn_denied', { reason: 'not_your_turn', canSpeak: holder });
      return;
    }
    const targetSocketId = onlineUsers.get(targetPhone);
    if (targetSocketId) {
      io.to(targetSocketId).emit('receive_sign_text', {
        from: callerPhone,
        text,
        timestamp: Date.now(),
      });
      callTurns.set(key, targetPhone);
      emitTurnChange(io, callerPhone, targetPhone, targetPhone);
    }
  });

  socket.on('end_call', ({ callerPhone, targetPhone }) => {
    console.log(`[END_CALL] ${callerPhone} ↔ ${targetPhone}`);
    callTurns.delete(callPairKey(callerPhone, targetPhone));
    const otherPhone = socket.data.phoneNumber === callerPhone ? targetPhone : callerPhone;
    const otherSocket = onlineUsers.get(otherPhone);
    if (otherSocket) {
      io.to(otherSocket).emit('call_ended', { by: socket.data.phoneNumber });
    }
    io.emit('user_status_change', { phoneNumber: callerPhone, status: 'online' });
    io.emit('user_status_change', { phoneNumber: targetPhone, status: 'online' });
  });

  socket.on('call_timeout', ({ callerPhone, targetPhone }) => {
    const targetSocketId = onlineUsers.get(targetPhone);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call_cancelled', { by: callerPhone });
    }
    io.emit('user_status_change', { phoneNumber: callerPhone, status: 'online' });
  });

  socket.on('disconnect', (reason) => {
    const phone = socket.data.phoneNumber;
    console.log(`[DISCONNECT] socket: ${socket.id}, phone: ${phone}, reason: ${reason}`);
    if (phone) {
      const currentSocketId = onlineUsers.get(phone);
      if (currentSocketId === socket.id) {
        onlineUsers.delete(phone);
        io.emit('user_status_change', { phoneNumber: phone, status: 'offline' });
        console.log(`[DISCONNECT] ${phone} is now offline`);
      } else {
        console.log(`[DISCONNECT] ${phone} already reconnected with new socket`);
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`WakWak server running on port ${PORT}`);
});
