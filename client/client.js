

const clientSocket = io();

//om jag vill se hela klient objektet
console.log(clientSocket);






document.querySelector("#sendBtn").addEventListener("click", handleInput);
document.querySelector("#input").addEventListener("keyup", event=>{


    console.log(event);
    if(event.keyCode == 13) handleInput();


})
function handleInput(event){

    let input = document.querySelector("#input").value.trim();

    if(!input) return

   sendMessage(input)
}



function sendMessage(msg){


    clientSocket.emit("chat", msg);

}


clientSocket.on("chat", function(obj){

    console.log(obj);

    printMessage(obj);

})

clientSocket.on("con", function(msg){
    console.log(msg);
})



function printMessage(obj){

    let div = document.createElement("div");
    let p = document.createElement("p");
    p.innerText = obj.msg;
    div.appendChild(p)

    document.querySelector(".chatContainer").appendChild(div);



}