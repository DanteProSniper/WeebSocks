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

  // skickar meddelandet till servern
  clientSocket.emit("chat", { input, roomID });
}

clientSocket.on("chat", function (obj) {
  printMessage(obj);
});

function printMessage(obj) {
  let div = document.createElement("div");
  let p = document.createElement("p");
  p.innerText = obj.id + ": " + obj.msg;
  div.appendChild(p);

  let msgArea = document
    .getElementById(obj.roomID)
    .querySelector(".chat > div:first-of-type");
  msgArea.appendChild(div);

  msgArea.scrollTop = msgArea.scrollHeight;
}

clientSocket.on("con", function (newCon) {
  // en ny användare går med i ett rum
  if (newCon.id == clientSocket.id) return;
  let obj = { msg: newCon.id + " has connected!", roomID: newCon.roomID };
  printMessage(obj);
});

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
      handleRoomCreation();
    }
  });

function handleRoomCreation() {
  let roomID = document
    .getElementById("createRoom")
    .querySelector("input")
    .value.trim();
  if (!roomID) return;
  document.getElementById("createRoom").querySelector("input").value = "";
  clientSocket.emit("createRoomRequest", roomID);
}

clientSocket.on("creationApproved", function (roomID) {
  roomHTML(roomID);
});

clientSocket.on("creationDenied", function () {
  alert("room creation was denied!");
});

clientSocket.on("roomCreated", function (roomID) {
  let option = document.createElement("option");
  option.value = roomID;
  option.innerText = roomID;
  document.getElementById("rooms").appendChild(option);
});

document.getElementById("rooms").addEventListener("change", joinRoom);

function joinRoom() {
  let roomID = document.getElementById("rooms").value;
  if (!roomID) return;
  document.getElementById("rooms").value = "";
  roomHTML(roomID);
  clientSocket.emit("JoinRoom", roomID);
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
