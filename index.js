var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;

app.use(express.static(__dirname + '/public'));

server.listen(port, function () {
    //console.log('Server listening at port %d', port);
});

Array.prototype.remove = function (value) {
    var index = this.indexOf(value);
    this.splice(index, 1)
};

var wbHistory = function () {
    this._stack = [];
    this._queue = [];
};

wbHistory.prototype = {
    get: function () {
        return this._stack;
    },
    add: function (data) {
        this._stack.push(data);
        if (this._queue.length > 0) {
            this._queue = [];
        }
    },
    undo: function () {
        if (this._stack.length == 0) {
            return;
        }
        this._queue.push(this._stack.pop());
    },
    redo: function () {
        if (this._queue.length == 0) {
            return;
        }
        this._stack.push(this._queue.pop());
    }
};

var Room = function (name) {
    this.name = name;
    this.users = [];
    this.chatHistory = [];
    this.wbHistory = new wbHistory();
    this.images = [];
};

Room.prototype = {
    getUsers: function () {
        return this.users;
    },
    addUser: function (userName) {
        this.users.push(userName);
    },
    removeUser: function (userName) {
        this.users.remove(userName);
    }
};

var createRoom = function (roomName) {
    var room = new Room(roomName);
    rooms[room.name] = room;
	return room;
};

var rooms = {};

io.sockets.on('connection', function (socket) {

    if (Object.keys(rooms).length == 0) {
        createRoom("Room 1");
    }
    socket.emit('show_rooms', rooms);

    socket.on('add_user', function (userName, roomName) {

        roomName = roomName || "Room 1";
        socket.username = userName;
        socket.room = roomName;

        var currentRoom = rooms[roomName] || createRoom(roomName);
        currentRoom.addUser(userName);
        socket.join(roomName);

        currentRoom.chatHistory.length != 0 && socket.emit('update_chat', currentRoom.chatHistory);
        currentRoom.images.length != 0 && socket.emit('update_image', currentRoom.images);

        if (currentRoom.wbHistory.get().length != 0) {
            if (currentRoom.wbHistory._queue.length) {
                socket.emit('update_wb', currentRoom.wbHistory.get(), currentRoom.wbHistory._queue);
            }
            else {
                socket.emit('update_wb', currentRoom.wbHistory.get());
            }
        }
        socket.emit('notification_message', 'Welcome!', 'you have connected to ' + roomName + '.');
        socket.broadcast.to(roomName).emit('notification_message', userName, 'has connected to ' + roomName + '.');
        io.sockets.in(roomName).emit('update_users', currentRoom.getUsers());
        io.sockets.emit('update_rooms', rooms);

    });

    socket.on('send_chat', function (data) {
        var msgData = {name: socket.username, msg: data};
        var currentRoom = rooms[socket.room];
        currentRoom.chatHistory.push(msgData);
        io.sockets.in(socket.room).emit('update_chat', [msgData]);
    });

    socket.on('send_wb', function (data) {
        var currentRoom = rooms[socket.room];
        currentRoom.wbHistory.add(data);
        socket.broadcast.to(socket.room).emit('update_wb', data);
    });

    socket.on('change_wb_history', function (operation) {
        var currentRoom = rooms[socket.room];
        operation == "undo" ? currentRoom.wbHistory.undo() : currentRoom.wbHistory.redo();
        io.sockets.in(socket.room).emit('update_wb_history', operation);
    });

    socket.on('send_image', function (src) {
        var currentRoom = rooms[socket.room];
        currentRoom.images.push(src);
        socket.broadcast.to(socket.room).emit('update_image', src);
    });

    socket.on('disconnect', function () {
        if (socket.room) {
            var roomName = socket.room;
            var userName = socket.username;
            var currentRoom = rooms[roomName];
            currentRoom.removeUser(userName);
            if (!currentRoom.users.length) {  // delete empty room
                delete rooms[roomName];
                io.sockets.emit('update_rooms', rooms);
            }
            else {
                socket.broadcast.to(roomName).emit('update_users', currentRoom.getUsers());
            }
        }
        socket.broadcast.to(roomName).emit('notification_message', userName, ' has disconnected from ' + roomName + '.');
        socket.leave(roomName);
    });

});













