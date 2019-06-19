const express = require("express");
const http = require("http");
const app = express();
const port = process.env.PORT || 8081;
const server = http.createServer(app).listen(port);
const io = require("socket.io")(server);
const uuidv1 = require("uuid/v1");
const uuid = require("uuid/v3");
const users = {};
var userArray = [];
const userAvatars = [
    "./assets/img/user-image.png",
    "./assets/img/user-image2.png",
    "./assets/img/user-image3.png",
    "./assets/img/user-image4.png",
    "./assets/img/user-image5.png",
    "./assets/img/user-image6.png",
    "./assets/img/user-image7.png",
    "./assets/img/user-image8.png"
];

app.use(express.static("./public"));

io.on("connection", function (socket) {

    socket.on("new-user", function(user) {
        checkUsername(user.data.username, function(status) {
            const id = user.data.id;

            if (status) {
                const userId = uuid(id, uuidv1());
                const userAvatar = userAvatars[Math.floor(Math.random() * 8)];

                Object.assign(user.data, {
                    userId: user.data.userId? user.data.userId:userId,
                    avatar: userAvatar
                });
                Object.assign(user.user[socket.id], user.data);

                Object.assign(users, user.user);
                userArray.push(user.data);

                // Broadcast new join user
                socket.broadcast.emit("join-user", user.data);

                // send back user id
                io.to(id).emit("status-join", { userId:user.data.userId, avatar:user.data.avatar});
            } else {
                // send back user id
                io.to(id).emit("status-join", false);
            }
        });
    });

    socket.on("get-users", function(userId) {
        if (userArray.length > 0) {
            io.to(userId).emit("join-user", userArray);
        }
    });

    socket.on("chat", function (response) {
        const broadcast = {
            message: response.message,
            userId: users[response.socketId].userId,
            user: users[response.socketId].username,
            date: response.date? response.date:Date(Date.now()),
            avatar: users[response.socketId].avatar,
        };
        
        socket.broadcast.emit("message", broadcast);
    });

    socket.on("typing", function (userId, socketId) {
        if (users[socketId]) {
            socket.broadcast.emit("on-type", { message:"On typing...", id:userId});
        }
    });

    socket.on("change-user-info", function (property, propertyValue) {
        const newData = users[socket.id];
        if (property === 'avatar') {
            propertyValue = userAvatars[propertyValue - 1];
        }

        changeUserInfo(socket.id, property, propertyValue);

        socket.broadcast.emit('update-user-info', newData.userId, property, propertyValue, newData);
        io.to(socket.id).emit("success-update-user", property, propertyValue, newData);
    });

    socket.on("stop-typing", function (userId, socketId) {
        if (users[socketId]) {
            socket.broadcast.emit("stop-type", userId);
        }
    });

    socket.on("sign-out", function() {
        signOutUser(socket);
    });

    socket.on("disconnect", function() {
        signOutUser(socket);
    });

});

function changeUserInfo(socketId, property, propertyValue) {
    if (userArray.length > 0) {
        userArray.map(val => {
            if (val.id === socketId) {
                val[property] = propertyValue;
            }

            return val;
        });
    }

    users[socketId][property] = propertyValue;
}

function checkUsername(username, callback) {
    if (userArray.length > 0) {
        for (let index = 0; index < userArray.length; index++) {
            const user = userArray[index];
            
            if (user.username === username) {
                callback(false);
                break;
            } else if ((userArray.length - 1) === index) {
                callback(true);
                return true;
            }
        }
    } else {
        callback(true);
        return true;
    }
}

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