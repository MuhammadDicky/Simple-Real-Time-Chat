var express = require("express");
var http = require("http");
var app = express();
var server = http.createServer(app).listen(8080);
var io = require("socket.io")(server);

app.use(express.static("./public"));

io.on("connection", function (socket) {
    socket.on("chat", function (message) {
        var timeStamp = Date(Date.now());
        var message = {
            message: message,
            date: timeStamp
        };
        socket.broadcast.emit("message", message);
    });

    socket.on("typing", function () {
        socket.broadcast.emit("ontype", "On typing...");
    });
});

console.log("Starting socket app on port 3000");