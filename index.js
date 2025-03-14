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

//fs.writeFileSync("rooms.json", "[]");

io.on("connection", handleConnection);

function handleConnection(socket) {
  //gör att socketen kan uppdatera det visade användar id:t
  io.to(socket.id).emit("updateUserID", socket.id);
  socket.join("global");
  addUserToRoom("global", socket.id);
  //skickar chattmeddelanden till användare
  //KEEEP GOING UNDER HERE!!! UNDER WHERE? HAHAHHAHA MADE YOU SAY UNDERWEAR!!!! HADHABVDSAJHDSAVDSAJDVSAHGDVSAJHGVDHSAVDHGSADHGSAVDHGSACHDVCHDSA
  //io.to(socket.id).emit("msg", )
  //skickar till alla i rummet global att en ny user går med i global
  io.emit("chat", { msg: socket.id + " has connected!", roomID: "global" });

  socket.on("chat", function (obj) {
    let msg = socket.id + ": " + obj.input
    io.to(obj.roomID).emit("chat", {
      msg,
      roomID: obj.roomID,
    });
  });

  socket.on("createRoomRequest", function (roomID) {
    if (io.sockets.adapter.rooms.get(roomID)) {
      io.to(socket.id).emit("creationDenied", roomID);
      return;
    }

    io.to(socket.id).emit("creationApproved", roomID);

    io.emit("roomCreated", roomID);
    socket.join(roomID);
  });

  socket.on("joinRoom", function (roomID) {
    io.to(roomID).emit("con", { id: socket.id, roomID });

    socket.join(roomID);
  });
}


function addUserToRoom(room, user){

  let allRooms = JSON.parse(fs.readFileSync("rooms.json").toString());
  let targetRoom = allRooms.find((r) => r.room == room);
  targetRoom.connectedUsers.push(user);
  console.log(allRooms);
  fs.writeFileSync("rooms.json", JSON.stringify(allRooms), null, 3);
  
  
}