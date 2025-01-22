const express = require("express");
const app = express();

app.use(express.static("client"));

const {createServer} = require("http");
const {Server} = require("socket.io");

const server = createServer(app);
const io = new Server(server);

server.listen(3678);

app.get("/", (req, res)=>{
   
    res.sendFile(__dirname + "/chat.html");

});



io.on("connection", handleConnection);


function handleConnection(socket){

    console.log("A user connected, "+socket.id);

    io.emit("con", socket.id + " connected");


    socket.on("chat", function(msg){

        console.log(socket.id + ": " + msg);
        io.emit("chat", {id:socket.id, msg});

    });



}