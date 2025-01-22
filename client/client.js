

const clientSocket = io();

console.log(clientSocket);



function sendMessage(msg){


    clientSocket.emit("chat", msg);

}


clientSocket.on("chat", function(obj){

    console.log(obj);

})

clientSocket.on("con", function(msg){
    console.log(msg);
})