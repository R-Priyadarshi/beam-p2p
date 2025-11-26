const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const rooms = new Map();

io.on('connection', (socket) => {
  console.log(`Connected: ${socket.id.slice(0,8)}`);

  socket.on('join-room', (roomCode) => {
    socket.join(roomCode);
    if (!rooms.has(roomCode)) rooms.set(roomCode, new Set());
    rooms.get(roomCode).add(socket.id);

    socket.to(roomCode).emit('user-joined', socket.id);
    socket.emit('all-users', Array.from(rooms.get(roomCode)).filter(id => id !== socket.id));
  });

  socket.on('offer', (data) => socket.to(data.target).emit('offer', { sdp: data.sdp, sender: socket.id }));
  socket.on('answer', (data) => socket.to(data.target).emit('answer', { sdp: data.sdp, sender: socket.id }));
  socket.on('ice-candidate', (data) => socket.to(data.target).emit('ice-candidate', { candidate: data.candidate, sender: socket.id }));

  socket.on('disconnect', () => {
    for (const [room, users] of rooms.entries()) {
      if (users.has(socket.id)) {
        users.delete(socket.id);
        socket.to(room).emit('user-left', socket.id);
        if (users.size === 0) rooms.delete(room);
      }
    }
  });
});

app.use(cors());
app.get('/', (req, res) => res.send('Beam Signaling Server — Live'));

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Beam backend running on port ${PORT}`);
});
