$(document).ready(function () {
    var socket = io();
    var user = {};
    var userList = [];
    
    socket.on("disconnect", function () {
        setTitle("<span class='fa fa-exclamation-triangle'></span> Disconnected from socket server");
    });

    socket.on("connect", function () {
        socket.emit("get-users", socket.id);
        setTitle("<span class='fa fa-check'></span> Connected to socket server");
    });

    socket.on("on-type", function (obj) {
        userTyping('start', obj);
    });

    socket.on("stop-type", function (userId) {
        userTyping('stop', userId);
    });

    socket.on("message", function (response) {
        printMessage(response, false);
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
        socket.emit("typing", socket.id);
    });

    $('[name=message]').on('keyup', function (params) {
        setTimeout(() => {
            socket.emit("stop-typing", socket.id);
        }, 3000);
    });

    $('form').submit(function (eve) {
        eve.preventDefault();
        var $inputTarget = $('[name=message]');
        var input = $inputTarget.val();

        if (typeof user[socket.id] !== 'undefined' && user[socket.id].username && input !== '') {
            printMessage({message:input});
            socket.emit("chat", { message:input, socketId:socket.id});
            $('[name=message]').val(null);
        } else if (input !== '') {
            const username = input;
            const joinDate = Date(Date.now());
            const data = { id: socket.id, username, join: joinDate };
            user[socket.id] = data;
            socket.emit('new-user', { user, data});

            const $myInfo = $('#my-info');
            $myInfo.find('.user-name').text(`Me: ${username}`);
            $myInfo.find('.join-date').text(joinDate);
            
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
        const { id, username, join } = data;
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
});
