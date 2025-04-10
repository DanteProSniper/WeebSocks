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
  if (!req.session.userID) {
    return res.redirect("/login");
  }
  res.send(
    render(fs.readFileSync("structure.html").toString(), req.session.name)
  );
});

app.get("/register", (req, res) => {
  res.send(render(fs.readFileSync("register.html").toString()));
});

app.post("/register", register);

async function register(req, res) {
  let obj = { name: req.body.name, password: req.body.pw };

  let users = JSON.parse(fs.readFileSync("users.json").toString());
  let user = users.find((u) => u.name == obj.name);

  if (user) return res.send(render("ERROR"));

  obj.id = "" + Date.now();
  obj.password = await bcrypt.hash(obj.password, 12);
  users.push(obj);

  fs.writeFileSync("users.json", JSON.stringify(users, null, 3));

  req.session.userID = obj.id;
  req.session.name = obj.name;

  res.redirect("/");
}

app.get("/login", (req, res) => {
  res.send(render(fs.readFileSync("login.html").toString()));
});

app.post("/login", login);

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

async function login(req, res) {
  let obj = { name: req.body.name, password: req.body.pw };

  let users = JSON.parse(fs.readFileSync("users.json").toString());
  let user = users.find((u) => u.name == obj.name);

  if (!user) {
    return res.send(render("ERROR"));
  }

  let checkPW = await bcrypt.compare(obj.password, user.password);
  if (!checkPW) return res.redirect("/login");

  req.session.userID = user.id;
  req.session.name = user.name;
  res.redirect("/");
}

io.on("connection", handleConnection);

function handleConnection(socket) {
  socket.join(socket.request.session.userId);
  //console.log(io.sockets.adapter.rooms);

  //uppdaterar användarens select element med options
  io.to(socket.id).emit("updateJoinableRooms", getArrayOfRooms());

  socket.on("chat", function (obj) {
    //om användaren inte är med i rummet ska chatten inte gå vidare
    if (!socket.rooms.has(obj.room)) return;

    let msg = socket.request.session.name + ": " + obj.input;

    logMsg(
      socket.request.session.name,
      socket.request.session.userID,
      obj.room,
      msg
    );

    io.to(obj.room).emit("chat", {
      msg,
      room: obj.room,
    });
  });

  socket.on("createRoomRequest", function (room) {
    if (doesRoomExist(room)) {
      io.to(socket.id).emit("creationDenied");
      return;
    }

    makeRoom(room);

    joinProcess(socket, room);
  });

  socket.on("joinRoomRequest", function (room) {
    if (socket.rooms.has(room)) {
      io.to(socket.id).emit("joinDenied");
      return;
    }

    joinProcess(socket, room);
  });

  socket.on("leaveRoom", function (room) {
    socket.leave(room);
    io.to(room).emit("chat", {
      msg: socket.request.session.name + " disconnected.",
      room: room,
    });

    logMsg(
      socket.request.session.name,
      socket.request.session.userID,
      room,
      socket.request.session.name + " disconnected."
    );

    let allRooms = getRooms();
    let connectedUsers = allRooms[room].users;
    connectedUsers = connectedUsers.filter((u) => u == socket.request.session.name);
    fs.writeFileSync("rooms.json", JSON.stringify(allRooms, null, 3));

    let users = JSON.stringify(fs.readFileSync("users.json").toString());
    let user = users.find((u) => u.name == socket.request.session.name);
    user.rooms.filter((r) => r == room);
    fs.writeFileSync("users.json", users);
  });

  socket.on("disconnect", function () {
    //notify when socket leaves a room or all rooms i guess
  });
}

function joinProcess(socket, room) {
  socket.join(room);

  io.to(socket.id).emit("joinApproved", sendChatFrame(room));

  let allRooms = getRooms();
  allRooms[room].users.push(socket.request.session.name);
  fs.writeFileSync("rooms.json", JSON.stringify(allRooms, null, 3));

  let users = JSON.parse(fs.readFileSync("users.json").toString());
  let user = users.find((u) => (u.id = socket.request.session.userID));
  user.rooms.push(room);
  fs.writeFileSync("users.json", JSON.stringify(users, null, 3));

  io.to(socket.id).emit("roomLogs", { room: room, logs: getRoomLogs(room) });

  io.to(room).emit("chat", {
    msg: socket.request.session.name + " has connected!",
    room: room,
  });
  logMsg(
    socket.request.session.name,
    socket.request.session.userID,
    room,
    socket.request.session.name + " has connected!"
  );
}

function doesRoomExist(room) {
  let allRooms = getRooms();
  let arr = Object.keys(allRooms);
  let check = arr.find((r) => r == room);
  if (check) {
    return true;
  } else {
    return false;
  }
}

function logMsg(name, id, room, msg) {
  let obj = { msg: msg, name: name, userID: id };
  let allRooms = getRooms();
  allRooms[room].logs.push(obj);

  //fs.writeFileSync("rooms.json", JSON.stringify(allRooms, null, 3));
}

function getRoomLogs(room) {
  let allRooms = getRooms();
  let logs = [];
  allRooms[room].logs.forEach((obj) => logs.push(obj.msg));
  return logs;
}

function getRooms() {
  return JSON.parse(fs.readFileSync("rooms.json").toString());
}

function makeRoom(room) {
  let allRooms = getRooms();

  allRooms[room] = { users: [], logs: [] };

  fs.writeFileSync("rooms.json", JSON.stringify(allRooms, null, 3));
}

function getArrayOfRooms() {
  let arr = [];

  let rooms = JSON.parse(fs.readFileSync("rooms.json").toString());

  arr = Object.keys(rooms);

  return arr;
}

function render(content, username) {
  let html = fs.readFileSync("template.html").toString();
  html = html.replace("--content--", content);
  if (username) {
    html = html.replace("--username--", username);
    html = html.replace("--scripts--", '<script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script><script src="client.js" defer></script>')
  }
  html = html.replace("--scripts--", "");
  return html;
}

function sendChatFrame(room) {
  let frame = fs.readFileSync("chatFrame.html").toString();
  frame = frame.replace("--room--", room);
  frame = frame.replace("--room--", room);

  return frame;
}
