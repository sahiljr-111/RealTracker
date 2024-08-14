const express = require('express');
const app = express();
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');

const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
  res.render('index');
});

io.on('connection', (socket) => {
  console.log('Socket connection established', socket.id);

  socket.on('joinRoom', ({ roomId, name }) => {
    socket.join(roomId);
    console.log(`${name} joined room ${roomId}`);
    
    socket.on('sendLocation', (data) => {
      io.to(roomId).emit('receiveLocation', { id: socket.id, name, ...data });
    });

    socket.on('disconnectLocation', () => {
      io.to(roomId).emit('userDisconnect', socket.id);
    });

    socket.on('disconnect', () => {
      io.to(roomId).emit('userDisconnect', socket.id);
    });
  });
});

server.listen(8080, () => {
  console.log('Server is running on port 8080');
});
