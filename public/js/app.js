$(document).ready(function () {
    var socket = io();
    var myData = {};
    var user = {};
    var userList = [];
    var paddingMessage = [];

    const $myInfo = $('#my-info');
    const $myUsername = $myInfo.find('.user-name');
    const $myJoinDate = $myInfo.find('.join-date');
    
    socket.on("disconnect", function () {
        setTitle("<span class='fa fa-exclamation-triangle'></span> Disconnected from socket server");
        userLeft();
    });

    socket.on("connect", function () {
        socket.emit("get-users", socket.id);
        setTitle("<span class='fa fa-check'></span> Connected to socket server");

        // Connect back to socket with current user and new socket id
        if (myData.id && myData.username) {
            const data = { id: socket.id, userId:myData.userId, username:myData.username, join: myData.join };
            myData = data;
            user = {
                [socket.id]: data
            };

            socket.emit('new-user', { user, data});
        }
    });

    socket.on("success-join", function (userId) {
        myData.userId = userId;
        signOutBtn();

        if (paddingMessage.length > 0) {
            socket.emit("chat", { message:paddingMessage, socketId:socket.id});

            paddingMessage = [];
        }
    });

    socket.on("on-type", function (obj) {
        userTyping('start', obj);
    });

    socket.on("stop-type", function (userId) {
        userTyping('stop', userId);
    });

    socket.on("message", function (response) {
        if (Array.isArray(response.message)) {
            response.message.forEach(message => {
                message.user = response.user;
                printMessage(message, false);
            });
        } else if (typeof response === 'object') {
            printMessage(response, false);
        }
    });

    socket.on("join-user", function (response) {
        if (Array.isArray(response)) {
            response.forEach(data => {
                joinUser(data);
            });
        } else if (typeof response === 'object') {
            joinUser(response);
        }
    });

    socket.on("user-left", function (userId) {
        userLeft(userId);
    });

    $('[name=message]').on('keypress', function (params) {
        socket.emit("typing", myData.userId);
    });

    $('[name=message]').on('keyup', function (params) {
        setTimeout(() => {
            socket.emit("stop-typing", myData.userId);
        }, 3000);
    });

    $(document).on('click', '#sign-out', function(eve) {
        if (socket.id && myData.userId && myData.username) {
            myData = {};
            $myUsername.text('Me:');
            $myJoinDate.text('Join:');

            const $inputTarget = $('[name=message]');
            $('.btn-action').text('Start Chat');
            $inputTarget.attr('placeholder', 'Enter your name');

            signOutBtn(false);

            socket.emit('sign-out');
        }
    });

    $('form').submit(function (eve) {
        eve.preventDefault();
        var $inputTarget = $('[name=message]');
        var input = $inputTarget.val();

        if (myData.id && myData.username && input !== '') {
            printMessage({message:input});
            $('[name=message]').val(null);

            // Sending message if socket is connected
            if (socket.connected) {
                socket.emit("chat", { message:input, socketId:socket.id});
            } else {
                paddingMessage.push({ message:input, date:Date(Date.now()) });
            }
        } else if (input !== '') {
            const username = input;
            const joinDate = Date(Date.now());
            const data = { id: socket.id, username, join: joinDate };
            user[socket.id] = myData = data;
            socket.emit('new-user', { user, data});

            const $myInfo = $('#my-info');
            $myUsername.text(`Me: ${username}`);
            $myJoinDate.text(joinDate);
            
            $('.btn-action').text('Send');
            $inputTarget.attr('placeholder', 'Type Message ...').val(null);
        }
    });

    function setTitle(title) {
        $('#chat-status').html(title);
    }

    function printMessage(data, me = true) {
        const $chatContainer = $('<div></div>', {
            class: `direct-chat-msg ${me? 'right':'other'}`,
            html: [
                '<img class="direct-chat-img" src="./assets/img/user-image.png" alt="Message User Image">',
                `<div class="direct-chat-text">${data.message}</div>`
            ]
        });

        const $chatInfo = $('<div></div>', {
            class: 'direct-chat-info clearfix',
            html: [
                `<span class="direct-chat-name pull-${me? 'right':'left'}">${me? 'Me':data.user}</span>`,
                `<span class="direct-chat-timestamp pull-${me? 'left':'right'}">${me? Date(Date.now()):data.date}</span>`
            ]
        });

        $chatContainer.prepend($chatInfo);

        $('.direct-chat-messages').append($chatContainer);
        
        $('#box-chat .direct-chat-messages').animate({
			scrollTop: $('#box-chat .direct-chat-messages')[0].scrollHeight
		});
    }

    function joinUser(data) {
        const { userId:id, username, join } = data;
        const listId = 'user-list';
        const $listUser = $(`#${listId}`);
        // Check user-list
        const $listUserContainter = $('<ul></ul>', {
            id: listId,
            class: 'products-list product-list-in-box'
        });

        const $newUser = $('<li></li>', {
            class: 'item',
            html: [
                $('<div></div>', {
                    class: 'user-img',
                    html: '<img src="./assets/img/user-image.png" alt="User">'
                }),
                $('<div></div>', {
                    class: 'product-info',
                    html: [
                        `<a href="javascript:void(0)" class="product-title user-name">${username}</a>`,
                        `<span class="product-description join-date user-detail">${join}</span>`
                    ]
                })
            ]
        }).data('id', id).data('data', data);

        if ($listUser.length > 0 ) {
            $listUser.append($newUser);
        } else {
            $listUserContainter.append($newUser);
            $('#box-user-list').find('.box-footer').html($listUserContainter);
        }

        userList.push(data);
    }

    function userLeft(userId) {
        const lookSelector = '#user-list li.item';
        const $userlist = $(lookSelector);

        if (userId) {
            for (let index = 0; index < $userlist.length; index++) {
                const element = $userlist[index];
                const $targetElement = $(element);
                const { id } = $targetElement.data();

                if (id === userId) {
                    $targetElement.find('.join-date').text('Keluar dari chat...');

                    setTimeout(function() {
                        $targetElement.slideUp().remove();

                        if ($(lookSelector).length === 0) {
                            $('#box-user-list .box-footer').html('<h5 class="text-center">No user join yet...</h5>');
                        }
                    }, 1000);

                    break;
                }
            }
        } else {
            const $target = $('#box-user-list .box-footer');
            $target.append('<h5 class="text-center">Disconnected from chat lobby...</h5>');

            setTimeout(function() {
                $userlist.slideUp().remove();
                $target.html('<h5 class="text-center">No user join yet...</h5>');
            }, 3000);
        }
    }

    function userTyping(state, obj) {
        const lookSelector = '#user-list li.item';
        const $userlist = $(lookSelector);
        const userId = typeof obj === 'object'? obj.id:obj;

        for (let index = 0; index < $userlist.length; index++) {
            const element = $userlist[index];
            const $targetElement = $(element);
            const $detail = $targetElement.find('.user-detail');
            const { id, data } = $targetElement.data();

            if (id === userId && state === 'start') {
                $detail.html(obj.message);

                break;
            } else if (id === userId && state === 'stop') {
                $detail.html(data.join);

                break;
            }
        }
    }

    function signOutBtn(show = true) {
        const $targetElement = $('#box-user-list .box-header .box-tools');
        const idSelector = 'sign-out';

        if (show) {
            $targetElement.prepend($('<button></button>', {
                type: 'button',
                class: 'btn btn-box-tool',
                title: 'Sign-Out',
                id: idSelector,
                html: '<i class="fa fa-sign-out"></i>'
            }));
        } else {
            $targetElement.find(`#${idSelector}`).remove();
        }
    }
});
