const clientSocket = io();

clientSocket.on("updateUserID", function (userID) {
  document.querySelector(".displayUserID").innerText = userID;
});

clientSocket.on("updateJoinableRooms", function (array) {
  let optionElements = document.getElementById("joinRoom").querySelectorAll("option");
  let optionValues = [];

  optionElements.forEach(element => {
    optionValues.push(element.value);
  });

  array.forEach(room => {
    if (!optionValues.find((opt) => opt == room)) {
      let option = document.createElement("option");
      option.value = room;
      option.innerText = room;
      document.getElementById("rooms").appendChild(option);
    };
  });
});

clientSocket.on("roomLogs", function (obj) {
  obj.logs.forEach(msg => {
    printMessage({ msg, room: obj.room })
  });
});

document.querySelector(".chat button").addEventListener("click", handleInput);
document.querySelector(".chat textarea").addEventListener("keyup", (event) => {
  if (event.key == "Enter" && event.shiftKey == false) handleInput(event);
});

function handleInput(event) {
  let room = event.srcElement.parentElement.parentElement.id;

  let input = document
    .getElementById(room)
    .querySelector(".chat textarea")
    .value.trim();

  if (!input) return;

  document.getElementById(room).querySelector(".chat textarea").value = "";

  // skickar meddelandet till servern
  clientSocket.emit("chat", { input, room });
}

clientSocket.on("chat", function (obj) {
  printMessage(obj);

});

function printMessage(obj) {
  let div = document.createElement("div");
  let p = document.createElement("p");
  p.innerText = obj.msg;
  div.appendChild(p);

  let msgArea = document
    .getElementById(obj.room)
    .querySelector("div");
  msgArea.appendChild(div);

  msgArea.scrollTop = msgArea.scrollHeight;
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
      handleRoomCreation();
    }
  });

function handleRoomCreation() {
  let room = document
    .getElementById("createRoom")
    .querySelector("input")
    .value.trim();
  if (!room) return;
  document.getElementById("createRoom").querySelector("input").value = "";
  clientSocket.emit("createRoomRequest", room);
}

clientSocket.on("creationDenied", function () {
  alert("room creation was denied!");
});

document.getElementById("rooms").addEventListener("change", joinRoom);

function joinRoom() {
  let room = document.getElementById("rooms").value;
  if (!room) return;
  document.getElementById("rooms").value = "";
  
  clientSocket.emit("joinRoomRequest", room);
};

clientSocket.on("joinApproved", function (room) {
  addRoomToHTML(room);
});

clientSocket.on("joinDenied", function () {
  alert("You were not allowed to join room!");
});

function addRoomToHTML(roomID) {
  /* Detta skapar rummets HTML och placerar det på sidan */
  let HTML = document.createElement("div");
  HTML.classList.add("chat");
  HTML.id = roomID;

  let h2 = document.createElement("h2");
  h2.innerText = roomID;

  HTML.appendChild(h2);

  HTML.appendChild(document.createElement("div"));

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

  HTML.appendChild(inputArea);

  document.querySelector(".allChatContainer").appendChild(HTML);
}
