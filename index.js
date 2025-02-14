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
// ovanstående är för att starta upp type shi

// this stuff är annat type shi
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/chat.html");
});

io.on("connection", handleConnection);

function handleConnection(socket) {
  console.log("A user connected, " + socket.id);
  socket.join("global");

  io.emit("con", {id: socket.id, roomID: "global"});

  socket.on("chat", function (obj) {
    console.log(socket.id + ": " + obj.input + " in room " + obj.roomID);
    io.to(obj.roomID).emit("chat", { id: socket.id, msg: obj.input, roomID: obj.roomID});
  });

  socket.on("join", function (roomID) {
    socket.join(roomID);
  });
}
