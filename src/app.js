const http = require('http');
const socketio = require('socket.io');
const fs = require('fs');

const xxh = require('xxhashjs');

const PORT = process.env.PORT || process.env.NODE_PORT || 3000;

const handler = (req, res) => {
  fs.readFile(`${__dirname}/../client/index.html`, (err, data) => {
    // if err, throw it for now
    if (err) {
      throw err;
    }
    res.writeHead(200);
    res.end(data);
  });
};

// start http server and get HTTP server instance
const app = http.createServer(handler);
/**
  pass http server instance into socketio to get
  a websocket server instance running inside our
  http server. We do this so socket.io can host
  the client-side script that we import in the browser
  and so it runs on the same port/address as our HTTP server.

  DON'T PASS THE HTTP MODULE itself.
**/
const io = socketio(app);

app.listen(PORT); // start listening

// for each new socket connection
io.on('connection', (sock) => {
  const socket = sock;
  // joining into hard-coded room for this app
  // app users in room1
  socket.join('room1');

  // random x value
  const xPosition = Math.floor((Math.random() * 450)) - 50;

  socket.square = {
    hash: xxh.h32(`${socket.id}${new Date().getTime()}`, 0xCAFEBABE).toString(16),
    lastUpdate: new Date().getTime(), // last time this object was updated
    x: xPosition, // default x value of this square
    y: 0, // default y value of this square
    prevX: 0, // default x value of the last known position
    prevY: 0, // default y value of the last known position
    destX: xPosition, // default x value of the desired next x position
    destY: 0, // default y value of the desired next y position
    alpha: 0, // default alpha (how far this object is % from prev to dest)
    height: 100, // default height
    width: 100, //default width
  };

  // send the user a joined event sending them their new square.
  // This square object on exists server side. Properties of the socket
  // are not the same on both the client and server.
  socket.emit('joined', socket.square);

  // when we receive a movement update from the client
  socket.on('movementUpdate', (data) => {
    socket.square = data;

    // DO GRAVITY
    if (data.destY <= 400) {
      const gravity = data.destY + 5;
      socket.square.destY = gravity;
    }
    // we do update the time though, so we know the last time this is updated
    socket.square.lastUpdate = new Date().getTime();

    io.sockets.in('room1').emit('updatedMovement', socket.square);
  });

  // when a user disconnects, we want to make sure we let everyone know
  // and ask them to remove the object
  socket.on('disconnect', () => {
    // ask users to remove the extra object on their side by sending the object id
    io.sockets.in('room1').emit('left', socket.square.hash);

    // remove this socket from the room
    socket.leave('room1');
  });
});

console.log(`listening on port ${PORT}`);
