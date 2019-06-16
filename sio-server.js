const express = require("express");
const http = require("http");
const app = express();
const port = 8081;
const server = http.createServer(app).listen(port);
const io = require("socket.io")(server);
const users = {};
var userArray = [];

app.use(express.static("./public"));

io.on("connection", function (socket) {

    socket.on("new-user", function(user) {
        Object.assign(users, user.user);
        userArray.push(user.data);

        socket.broadcast.emit("join-user", user.data);
    });

    socket.on("get-users", function(userId) {
        if (userArray.length > 0) {
            io.to(userId).emit("join-user", userArray);
        }
    });

    socket.on("chat", function (response) {
        const broadcast = {
            message: response.message,
            user: users[response.socketId].username,
            date: Date(Date.now())
        };
        
        socket.broadcast.emit("message", broadcast);
    });

    socket.on("typing", function (userId) {
        socket.broadcast.emit("on-type", { message:"On typing...", id:userId});
    });

    socket.on("stop-typing", function (userId) {
        socket.broadcast.emit("stop-type", userId);
    });

    socket.on('disconnect', function() {
        socket.broadcast.emit("user-left", socket.id);

        if (userArray.length > 0) {
            userArray = userArray.filter(function (obj) {
                if (obj.id !== socket.id) {
                    return obj;
                }
            });
        }
    });

});

console.log(`Starting socket app on port ${port}`);