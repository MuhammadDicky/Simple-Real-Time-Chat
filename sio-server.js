const express = require("express");
const http = require("http");
const app = express();
const port = 8080;
const server = http.createServer(app).listen(port);
const io = require("socket.io")(server);

app.use(express.static("./public"));

io.on("connection", function (socket) {
    socket.on("chat", function (message) {
        const broadcast = {
            message: message,
            date: Date(Date.now())
        };
        
        socket.broadcast.emit("message", broadcast);
    });

    socket.on("typing", function () {
        socket.broadcast.emit("ontype", "On typing...");
    });
});

console.log(`Starting socket app on port ${port}`);