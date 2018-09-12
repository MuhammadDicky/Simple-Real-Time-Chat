$(document).ready(function () {
    var socket = io();

    socket.on("disconnected", function () {
        setTitle("Disconnected");
    });

    socket.on("connect", function () {
        setTitle("Connected to socket server");
    });

    socket.on("ontype", function (msg) {
        // $('#type-status').text(msg);
    });

    socket.on("message", function (message) {
        printMessage(message.message, null, message.date);
    });

    $('[name=message]').on('keypress', function (params) {
        socket.emit("typing");
    });

    $('[name=message]').on('keyup', function (params) {
    });

    $('form').submit(function (eve) {
        eve.preventDefault();
        
        var input = $('[name=message]').val();
        if (input != '') {
            printMessage(input, 'right');
            socket.emit("chat", input);
        }
        $('[name=message]').val(null);
    });

    function setTitle(title) {
        $('#chat-status').text(title);
    }

    function printMessage(message, pos, date) {
        if (!pos) {
            var who = 'Other';
            var chatName = 'left';
            var timeStamp = 'right';
            pos = 'other';
        } else {
            var who = 'Me';
            var chatName = 'right';
            var timeStamp = 'left';
            date = Date(Date.now());
        }

        $('.direct-chat-messages').append(
            '<div class="direct-chat-msg ' + pos + '">'+
            '    <div class="direct-chat-info clearfix">'+
            '        <span class="direct-chat-name pull-'+chatName+'">' + who + '</span>'+
            '        <span class="direct-chat-timestamp pull-'+timeStamp+'">' + date + '</span>'+
            '    </div>'+
            '    <img class="direct-chat-img" src="./assets/img/user-image.png" alt="Message User Image">'+
            '    <div class="direct-chat-text">' + message + '</div>'+
            '</div>'
        );
    }
});