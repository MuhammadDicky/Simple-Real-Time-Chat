$(document).ready(function () {
    var socket = io();
    var myData = {};
    var userList = [];
    var paddingMessage = [];
    const defaultAvatar = './assets/img/user-image.png';

    const $myInfo = $('#my-info');
    const $myUsername = $myInfo.find('.user-name');
    const $myJoinDate = $myInfo.find('.join-date');
    const $myImg = $myInfo.find('.widget-user-image img');

    const userlistSelector = '#user-list li.item';
    
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

            socket.emit('new-user', { user, data});
        }
    });

    socket.on("status-join", function ({ userId, avatar }) {
        const $userInput = $('[name=message]');
        // Checking if user successfully join
        if (userId) {
            myData.userId = userId;
            myData.avatar = avatar;
            
            $myUsername.text(`Me: ${myData.username}`);
            $myJoinDate.text(convertDate(myData.join));
            $myImg.attr('src', myData.avatar);
            
            $('.btn-action').text('Send');
            $userInput.attr('placeholder', 'Type Message ...').val(null);

            signOutBtn();

            if (paddingMessage.length > 0) {
                socket.emit("chat", { message:paddingMessage, socketId:socket.id});

                paddingMessage = [];
            }
        } else {
            myData = {};
            $userInput.val(null);
            alert('This username already taking by other!');
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

    socket.on("update-user-info", function (userId, property, propertyValue, newData) {
        changeUserInfo(userId, property, propertyValue, newData);
    });

    socket.on("success-update-user", function (property, propertyValue, newData) {
        if (property === 'avatar') {
            $myImg.attr('src', propertyValue);
        }

        Object.assign(myData, newData);
    });

    socket.on("user-left", function (userId) {
        userLeft(userId);
    });

    $('[name=message]').on({
        keypress: function (params) {
            if (myData.userId && myData.username) {
                socket.emit("typing", myData.userId, myData.id);
            }
        },
        keyup: function (params) {
            if (myData.userId && myData.username) {
                setTimeout(function (){
                    socket.emit("stop-typing", myData.userId, myData.id);
                }, 3000);
            }
        }
    });

    $(document).on('click', '.change-user-avatar', function (eve) {
        if (myData.userId && myData.username) {
            $('.modal').modal('show');
            $(`#user-avatar-list img[src="${myData.avatar}"]`).next().prop('checked', true);
        }
    });

    $('#change-user-avatar').on('click', function(eve) {
        const avatarId = $('#user-avatar-list input:checked').val();

        socket.emit("change-user-info", 'avatar', avatarId);
        $('.modal').modal('hide');
    });

    $(document).on('click', '#sign-out', function(eve) {
        if (socket.id && myData.userId && myData.username) {
            myData = {};
            $myUsername.text('Me:');
            $myJoinDate.text('Join:');
            $myImg.attr('src', defaultAvatar);

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
            const data = { id: socket.id, username, join: Date.now() };
            const user = { [socket.id]: {} };
            user[socket.id] = myData = data;
            socket.emit('new-user', { user, data});
        }
    });

    function setTitle(title) {
        $('#chat-status').html(title);
    }

    function printMessage(data, me = true) {
        const $chatContainer = $('<div></div>', {
            class: `direct-chat-msg ${me? 'right':'other'}`,
            html: [
                `<img class="direct-chat-img" src="${me? myData.avatar:data.avatar}" alt="User Image">`,
                `<div class="direct-chat-text"></div>`
            ]
        });
        $chatContainer.find('.direct-chat-text').text(data.message);

        const $chatInfo = $('<div></div>', {
            class: 'direct-chat-info clearfix',
            html: [
                `<span class="direct-chat-name pull-${me? 'right':'left'}"></span>`,
                `<span class="direct-chat-timestamp pull-${me? 'left':'right'}">${me? convertDate(Date.now()):convertDate(data.date)}</span>`
            ]
        });
        $chatInfo.find('span.direct-chat-name').text(me? 'Me':data.user);

        $chatContainer.prepend($chatInfo);

        $('.direct-chat-messages').append($chatContainer);
        
        $('#box-chat .direct-chat-messages').animate({
			scrollTop: $('#box-chat .direct-chat-messages')[0].scrollHeight
		});
    }

    function joinUser(data) {
        const { userId:id, username, join, avatar } = data;
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
                    html: `<img src="${avatar}" alt="User">`
                }),
                $('<div></div>', {
                    class: 'product-info',
                    html: [
                        `<a href="javascript:void(0)" class="product-title user-name"></a>`,
                        `<span class="product-description join-date user-detail">${convertDate(join)}</span>`
                    ]
                })
            ]
        }).data('id', id).data('data', data);
        $newUser.find('a.user-name').text(username);

        if ($listUser.length > 0 ) {
            $listUser.append($newUser);
        } else {
            $listUserContainter.append($newUser);
            $('#box-user-list').find('.box-footer').html($listUserContainter);
        }

        userList.push(data);
    }

    function userLeft(userId) {
        const $userlist = $(userlistSelector);

        if (userId) {
            for (let index = 0; index < $userlist.length; index++) {
                const element = $userlist[index];
                const $targetElement = $(element);
                const { id } = $targetElement.data();

                if (id === userId) {
                    $targetElement.find('.join-date').text('Sign out from chat lobby...');

                    setTimeout(function() {
                        $targetElement.slideUp(function(eve) {
                            $(this).remove();

                            if ($(userlistSelector).length === 0) {
                                $('#box-user-list .box-footer').html('<h5 class="text-center">No user join yet...</h5>');
                            }
                        });
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

    function changeUserInfo(userId, property, val, newData = false) {
        const $userlist = $(userlistSelector);
        const lookUpAttr = {
            avatar: {
                selector: '.user-img img',
                attr: 'src'
            },
            join: {
                selector: '.user-detail',
                html: val
            }
        };

        for (let index = 0; index < $userlist.length; index++) {
            const element = $userlist[index];
            const $targetElement = $(element);
            const targetAttr = lookUpAttr[property];
            const $detail = $targetElement.find(targetAttr.selector);
            const { id, data } = $targetElement.data();

            if (id === userId) {
                // Change attribute
                if (targetAttr.attr) {
                    $detail.attr(targetAttr.attr, val);
                }
                
                if (targetAttr.html) {
                    $detail.html(targetAttr.html);
                }

                if (newData) {
                    $targetElement.data('data', newData);
                }

                break;
            }
        }
    }

    function userTyping(state, obj) {
        const $userlist = $(userlistSelector);
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
                $detail.html(convertDate(data.join));

                break;
            }
        }
    }

    function signOutBtn(show = true) {
        const $targetElement = $('#box-user-list .box-header .box-tools');
        const changeAvatarSelector = 'change-user-avatar';
        const signOutSelector = 'sign-out';

        if (show) {
            $changeAvatar = $('<button></button>', {
                type: 'button',
                class: `btn btn-box-tool ${changeAvatarSelector}`,
                title: 'Change User Avatar',
                html: '<i class="fa fa-user"></i>'
            });

            $signOut = $('<button></button>', {
                type: 'button',
                class: 'btn btn-box-tool',
                title: 'Sign-Out',
                id: signOutSelector,
                html: '<i class="fa fa-sign-out"></i>'
            });

            $targetElement.prepend([$changeAvatar, $signOut]);
        } else {
            $targetElement.find(`#${signOutSelector}, .${changeAvatarSelector}`).remove();
        }
    }

    function convertDate(date) {
        return moment(date).fromNow();
    }
});
