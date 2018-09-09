var express = require("express");
var http = require("http");
var app = express();
var server = http.createServer(app).listen(3000);
var io = require("socket.io")(server);

app.use(express.static("http://app-c7e123d0-fe63-49b8-8047-eab30282183d.cleverapps.io/public"));

io.on("connection", function (socket) {
    socket.on("chat", function (message) {
        socket.broadcast.emit("message", message);
    });
    socket.emit("message", "Welcome to socket server");
});

console.log("Starting socket app on port 3000");