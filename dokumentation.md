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

``` js
const clientSocket = io();
```

Denna raden sätter igång socket.io på klientens sida.

### Events

#### "updateJoinableRooms"

``` js
clientSocket.on("updateJoinableRooms", function (array) {
  let optionElements = document
    .getElementById("joinRoom")
    .querySelectorAll("option");
  let optionValues = [];

  optionElements.forEach((element) => {
    optionValues.push(element.value);
  });

  array.forEach((room) => {
    if (!optionValues.find((opt) => opt == room)) {
      let option = document.createElement("option");
      option.value = room;
      option.innerText = room;
      document.getElementById("rooms").appendChild(option);
    }
  });
});
```

Tar emot en array av rummen som finns på servern och placerar de i ett select element som options.

#### "chat"

``` js
clientSocket.on("chat", function (obj) {
  printMessage(obj);
});
```

När klienten tar emot eventet "chat" så tas det emot ett objekt med meddelandet och funktionen printmessage körs.

#### "creationDenied"

``` js
clientSocket.on("creationDenied", function () {
  alert("room creation was denied!");
});
```

Om klienten inte fick skapa ett rum så får den detta eventet.

#### "joinApproved"

``` js
clientSocket.on("joinApproved", function (stringHTML) {
  let temp = document.createElement("div");
  temp.innerHTML = stringHTML;
  let chatFrame = temp.firstChild;
  let order = document.querySelector(".allChatContainer").childElementCount + 1;
  chatFrame.style = "order: " + order + ";";
  document.querySelector(".allChatContainer").appendChild(chatFrame);
  

  let room = chatFrame.id;
  document
    .getElementById(room)
    .querySelector(".sendBtn")
    .addEventListener("click", handleInput);
  document
    .getElementById(room)
    .querySelector(".inputBox textarea")
    .addEventListener("keyup", (event) => {
      if (event.key == "Enter" && event.shiftKey == false) handleInput(event);
    });
  document
    .getElementById(room)
    .querySelector(".leaveBtn")
    .addEventListener("click", (event) => leaveRoom(event));
  document
    .getElementById(room)
    .querySelector(".moveLeft")
    .addEventListener("click", (event) => moveRoom(event));
  document
    .getElementById(room)
    .querySelector(".moveRight")
    .addEventListener("click", (event) => moveRoom(event));

});
```

Detta körs när klienten får klartecken att gå med i ett rum. Klienten tar emot HTML i sträng format. Den ändrar strängen till en HTML node och placerar den på sidan. Till sist lägger klienten till eventlisteners på den nya chatten.

#### "joinDenied"

``` js
clientSocket.on("joinDenied", function () {
  alert("You were not allowed to join room!");
});
```

Händer när klienten inte får gå med i ett rum.

#### "roomLogs"

``` js
clientSocket.on("roomLogs", function (obj) {
  obj.logs.forEach((msg) => {
    printMessage({ msg, room: obj.room });
  });
});
```

Tar emot logsen i ett rum och går igenom och kör funktionen printMessage för varje meddelande.

### Funktioner

#### moveRoom

``` js
function moveRoom(event) {
  //tar fram vilket ordningsnummer detta elementet ligger på
  let thisOrder =
    event.srcElement.parentElement.parentElement.parentElement.style.order;

  //kollar om det ska vänster och om det är längst till vänster
  if (event.srcElement.classList.contains("moveLeft") && thisOrder != 1) {
    //hämtar elementet som klickades på
    let thisElement =
      event.srcElement.parentElement.parentElement.parentElement;

    //hämtar elementet som ska byta plats
    let otherElement = "";
    document.querySelectorAll(".chat").forEach((element) => {
      if (element.style.order == thisOrder - 1) {
        otherElement = element;
      }
    });

    //byter ut deras ordernummer
    thisElement.style.order = thisOrder - 1;
    otherElement.style.order = thisOrder;
  }
  //kollar om det ska till höger och om det är längst till höger
  else if (
    !event.srcElement.classList.contains("moveLeft") &&
    document.querySelector(".allChatContainer").childElementCount != thisOrder
  ) {
    //hämtar elementet som klickades på
    let thisElement =
      event.srcElement.parentElement.parentElement.parentElement;

    //hämtar elementet som ska byta plats
    let otherElement = "";
    document.querySelectorAll(".chat").forEach((element) => {
      if (element.style.order == Number(thisOrder) + 1) {
        otherElement = element;
      }
    });

    //byter ut deras ordernummer
    thisElement.style.order = Number(thisOrder) + 1;
    otherElement.style.order = thisOrder;
  }
}
```

Denna funktionen tar hand om att ändra ordningen som rummen visas upp på i webbsidan. Den körs när användaren trycker på pilarna. Först tar jag reda på vilket ordningsnummer som trycktes på, vilket håll det ska flyttas, tar reda på respektive ordningsnummer den ska till och till sist antingen minskar eller ökar det valda ordningsnumret med 1 och gör motsatt med den som ska bytas med.

#### printMessage

``` js
function printMessage(obj) {
  let div = document.createElement("div");
  let p = document.createElement("p");
  p.innerText = obj.msg;
  div.appendChild(p);

  let msgArea = document.getElementById(obj.room).querySelector(".msgBox");
  msgArea.appendChild(div);

  msgArea.scrollTop = msgArea.scrollHeight;
}
```

Denna funktion tar emot ett meddelande och paketerar det i lite html och placerar det på sin plats i webbsidan beroende på rummets id.

#### handleRoomCreation

``` js
function handleRoomCreation() {
  let room = document
    .getElementById("createRoom")
    .querySelector("input")
    .value.trim();
  if (room.length > 12) return alert("Too many characters!");
  if (!room) return;
  document.getElementById("createRoom").querySelector("input").value = "";
  clientSocket.emit("createRoomRequest", room);
}
```

Denna tar hand om att göra en request till servern att skapa ett rum. Först tar en värdet som var input i create room input elementet. sen kollar den om det är för långt eller tomt och avbryter. om den passerar checkarna så gör den en förfrågan till servern med socket.io eventet "createRoomRequest".

#### joinRoom

``` js
function joinRoom() {
  let room = document.getElementById("rooms").value;
  if (!room) return;
  document.getElementById("rooms").value = "";

  clientSocket.emit("joinRoomRequest", room);
}
```

Tar hand om när användaren ändrar på select elementet och vill gå med i ett rum. Den tar fram det valda värdet och skickar en request till servern.

#### handleInput

``` js
function handleInput(event) {
  let room = event.srcElement.parentElement.parentElement.id;

  let input = document
    .getElementById(room)
    .querySelector(".inputBox textarea")
    .value.trim();

  if (!input) return;

  document.getElementById(room).querySelector(".inputBox textarea").value = "";

  // skickar meddelandet till servern
  clientSocket.emit("chat", { input, room });
}
```

Körs när användaren skickar en chat i ett av rummen. Tar fram meddelandet, vilket rum det skickades i och skickar det vidare till servern.

#### leaveRoom

``` js
function leaveRoom(event) {
  let room = event.srcElement.parentElement.parentElement.id;
  document.getElementById(room).remove();
  clientSocket.emit("leaveRoom", room);
}
```

Säger till servern att denna socketen lämnar ett rum.

### en eventListener

``` js
document
  .getElementById("createRoom")
  .querySelector("input")
  .addEventListener("keyup", (event) => {
    if (event.key == "Enter" && event.shiftKey == false) {
      handleRoomCreation();
    }
  });
```

Här lägger jag till en eventlistener på ett input element. Speciellt med denna var att den tar med eventet och kollar om tangenten var "Enter" och att shift tangenten inte var nedtryckt.

## JSON-filer

### rooms.json

``` json
{
   "global": {
      "users": [
         "dante"
      ],
      "logs": [
         {
            "msg": "g has connected!",
            "name": "g",
            "userID": "1744306701613"
         }
      ]
   },
   "room 1": {
      "users": [
         "user1",
         "anotherUser"
      ],
      "logs": []
   }
}
```

Här är strukturen på filen rooms.json. Det är ett stort objekt som innehåller rummens namn som keys i objektet och de keysen innehåller i sin tur ett objekt med användare och logs. Användarna sparas som en array med användarnamnen. logsen sparas som en array. arrayen innehåller objekt med meddelandet, vem som skrev det och användarens id.

### users.json

``` json
[
   {
      "name": "g",
      "password": "$2b$12$mq./6L0YppJlyAWNH76iI.vXQn.uBrY67oTRl1gbk4K8uK0no5fjW",
      "id": "1744306701613",
      "rooms": [
         "pingpong"
      ]
   },
   {
      "name": "dante",
      "password": "$2b$12$LjQYBzucTPERqIpvBRXtfe6TXeHOZy2mScDlKsf6WovO0bjrghlyu",
      "id": "1744307236877",
      "rooms": [
         "global"
      ]
   }
]
```

Filen users.json:s struktur. En array med alla användare. Varje användare representeras som ett objekt med namn, hashat lösenord, id och rum som användaren är med i. Rummen sparas som en array med rummens id.

## CSS

``` css
* {
  font-family: system-ui;
}

header {
  height: 200px;
  display: grid;
  place-content: center;
  background-color: #14213d;
}

h1 {
  color: #e5e5e5;
}

/* css för rum creation och joining */
.manage {
  display: grid;
  grid-template-columns: repeat(3, max-content);
  justify-content: space-evenly;
  padding-block: 7px;
  border: 2px solid #e5e5e5;
}

#joinRoom {
  display: grid;
  grid-template-columns: 1fr max-content;
  gap: 15px;
}

.manage > div:last-of-type {
  display: grid;
  grid-template-columns: repeat(3, max-content);
  gap: 1rem;
}

.manage p {
  margin: 0;
}

.logout {
  margin-left: 15px;
}

.allChatContainer {
  display: grid;
  grid: auto / repeat(auto-fit, minmax(333px, 1fr));
  gap: 15px;
}

/* Chatruta css */
.chat {
  display: grid;

  align-items: end;
  grid-template-rows: min-content 400px auto;
}

.chatHeader {
  display: grid;
  grid-template-areas: "a";
}

.chatHeader > * {
  grid-area: a;
}

.moveChat {
  place-self: center start;
  margin-left: 15px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
}

.moveChat button {
  font-size: 1.5rem;
}

.chatHeader h2 {
  justify-self: center;
}

.leaveBtn {
  place-self: center end;
  margin-right: 15px;
}

.msgBox {
  height: 100%;
  align-content: end;
  border: 2px solid #fca311;
  margin-block: 2px;
  border-radius: 0 0 10px 10px;
  overflow-y: scroll;
  padding-inline: 8px;
}

.inputBox {
  display: grid;
  grid-template-columns: auto min-content;
  gap: 5px;
}

.inputBox textarea {
  resize: none;
  overflow: hidden;
}

.sendBtn {
  padding-inline: 30px;
}

.login {
  place-items: center;
}

form {
  padding-bottom: 30px;
}
```

Mycket enkel css som är mestadels likadan som mina förra projekt. Jag användet mig mycket av grids igen för att skapa en okej layout på hemsidan.

## HTML

### template

``` html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat</title>
    --scripts--
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <header>
        <h1>My Chat</h1>
    </header>
    
    --content--


</body>
</html>
```

Används i min render funktion där jag ersätter "--scripts--" med antingen tom sträng eller script taggarna beroende på om användaren är inloggad. Detta är för att jag inte vill att användaren ska starta upp socket.io script utan att vara inloggad. jag ersätter "--content--" med det som skickas in i render funktionen.

### register

``` html
<div class="login">
    <h3>REGISTER</h3>
    <form action="/register" method="post">
        <input type="text" name="name" placeholder="name">
        <input type="password" name="pw" placeholder="password">
        <input type="submit" value="register">
    </form>
    <a href="/login">haru konto? logga in här</a>
</div>
```

Ett enkelt formulär som tar skickar iväg information till servern med POST metoden. Den skickar namn och lösenord.

### login

``` html
<div class="login">
    <h3>LOGIN</h3>
    <form action="/login" method="post">
        <input type="text" name="name" placeholder="name">
        <input type="password" name="pw" placeholder="password">
        <input type="submit" value="login">
    </form>
    <a href="/register">haru inget konto? registrera här</a>
</div>
```

Ännu ett enkelt formulär som skickar namn och lösenord till servern med POST metoden.

### structure

``` html
<div class="manage">
    <div id="createRoom">
        <input type="text" name="createdRoom" placeholder="Room name">
        <button type="button">Create Room</button>
    </div>

    <div id="joinRoom">
        <select name="rooms" id="rooms">
            <option value="">Join room</option>
        </select>
    </div>
    <div>
        <p>Connected as:</p>
        <p class="username">--username--</p>
        <a href="/logout" class="logout">log out</a>
    </div>
</div>
<div class="allChatContainer">

</div>
```

Detta är strukturen för hur chattsidan ser ut. Den har en div med klassen "manage" som innehåller allting som har med att skapa rum, joina rum och logga ut. Den har och en div med klassen "allChatContainer" som kommer att innehålla alla chattar som användaren är med i.

### chatFrame

``` html
<div class="chat" id="--room--">
    <div class="chatHeader">
        <div class="moveChat">
            <button class="moveLeft">&larr;</button>
            <button class="moveRight">&rarr;</button>
        </div>
        <h2>--room--</h2>
        <button class="leaveBtn">leave</button>
    </div>
    <div class="msgBox">

    </div>
    <div class="inputBox">
        <textarea placeholder="Message"></textarea>
        <button class="sendBtn">send</button>
    </div>  
</div>
```

Så här ser en chattruta ut med alla knappar, id och input. Jag ersätter "--room--" med rummets id innan skickas till klienten.

# End of documentation