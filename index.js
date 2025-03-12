const express = require("express");
const app = express();

app.use(express.static("client"));

const { createServer } = require("http");
const { Server } = require("socket.io");

const server = createServer(app);
const io = new Server(server);

server.listen(3400, (_) => {
  console.log("http://localhost:3400");
});
// ovanstående är för att starta upp type shi

// this stuff är annat type shi
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/chat.html");
});

io.on("connection", handleConnection);

function handleConnection(socket) {
  socket.join("global");


  
  //för att se vilka rum en socket är med i: console.log(socket.rooms);

  io.emit("con", { id: socket.id, roomID: "global" });

  socket.on("chat", function (obj) {
    io.to(obj.roomID).emit("chat", {
      id: socket.id,
      msg: obj.input,
      roomID: obj.roomID,
    });
  });

  socket.on("joinRoom", function (roomID) {
    io.to(roomID).emit("con", { id: socket.id, roomID });

    socket.join(roomID);
  });

  socket.on("createRoomRequest", function (roomID) {
    if (io.sockets.adapter.rooms.get(roomID)) {
      io.to(socket.id).emit("creationDenied", roomID);
      return;
    };

    io.to(socket.id).emit("creationApproved", roomID);

    io.emit("roomCreated", roomID);
    socket.join(roomID);
  });
}
