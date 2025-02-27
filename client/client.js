const clientSocket = io();

//om jag vill se hela klient objektet
//console.log(clientSocket);

document.querySelector(".chat button").addEventListener("click", handleInput);
document.querySelector(".chat textarea").addEventListener("keyup", (event) => {
  if (event.key == "Enter" && event.shiftKey == false) handleInput(event);
});

function handleInput(event) {
  let roomID = event.srcElement.parentElement.parentElement.id;

  let input = document
    .getElementById(roomID)
    .querySelector(".chat textarea")
    .value.trim();

  if (!input) return;

  document.getElementById(roomID).querySelector(".chat textarea").value = "";

  sendMessage(input, roomID);
}

function sendMessage(input, roomID) {
  let msg = { input, roomID };
  clientSocket.emit("chat", msg);
}

clientSocket.on("chat", function (obj) {
  console.log(obj);

  printMessage(obj);
});

function printMessage(obj) {
  let div = document.createElement("div");
  let p = document.createElement("p");
  p.innerText = obj.msg;
  div.appendChild(p);

  let msgArea = document
    .getElementById(obj.roomID)
    .querySelector(".chat > div:first-of-type");

  msgArea.appendChild(div);

  msgArea.scrollTop = msgArea.scrollHeight;
}

clientSocket.on("con", function (newCon) {
  newUserJoinRoom(newCon);
});

function newUserJoinRoom(newCon) {
  if (newCon.id == clientSocket.id) return;
  let obj = { msg: newCon.id + " has connected!", roomID: newCon.roomID };
  printMessage(obj);
}

document
  .getElementById("createRoom")
  .querySelector("button")
  .addEventListener("click", (event) => {
    handleRoomCreation(event);
  });

document
  .getElementById("createRoom")
  .querySelector("input")
  .addEventListener("keyup", (event) => {
    if (event.key == "Enter" && event.shiftKey == false) {
      handleRoomCreation(event);
    }
  });

function handleRoomCreation(event) {
  let value = document
    .getElementById("createRoom")
    .querySelector("input").value;
  if (!value) return;
  document.getElementById("createRoom").querySelector("input").value = "";
  console.log(value);
}

document.getElementById("rooms").addEventListener("change", joinRoom);

function joinRoom() {
  let roomID = document.getElementById("rooms").value;
  if (!roomID) return;
  document.getElementById("rooms").value = "";
  roomHTML(roomID);
  clientSocket.emit("join", roomID);
}

function roomHTML(roomID) {
  /* Detta skapar rummets HTML och placerar det på sidan */
  let room = document.createElement("div");
  room.classList.add("chat");
  room.id = roomID;

  let h2 = document.createElement("h2");
  h2.innerText = roomID;

  room.appendChild(h2);

  room.appendChild(document.createElement("div"));

  let inputArea = document.createElement("div");

  let textarea = document.createElement("textarea");
  textarea.placeholder = "Message";
  textarea.addEventListener("keyup", (event) => {
    if (event.key == "Enter" && event.shiftKey == false) handleInput(event);
  });

  let button = document.createElement("button");
  button.innerText = "send";
  button.addEventListener("click", handleInput);

  inputArea.appendChild(textarea);
  inputArea.appendChild(button);

  room.appendChild(inputArea);

  document.querySelector(".allChatContainer").appendChild(room);
}
