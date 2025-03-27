const clientSocket = io();

clientSocket.on("updateUserID", function (userID) {
  document.querySelector(".displayUserID").innerText = userID;
});

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

clientSocket.on("roomLogs", function (obj) {
  obj.logs.forEach((msg) => {
    printMessage({ msg, room: obj.room });
  });
});

document.querySelector(".sendBtn").addEventListener("click", handleInput);
document
  .querySelector(".inputBox textarea")
  .addEventListener("keyup", (event) => {
    if (event.key == "Enter" && event.shiftKey == false) handleInput(event);
  });
document
  .querySelector(".leaveBtn")
  .addEventListener("click", (event) => leaveRoom(event));
document
  .querySelector(".moveLeft")
  .addEventListener("click", (event) => moveRoom(event));
document
  .querySelector(".moveRight")
  .addEventListener("click", (event) => moveRoom(event));

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

function leaveRoom(event) {
  let room = event.srcElement.parentElement.parentElement.id;
  document.getElementById(room).remove();
  clientSocket.emit("leaveRoom", room);
}

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

  //document.querySelector(".allChatContainer").childElementCount
  //document.querySelector('[order="1"]')
}

clientSocket.on("chat", function (obj) {
  printMessage(obj);
});

function printMessage(obj) {
  let div = document.createElement("div");
  let p = document.createElement("p");
  p.innerText = obj.msg;
  div.appendChild(p);

  let msgArea = document.getElementById(obj.room).querySelector(".msgBox");
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
}

clientSocket.on("joinApproved", function (room) {
  addRoomToHTML(room);
});

clientSocket.on("joinDenied", function () {
  alert("You were not allowed to join room!");
});

function addRoomToHTML(roomID) {
  /* Detta skapar rummets HTML och placerar det på sidan */
  let chat = document.createElement("div");
  chat.classList.add("chat");
  chat.id = roomID;

  let chatHeader = document.createElement("div");
  chatHeader.classList.add("chatHeader");

  let moveChat = document.createElement("div");
  moveChat.classList.add("moveChat");

  let moveLeft = document.createElement("button");
  moveLeft.innerText = "←";
  moveLeft.classList.add("moveLeft");
  moveLeft.addEventListener("click", (event) => moveRoom(event));

  let moveRight = document.createElement("button");
  moveRight.innerText = "→";
  moveRight.classList.add("moveRight");
  moveRight.addEventListener("click", (event) => moveRoom(event));

  moveChat.appendChild(moveLeft);
  moveChat.appendChild(moveRight);

  let h2 = document.createElement("h2");
  h2.innerText = roomID;

  let leaveBtn = document.createElement("button");
  leaveBtn.classList.add("leaveBtn");
  leaveBtn.innerText = "leave";
  leaveBtn.addEventListener("click", (event) => leaveRoom(event));

  chatHeader.appendChild(moveChat);
  chatHeader.appendChild(h2);
  chatHeader.appendChild(leaveBtn);

  chat.appendChild(chatHeader);

  let msgBox = document.createElement("div");
  msgBox.classList.add("msgBox");

  chat.appendChild(msgBox);

  let inputBox = document.createElement("div");
  inputBox.classList.add("inputBox");

  let textarea = document.createElement("textarea");
  textarea.placeholder = "Message";
  textarea.addEventListener("keyup", (event) => {
    if (event.key == "Enter" && event.shiftKey == false) handleInput(event);
  });

  let sendBtn = document.createElement("button");
  sendBtn.classList.add("sendBtn");
  sendBtn.innerText = "send";
  sendBtn.addEventListener("click", handleInput);

  inputBox.appendChild(textarea);
  inputBox.appendChild(sendBtn);

  chat.appendChild(inputBox);

  let order = document.querySelector(".allChatContainer").childElementCount + 1;
  chat.style = "order: " + order + ";";

  document.querySelector(".allChatContainer").appendChild(chat);
}
