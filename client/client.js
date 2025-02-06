const clientSocket = io();

//om jag vill se hela klient objektet
console.log(clientSocket);

//gör addeventlistener för den andr aockså
document
  .querySelectorAll(".sendBtn")
  .forEach((btn) => btn.addEventListener("click", handleInput));
document.querySelectorAll(".input").forEach((btn) =>
  btn.addEventListener("keyup", (event) => {
    if (event.keyCode == 13 && event.shiftKey == false) handleInput(event);
  })
);
function handleInput(event) {
  let roomID = event.srcElement.parentElement.parentElement.id;

  let input = document
    .getElementById(roomID)
    .querySelector(".input")
    .value.trim();

  if (!input) return;

  document.getElementById(roomID).querySelector(".input").value = "";

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
    .querySelector(".messageArea")
    .appendChild(div);
}

clientSocket.on("con", function (msg) {
  console.log(msg);
});


document.getElementById("createRoomBtn").addEventListener("click", (event) => {
  
} )