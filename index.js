const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const app = express();

app.use(express.static("client"));
app.use(express.urlencoded({ extended: true }));

const sessionMw = session({
  secret: "keyboard cat",
  resave: false,
  saveUninitialized: true,
  cookie: {},
});

app.use(sessionMw);

const { createServer } = require("http");
const { Server } = require("socket.io");

const server = createServer(app);
const io = new Server(server);
io.engine.use(sessionMw);

server.listen(3400, (_) => {
  console.log("http://localhost:3400");
});
// ovanstående är för att starta upp type shi

// this stuff är annat type shi
const fs = require("fs");

app.get("/", (req, res) => {
  if (!req.session.UserID) {
    res.redirect("/login");
  }
  console.log()
  res.sendFile(__dirname + "/template.html");
});

app.get("/register", (req, res) => {
  res.sendFile(__dirname + "/register.html");
});

app.post("/register", register);

async function register(req, res) {
  let obj = {name: req.body.name, password: req.body.pw};
  
  let users = JSON.parse(fs.readFileSync("users.json").toString());
  let user = users.find((u) => u.name == obj.name);

  if (user) return res.redirect("/register");


  obj.id = "" + Date.now();
  obj.password = await bcrypt.hash(obj.password, 12);
  users.push(obj);

  fs.writeFileSync("users.json", JSON.stringify(users, null, 3));

  req.session.UserID = obj.id;
  req.session.name = obj.name;

  res.redirect("/");
}


app.get("/login", (req, res) => {
  res.sendFile(__dirname + "/login.html");
});

app.post("/login", login);

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
})

async function login(req, res) {
  let obj = { name: req.body.name, password: req.body.pw };

  let users = JSON.parse(fs.readFileSync("users.json").toString());
  let user = users.find((u) => u.name == obj.name);

  if (!user) {
    res.redirect("/login");
  }

  let checkPW = await bcrypt.compare(obj.password, user.password);
  if (!checkPW) return res.redirect("/login");

  req.session.UserID = user.id;
  req.session.name = user.name;
  console.log("logged in");
  res.redirect("/");
}

io.on("connection", handleConnection);

function handleConnection(socket) {
  //socket.join(socket.request.session.userId);
  //console.log(io.sockets.adapter.rooms);

  //gör att socketen kan uppdatera det visade användar id:t
  io.to(socket.id).emit("updateUsername", socket.request.session.name);
  socket.join("global");
  //uppdaterar användarens select element med options
  io.to(socket.id).emit(
    "updateJoinableRooms",
    getArrayOfRooms(io.sockets.adapter.rooms)
  );

  //skickar chattmeddelanden till användare
  io.to(socket.id).emit("roomLogs", {
    room: "global",
    logs: getRoomLogs("global"),
  });
  //skickar till alla i rummet global att en ny user går med i global
  io.emit("chat", { msg: socket.request.session.name + " has connected!", room: "global" });
  logMsg("global", socket.request.session.name + " has connected!");

  socket.on("chat", function (obj) {
    //om användaren inte är med i rummet ska chatten inte gå vidare
    if (!socket.rooms.has(obj.room)) return;

    let msg = socket.request.session.name + ": " + obj.input;

    logMsg(obj.room, msg);

    io.to(obj.room).emit("chat", {
      msg,
      room: obj.room,
    });
  });

  socket.on("createRoomRequest", function (room) {
    if (io.sockets.adapter.rooms.get(room)) {
      io.to(socket.id).emit("creationDenied");
      return;
    }

    socket.join(room);

    makeRoom(room);

    io.to(socket.id).emit("joinApproved", room);

    io.to(socket.id).emit("roomLogs", { room: room, logs: getRoomLogs(room) });

    io.to(room).emit("chat", {
      msg: socket.request.session.name + " has connected!",
      room: room,
    });
    logMsg(room, socket.request.session.name + " has connected!");

    io.emit("updateJoinableRooms", getArrayOfRooms(io.sockets.adapter.rooms));
  });

  socket.on("joinRoomRequest", function (room) {
    if (socket.rooms.has(room)) {
      io.to(socket.id).emit("joinDenied");
      return;
    }

    socket.join(room);

    io.to(socket.id).emit("joinApproved", room);

    io.to(socket.id).emit("roomLogs", { room: room, logs: getRoomLogs(room) });

    io.to(room).emit("chat", {
      msg: socket.id + " has connected!",
      room: room,
    });
    logMsg(room, socket.id + " has connected!");
  });

  socket.on("leaveRoom", function (room) {
    socket.leave(room);
    io.to(room).emit("chat", {
      msg: socket.id + " disconnected.",
      room: room,
    });
  });

  socket.on("disconnect", function () {
    //notify when socket leaves a room or all rooms i guess
  });
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

  let newRoom = { room: room, logs: [] };

  allRooms.push(newRoom);

  fs.writeFileSync("rooms.json", JSON.stringify(allRooms, null, 3));
}

function getArrayOfRooms(rooms) {
  let ArrayOfRooms = [];

  rooms.forEach(function (value, key) {
    if (!value.has(key)) {
      ArrayOfRooms.push(key);
    }
  });

  return ArrayOfRooms;
}