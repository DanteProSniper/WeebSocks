const clientSocket = io();

//om jag vill se hela klient objektet
console.log(clientSocket);

//gör addeventlistener för den andra också
document
  .querySelectorAll(".chat button")
  .forEach((btn) => btn.addEventListener("click", handleInput));
document.querySelectorAll(".chat textarea").forEach((btn) =>
  btn.addEventListener("keyup", (event) => {
    if (event.key == "Enter" && event.shiftKey == false) handleInput(event);
  })
);
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

function sendMessage(msg, roomID) {
  clientSocket.emit("chat", msg, roomID);
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

  document
    .getElementById(obj.roomID)
    .querySelector(".chat > div:first-of-type")
    .appendChild(div);
}

clientSocket.on("con", function (msg) {
  console.log(msg);
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
      handleRoomCreation(event);
    }
  });

document.getElementById("rooms").addEventListener("change", (event) => {
  joinRoom(event);
});

function handleRoomCreation(event) {
  let value = document
    .getElementById("createRoom")
    .querySelector("input").value;
  if (!value) return;
  document.getElementById("createRoom").querySelector("input").value = "";
  console.log(value);
}

function joinRoom(event) {
  let value = document.getElementById("rooms").value;
  if (!value) return;
  document.getElementById("rooms").value = "";
  roomHTML(value);
  clientSocket.emit("join", value);
}

function roomHTML(ID) {
  /* Detta skapar rummets HTML och placerar det på sidan */
  let room = document.createElement("div");
  room.classList.add("chat");
  room.id = ID;

  let h2 = document.createElement("h2")
  h2.innerText = ID;

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

/* <div class="chat" id="global">
     <h2>GLOBAL</h2>
     <div>

     </div>
     <div>
         <textarea type="text" placeholder="Message"></textarea>
         <button>send</button>
     </div>  
   </div> */