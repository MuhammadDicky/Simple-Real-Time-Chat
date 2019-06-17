const express = require("express");
const http = require("http");
const app = express();
const port = 8081;
const server = http.createServer(app).listen(port);
const io = require("socket.io")(server);
const uuidv1 = require("uuid/v1");
const uuid = require("uuid/v3");
const users = {};
var userArray = [];

app.use(express.static("./public"));

io.on("connection", function (socket) {

    socket.on("new-user", function(user) {
        const id = user.data.id;
        const userId = uuid(id, uuidv1());
        user.user[socket.id].userId = userId;
        user.data.userId = user.data.userId? user.data.userId:userId;

        Object.assign(users, user.user);
        userArray.push(user.data);

        // Broadcast new join user
        socket.broadcast.emit("join-user", user.data);

        // send back user id
        io.to(id).emit("success-join", user.data.userId);
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
            date: response.date? response.date:Date(Date.now())
        };
        
        socket.broadcast.emit("message", broadcast);
    });

    socket.on("typing", function (userId) {
        socket.broadcast.emit("on-type", { message:"On typing...", id:userId});
    });

    socket.on("stop-typing", function (userId) {
        socket.broadcast.emit("stop-type", userId);
    });

    socket.on('sign-out', function() {
        signOutUser(socket);
    });

    socket.on('disconnect', function() {
        signOutUser(socket);
    });

});

function signOutUser(socket) {
    if (userArray.length > 0) {
        userArray = userArray.filter(function (obj) {
            if (obj.id !== socket.id) {
                return obj;
            } else {
                socket.broadcast.emit("user-left", users[obj.id].userId);
            }
        });
    }
}

console.log(`Starting socket app on port ${port}`);