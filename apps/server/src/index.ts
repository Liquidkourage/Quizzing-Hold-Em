import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { nanoid } from 'nanoid';
import type { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from '@qhe/net';
import { createEmptyGame, addPlayer, removePlayer } from '@qhe/core';

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(server, {
  cors: { origin: '*'}
});

const rooms = new Map<string, ReturnType<typeof createEmptyGame>>();

io.on('connection', (socket) => {
  socket.data.userId = nanoid();
  socket.on('hello', (payload, cb) => {
    const { room, role, name } = payload;
    socket.data.role = role; socket.data.name = name; socket.data.room = room;
    if (!rooms.has(room)) rooms.set(room, createEmptyGame(room, 'host'));
    socket.join(room);
    const state = rooms.get(room)!;
    if (role === 'player') {
      const updated = addPlayer(state, socket.data.userId, name);
      rooms.set(room, updated);
      io.to(room).emit('state', updated);
    }
    cb({ ok: true });
  });
  socket.on('disconnect', () => {
    const room = socket.data.room; if (!room) return;
    const state = rooms.get(room); if (!state) return;
    const updated = removePlayer(state, socket.data.userId);
    rooms.set(room, updated);
    io.to(room).emit('state', updated);
  });
});

app.get('/', (_req, res) => {
  res.send('Quizzing Hold-Em server running');
});

const PORT = Number(process.env.PORT || 5174);
server.listen(PORT, () => console.log([server] listening on :));
