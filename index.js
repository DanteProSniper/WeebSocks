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
const fs = require("fs");

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/chat.html");
});



io.on("connection", handleConnection);

function handleConnection(socket) {
  //gör att socketen kan uppdatera det visade användar id:t
  io.to(socket.id).emit("updateUserID", socket.id);
  io.to(socket.id).emit("updateJoinableRooms", getArrayOfRooms());
  socket.join("global");
  addUserToRoom("global", socket.id);
  //skickar chattmeddelanden till användare
  io.to(socket.id).emit("roomLogs", { room: "global", logs: getRoomLogs("global") });
  //skickar till alla i rummet global att en ny user går med i global
  io.emit("chat", { msg: socket.id + " has connected!", room: "global" });
  logMsg("global", socket.id + " has connected!");


  socket.on("chat", function (obj) {

    logMsg(obj.room, obj.input);

    let msg = socket.id + ": " + obj.input
    io.to(obj.room).emit("chat", {
      msg,
      room: obj.room,
    });
  });

  socket.on("createRoomRequest", function (room) {
    if (io.sockets.adapter.rooms.get(room)) {
      io.to(socket.id).emit("creationDenied", room);
      return;
    }

    makeRoom(room);

    addUserToRoom(room, socket.id);

    io.to(socket.id).emit("creationApproved", room);

    io.emit("updateJoinableRooms", getArrayOfRooms());
  });

  socket.on("joinRoom", function (room) {

    socket.join(room);

    io.to(room).emit("chat", { msg: socket.id + " has connected!", room: room });
  });
}


function addUserToRoom(room, user) {

  let allRooms = getRooms();
  let targetRoom = allRooms.find((r) => r.room == room);
  targetRoom.connectedUsers.push(user);
  fs.writeFileSync("rooms.json", JSON.stringify(allRooms, null, 3));


}

function getRoomLogs(room) {

  let allRooms = getRooms();
  let targetRoom = allRooms.find((r) => r.room == room);
  return targetRoom.logs;

}

function logMsg(room, msg) {
  let allRooms = getRooms();
  let targetRoom = allRooms.find((r) => r.room == room);
  let logs = targetRoom.logs;
  logs.push(msg);

  fs.writeFileSync("rooms.json", JSON.stringify(allRooms, null, 3));
}

function getRooms() {
  return JSON.parse(fs.readFileSync("rooms.json").toString());
}

function makeRoom(room) {
  let allRooms = getRooms();

  let newRoom = { room: room, connectedUsers: [], logs: [] };

  allRooms.push(newRoom);

  fs.writeFileSync("rooms.json", JSON.stringify(allRooms, null, 3));
}

function getArrayOfRooms() {

  let ArrayOfRooms = [];
  let allRooms = getRooms();
  allRooms.forEach(room => {
    ArrayOfRooms.push(room.room);
  });

  return ArrayOfRooms;
}