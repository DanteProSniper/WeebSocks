const clientSocket = io();

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

clientSocket.on("joinDenied", function () {
  alert("You were not allowed to join room!");
});

clientSocket.on("roomLogs", function (obj) {
  obj.logs.forEach((msg) => {
    printMessage({ msg, room: obj.room });
  });
});


