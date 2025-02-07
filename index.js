const express = require("express");
const app = express();

app.use(express.static("client"));

const { createServer } = require("http");
const { Server } = require("socket.io");

const server = createServer(app);
const io = new Server(server);

const port = 3400;
server.listen(port, (_) => {
  console.log(`http://localhost:${port}`);
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/chat.html");
});

io.on("connection", handleConnection);

function handleConnection(socket) {
  console.log("A user connected, " + socket.id);

  io.emit("con", socket.id + " connected");

  socket.on("chat", function (msg, roomID) {
    console.log(socket.id + ": " + msg + " in room " + roomID);
    io.emit("chat", { id: socket.id, msg, roomID });
  });

  socket.on("join", function(room){
    console.log(room);
    
  })
}
