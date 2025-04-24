# Dokumentation Chat Webbapplikation


## index.js

### Server start

``` js
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const escape = require("escape-html");
const app = express();
const fs = require("fs");

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
```

Först hämtar jag alla biblioteken som jag använder för appen. Sedan fixar jag en statisk folder som heter client som gör att klienten kan hämta css:en och javascripten. express.urlencoded gör att jag på ett smidigt sätt kan hantera data som skickas till servern med post metoden. Därefter sätter jag igång express-session på servern som gör det möjligt att hålla användare inloggade även om de laddar om sidan. Sen sätter jag igång servern tillsammans med socket.io och får den att använda sig av sessions middlewaret och lyssnar på en port.



### Routes

``` js
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
  let obj = { name: escape(req.body.name), password: escape(req.body.pw) };

  let users = JSON.parse(fs.readFileSync("users.json").toString());
  let user = users.find((u) => u.name == obj.name);

  if (user) return res.send(render("ERROR"));

  obj.id = "" + Date.now();
  obj.password = await bcrypt.hash(obj.password, 12);
  obj.rooms = [];
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
  let obj = { name: escape(req.body.name), password: escape(req.body.pw) };

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
```

Här har jag en route till min home page "/". Den checkar om användaren är inloggad och visar upp själva chatten. Om användaren inte är inloggad redirectas den till "/login" och där har jag en enkel inloggningsfunktion med bcrypts hashning och sessions. Det finns även en route till "/register" som har en enkel registrering med bcrypt och sessions. till sist har jag en logout route som tar bort den aktiva sessionen.

### Sätta igång WebSockets

``` js
io.on("connection", handleConnection);

function handleConnection(socket) {
  //uppdaterar användarens select element med options
  io.to(socket.id).emit("updateJoinableRooms", getArrayOfRooms());

  //skickar rummen som användaren är med i
  let users = JSON.parse(fs.readFileSync("users.json").toString());
  let user = users.find((u) => (u.id == socket.request.session.userID));
  user.rooms.forEach((room) => {

    socket.join(room);

    io.to(socket.id).emit("joinApproved", sendChatFrame(room));

    let allRooms = getRooms();
    allRooms[room].users.push(socket.request.session.name);
    fs.writeFileSync("rooms.json", JSON.stringify(allRooms, null, 3));

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
  });
}
```



### Socket events

### Funktioner


## client.js

### sätta igång socketen

### Events

### Funktioner


## JSON-filer

### rooms.json

### users.json


## CSS

### layout
(här är egentligen inget nytt på så vis, skriv bara kort)


## HTML

### template

### register

### login

### structure