(function () {

    $(window).load(function () {
        $('#notification-div').hide();
        $('#myModal').modal('show');

        $("#send-msg-btn").click(function () {
            var inputMsg = $("#msg-input");
            var msg = inputMsg.val();
            if (msg.length === 0 || !msg.trim()) {
                inputMsg.focus();
                return;
            }
            inputMsg.val('').focus();
            socket.emit('send_chat', msg);
        });

        $("#msg-input").keypress(function (event) {
            if (event.which == 13) {
                $(this).blur();
                $("#send-msg-btn").focus().click();
            }
        });

        $("#go-ahead-bnt").click(function () {
            var userNameImput = $("#username-input");
            userNameImput.focus();
            var userName = userNameImput.val();
            var roomName = $("#input-roomname").val();
            if (!userName) {
                userNameImput.focus();
            }
            else {
                roomName = roomName || $("#select-rooms").val();
                socket.emit('add_user', userName, roomName);
                $('#myModal').modal('hide');
            }
        });

        $('#btn-load-image').click(function () {
            var filesSelected = document.getElementById("inputFileToLoad").files;
            if (filesSelected.length > 0) {
                var fileToLoad = filesSelected[0];

                if (fileToLoad.type.match("image.*")) {
                    var fileReader = new FileReader();
                    fileReader.onload = function (fileLoadedEvent) {
                        var image_src = fileLoadedEvent.target.result;
                        whiteboard.drawImage(image_src);
                        socket.emit('send_image', image_src);

                    };
                    fileReader.readAsDataURL(fileToLoad);
                }
            }
        });

    });

//var socket = io.connect('http://localhost:3000');
    var socket = io();

    window.wbSendMessage = function (msg) {
        whiteboard.history().add(msg);
        socket.emit('send_wb', msg);
    };

    window.changeWbHistory = function (operation) {
        socket.emit('change_wb_history', operation);
    };

    socket.on('show_rooms', function (rooms) {
        var selectRooms = $("#select-rooms");
        selectRooms.html("");
        for (var key in rooms) {
            selectRooms.append('<option>' + key + '</option>');
        }
    });

    socket.on('notification_message', function (label, content) {
        $('#notification-div').fadeIn(1000).fadeOut(5800);
        $('#notification-content').html('<strong>' + label + '</strong>' + "  " + content);
    });


    socket.on('update_users', function (users) {
        var tableUsers = $("#table-users");
        $("#users-badge").html(users.length);
        tableUsers.html("<tbody></tbody>");
        var i = 0;
        for (var key in users) {
            tableUsers.append('<tr><td>' + (++i) + '</td><td>' + users[key] + '</td></tr>');
        }
    });

    socket.on('update_rooms', function (rooms) {
        var roomNumber = Object.keys(rooms).length;
        var tableRooms = $("#table-rooms");
        $("#rooms-badge").html(roomNumber);
        tableRooms.html("<tbody></tbody>");
        var i = 0;
        for (var key in rooms) {
            tableRooms.append('<tr><td>' + (++i) + '</td><td>' + key + '</td></tr>');
        }
    });

    socket.on('update_chat', function (data) {
        var conversation = $('#conversation');
        for (var key in data) {
            conversation.append('<b>' + data[key].name + ':</b> ' + data[key].msg + '<br>');
        }
        conversation.scrollTop(conversation[0].scrollHeight);
    });

    socket.on('update_wb', function (data, queue) {
        if (queue) {
            (function (data, queue) {
                whiteboard.onSocketMessage(data);
                whiteboard.history()._queue = queue;
            }(data, queue));
        } else {
            whiteboard.onSocketMessage(data);
        }
    });

    socket.on('update_wb_history', function (operation) {
        operation == "undo" ? whiteboard.history().undo() : whiteboard.history().redo();
    });

    socket.on('update_image', function (src) {
        if (src.push) {
            for (var i = 0; i < src.length; i++) {
                whiteboard.drawImage(src[i]);
            }
        }
        else {
            whiteboard.drawImage(src);
        }
    });

}())











