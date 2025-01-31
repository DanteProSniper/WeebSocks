

const clientSocket = io();

//om jag vill se hela klient objektet
console.log(clientSocket);





//gör addeventlistener för den andr aockså
document.querySelectorAll(".sendBtn").forEach(btn=>btn.addEventListener("click", handleInput));
document.querySelectorAll(".input").forEach(btn=>btn.addEventListener("keyup", event=>{


    
    if(event.keyCode == 13 && event.shiftKey == false) handleInput();


}))
function handleInput(event){

    console.log(event.srcElement.parentElement.parentElement);

    let input = document.querySelector(".input").value.trim();
    
    if(!input) return

    document.querySelector(".input").value = "";

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

    document.querySelector(".messageArea").appendChild(div);



}