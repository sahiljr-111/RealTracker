const express = require('express');
const app = express();
const path = require('path');
const socket = require('socket.io');
const server = app.listen(8080, () => {
  console.log('Server is running on port 8080');
});
const io = socket(server);

app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.get('/', (req, res) => {
  res.render('index');
}
);
io.on('connection', (socket) => {
  console.log('Socket connection established');
  socket.on('sendLocation', (data) => {
    io.emit('recieveLocation', {id: socket.id, ...data});
  });
  socket.on("disconnect", (data) => {
    io.emit('userDisconect', socket.id);
  });
});
