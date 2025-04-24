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

### hantera WebSockets

``` js
io.on("connection", handleConnection);

function handleConnection(socket) {
  
}
```

Jag låter servern vänta på att klienter kopplar sig. När en socket kopplar så kör jag funktionen handleConnection som innehåller all mina events.

### Socket events

#### "connection"

``` js
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
```

först skickar jag en array till klienten som innehåller alla rum som finns tillgängliga på servern, vilket gör att klienten kan uppdatera sina options i join room select listan. Sen skickar jag de rummen som användaren redan har gått med i och utför join-processen för alla av de rummen.

#### "chat"

``` js
socket.on("chat", function (obj) {
    //om användaren inte är med i rummet ska chatten inte gå vidare
    if (!socket.rooms.has(obj.room)) return;

    let msg = socket.request.session.name + ": " + obj.input;

    io.to(obj.room).emit("chat", {
      msg,
      room: obj.room,
    });

    logMsg(
      socket.request.session.name,
      socket.request.session.userID,
      obj.room,
      msg
    );
  });
```

när en klient socket skickar eventen "chat" så tar denna funktionen emot ett objekt med meddelande och rummet som det skickades i. Den processerar det och skickar vidare det till alla andra användare som är med i det rummet. slutligen så loggar den också meddelandet men den funktionen går jag igenom senare.

#### "createRoomRequest"

``` js
socket.on("createRoomRequest", function (room) {
    room = escape(room);
    
    if (doesRoomExist(room)) {
      io.to(socket.id).emit("creationDenied");
      return;
    }

    makeRoom(room);

    io.emit("updateJoinableRooms", getArrayOfRooms());

    joinProcess(socket, room);
  });
```

Här får servern ett event som innebär att en klient har gjort en förfrågan om att skapa ett rum med ett specifikt id. Om rummet inte ännu är skapat så skapar servern rummet och meddelar klienten att den har gått med i rummet samt meddelar alla klienter om att det finns ett nytt rum så att de uppdaterar sin lista med rum. Om det redan finns så säger servern till klienten att dens förfrågan inte gick igenom.

#### "joinRoomRequest"

``` js
socket.on("joinRoomRequest", function (room) {
    if (socket.rooms.has(room)) {
      io.to(socket.id).emit("joinDenied");
      return;
    }

    joinProcess(socket, room);
  });
```

Här ber en socket om att gå med i ett rum. Om den redan är med i rummet säger servern det till klienten. Om den inte är med så körs funktionen joinprocess som fixar så att socketen går med i rummet och säger det till klienten.

#### "leaveRoom"

``` js
socket.on("leaveRoom", function (room) {
    if (!socket.request.session.userID) return;
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
    allRooms[room].users = connectedUsers.filter((u) => u != socket.request.session.name);
    fs.writeFileSync("rooms.json", JSON.stringify(allRooms, null, 3));

    let users = JSON.parse(fs.readFileSync("users.json").toString());
    let user = users.find((u) => u.id == socket.request.session.userID);
    user.rooms = user.rooms.filter((r) => r != room);
    fs.writeFileSync("users.json", JSON.stringify(users, null, 3));
  });
```

Här är det en klient som lämnar ett rum. Den körs bara om det finns ett session id för utan det kan jag inte hitta usern. Först lämnar klienten rummet i socketios system. Sen säger servern till alla andra som är med i rummet att den kopplade från sig. Sen loggas det meddelandet och JSON-filerna uppdateras med att en socket har kopplat bort sig.

#### "disconnect"

``` js
socket.on("disconnect", function () {
    //säger till alla rum som användaren var med i att den har kopplat från
    let users = JSON.parse(fs.readFileSync("users.json").toString());
    let user = users.find((u) => u.id == socket.request.session.userID);
    user.rooms.forEach((room) => {
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
    });

    //tar bort denna användare från alla rum den kan ha varit med i
    let allRooms = JSON.parse(fs.readFileSync("rooms.json").toString());
    Object.keys(allRooms).forEach((room) => {
      allRooms[room].users = allRooms[room].users.filter((name) => name != socket.request.session.name);
      fs.writeFileSync("rooms.json", JSON.stringify(allRooms, null, 3));
    })
  });
```

här hanterar jag eventet att en socket disconnectar, alltså att användaren kanske stänger ner fönstret eller förlorar nätverkskoppling. Först säger servern till alla användare som är med i samma rum som den som kopplade bort sig var med i att den har lämnat och loggar de meddelanden. Till slut uppdaterar jag rooms.json filen genom att ta bort användar-id:t från de rum som den var med i.


### Funktioner

#### joinProcess

``` js
function joinProcess(socket, room) {
  if (!socket.request.session.userID) return;
  socket.join(room);

  io.to(socket.id).emit("joinApproved", sendChatFrame(room));

  let allRooms = getRooms();
  allRooms[room].users.push(socket.request.session.name);
  fs.writeFileSync("rooms.json", JSON.stringify(allRooms, null, 3));

  let users = JSON.parse(fs.readFileSync("users.json").toString());
  let user = users.find((u) => (u.id == socket.request.session.userID));
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
```

Denna funktionen hanterar en socket som går med i ett rum. Den måste ha ett session id för att gå med i rum och om den har det så kör jag socket.join(room) för att den ska vara med i rummet i socket.io. Sen meddelar jag socketen att den fick joina, lägger till användaren i rooms.json och rummet i users.json, skickar rummets logs till klienten så att den kan rendera meddelandehistoriken, meddelar rummet att en ny klient har gått med och till sist loggar meddelandet.

#### doesRoomExist

``` js
function doesRoomExist(room) {
  let allRooms = getRooms();
  let arr = Object.keys(allRooms);
  let check = arr.find((r) => r == room);
  if (check) {
    return true;
  } else {
    return false;
  }
};
```

Denna funktionen kollar kort och gott om rummet som användaren vill skapa redan existerar i JSON-filen.

#### logMsg

``` js
function logMsg(name, id, room, msg) {
  let obj = { msg: msg, name: name, userID: id };
  let allRooms = getRooms();
  allRooms[room].logs.push(obj);

  fs.writeFileSync("rooms.json", JSON.stringify(allRooms, null, 3));
}
```

Denna funktionen lägger till ett meddelande i JSON-filen rooms.json.

#### getRoomLogs

``` js
function getRoomLogs(room) {
  let allRooms = getRooms();
  let logs = [];
  allRooms[room].logs.forEach((obj) => logs.push(obj.msg));
  return logs;
}
```

denna funktionen hämtar en array med alla meddelanden som har skickats i ett rum.

#### getRooms

``` js
function getRooms() {
  return JSON.parse(fs.readFileSync("rooms.json").toString());
}
```

Hämtar hela rooms.json filen, som är ett objekt.

#### makeRoom

``` js
function makeRoom(room) {
  let allRooms = getRooms();

  allRooms[room] = { users: [], logs: [] };

  fs.writeFileSync("rooms.json", JSON.stringify(allRooms, null, 3));
}
```

Lägger till ett nytt rum i rooms.json.

#### getArrayOfRooms

``` js
function getArrayOfRooms() {
  let arr = [];

  let rooms = JSON.parse(fs.readFileSync("rooms.json").toString());

  arr = Object.keys(rooms);

  return arr;
}
```

Läser in rooms.json och låter variabeln "arr" bli en array av alla namn på rummen. Det gjorde med hjälp av metoden Object.keys() som ger en array av alla keys i ett objekt.

#### render

``` js
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
```

Tar emot content och placerar det i en HTML template som sedan skickas till klienten. Om användaren är inloggad tar den även emot ett username som gör att servern även skickar med script taggar och ger ett lite dynamiskt aspekt med ett username som visas på sidan beroende på vem som är inloggad.

#### sendChatFrame

``` js
function sendChatFrame(room) {
  let frame = fs.readFileSync("chatFrame.html").toString();
  frame = frame.replace("--room--", room);
  frame = frame.replace("--room--", room);

  return frame;
}
```

Denna funktionen tar emot ett rum som ska få en html struktur. Den läser in den grundläggande strukturen och ändrar id:t och rubriken till rummets namn och skickas sedan vidare till klienten.


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