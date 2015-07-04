/**
 * Created by hojjat on 6/29/15 AD.
 */
var ObjectId = require('mongodb').ObjectID;

var express = require('express');
var path = require('path');
var app = express();
var server = require('http').createServer(app);
var io = require('/usr/local/lib/node_modules/socket.io')(server);
var port = process.env.PORT || 3000;

//lets require/import the mongodb native drivers.
var mongodb = require('mongodb');

//We need to work with "MongoClient" interface in order to connect to a mongodb server.
var MongoClient = mongodb.MongoClient;

// Connection URL. This is where your mongodb server is running.
var url = 'mongodb://localhost:27017/chat';

var database;

var sockets = [];

// here we define collections
var users;
var messages;

MongoClient.connect(url, function (err, db) {
    if (err) {
        console.log('Unable to connect to the mongoDB server. Error:', err);
    } else {
        database = db;
        console.log('Connection established to', url);

        // here we define collections
        users = database.collection('users');
        messages = database.collection('messages');
    }
});

// setting views directory
app.set('views', __dirname + '/views');

// setting view engine
app.set('view engine', 'jade');

// setting static folders, for js, css and images file!
app.use(express.static(path.join(__dirname, 'public')));

// server listen on port! please attention, server listen for http request!
server.listen(port, function () {
    console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/public'));

// server respond to browser connection(127.0.0.1:port/), a http connection
app.get('/', function (req, res) {
    res.render('index.jade', {
    });
});

// here we have web socket connection, not http connections
io.on('connection', function (socket) {
    socket.emit('signin-req', {});
    console.log("user connected");

    socket.on('disconnect', function (data) {
        var username = socket.username;
        if(socket.username === undefined){
            return;
        }
        users.find({username: username}).toArray(function (err, result) {
            if (err) {
                console.log(err);
            }
            else if (result.length) {
                if (result[0] !== undefined)
                    sendOnlineMessageToFriends(result[0].friends, result[0].username, 'notonline');
            }
            else {
            }
        });
    });


    // when the server receive the user info!
    socket.on('signup', function (data) {
        var username = data.username;
        socket.username = username;
        var name = data.name;
        // Get the documents collection
        if (username === '')
            socket.emit('signup-status', {status: "Please enter a username"});
        var u = {username: username, name: name, friends: [], lastSeen: new Date()};

        users.find({username: username}).toArray(function (err, result) {
            if (err) {
                console.log(err);
            } else if (result.length) {
                socket.emit('signup-status', {status: "The username already exists"});
            } else {
                users.insert(u, function (err, result) {
                    if (err) {
                        console.log(err);
                    } else {
                        socket.username = username;
                        sockets[username] = socket;
                        socket.emit('signup-status', {status: "success", username: username, name: name});
                    }
                });
            }
        });
    });

    // when the client tries to sign in!
    socket.on('signin', function (data) {
        var username = data.username;
        if (username === '')
            socket.emit('signin-status', {status: "Please enter a username"});
        users.find({username: username}).toArray(function (err, result) {
            if (err) {
                console.log(err);
            } else if (result.length) {
                if(sockets[username] !== undefined){
                    socket.emit('signin-status', {status: "The username is online now!"});
                    return;
                }
                socket.username = username;
                sockets[username] = socket;
                var cursor = messages.find({ $or: [
                    {from: username},
                    {to: username}
                ]}).sort({dateTime: 1});
                socket.emit('signin-status', {status: "success", user: result});
                sendOnlineMessageToFriends(result[0].friends, result[0].username, 'online');
                cursor.each(function (err, doc) {
                    if (err) {
                        console.log(err);
                    } else {
                        if (doc !== null)
                            socket.emit('messages', {message: doc});
                    }
                });
            } else {
                socket.emit('signin-status', {status: "Please enter a valid username!"});
            }
        });
    });

    socket.on('online-ack', function(data){
        var username = data.username;
        var s = findSocket(username);
        s.emit('online-ack', {username: socket.username});
    });

    // when the user send a friend name to server
    socket.on('find-friend', function (data) {
        var friendUsername = data.friend;
        users.find({username: friendUsername}).toArray(function (err, result) {
            if (err) {
                console.log(err);
            } else if (result.length) {
                if (!search(result[0].friends, socket.username)) {
                    users.update({ username: socket.username }, { $push: { friends: result[0].username } }, function (err, res) {
                        if (err) {
                            console.log(err);
                        }
                        else {
                            users.update({ username: result[0].username }, { $push: { friends: socket.username } }, function (err, res) {
                                if (err) {
                                    console.log(err);
                                }
                                else {
                                    socket.emit('find-friend-status', {status: "success", user: result[0]});
                                    var s = findSocket(result[0].username);
                                    if (s !== undefined){
                                        s.emit('online', {username: socket.username});
                                        s.emit('friend', {status: "success", friend: socket.username});
                                    }
                                }
                            });
                        }
                    });
                }
            } else {
                socket.emit('find-friend-status', {status: "Please enter a valid username!"});
            }
        });
    });

    socket.on('seen-req', function (data) {
        var username = data.username;
        users.find({username: username}).toArray(function (err, res) {
            if (err) {
                console.log(err);
            }
            else if (res.length) {
                socket.emit('seen-ack', {username: username, lastSeen: res[0].lastSeen});
            }
            else {
            }
        });
    });

    socket.on('seen', function (data) {
        var id = data.id;
        var receiver = data.receiver;
        messages.update({_id: ObjectId(id)}, {$set: {seen: 1}}, function (err, res) {
            if (err) {
                console.log(err);
            }
            else {
                users.update({receiver: receiver}, {$set: {lastSeen: new Date()}}, function (err, res) {
                    if (err) {
                        console.log(err);
                    }
                    else {
                    }
                });
            }
        });
    });

    socket.on('message', function (data) {
        var from = socket.username;
        var to = data.friend;
        var message = data.text;
        var dateTime = new Date();
        var m = {from: from, to: to, message: message, dateTime: dateTime, seen: 0};
        messages.insert(m, function (err, result) {
            if (err) {
                console.log(err);
            } else {
                socket.emit('messages', {status: "success", message: m});
                sendMessageToUser(to, m);
            }
        });
    });

    var sendOnlineMessageToFriends = function (friends, username, status) {
        var l = friends.length;
        for (var i = 0; i < l; i++) {
            var s = findSocket(friends[i]);
            if (s !== undefined)
                s.emit(status, {'username': username});
        }
    };

    var sendMessageToUser = function (username, message) {
        var s = findSocket(username);
        if (s !== undefined)
            s.emit('messages', {status: "success", message: message});
    };

    var findSocket = function (username) {
        return sockets[username];
    };

    var search = function (list, element) {
        var l = list.length;
        for (var i = 0; i < l; i++) {
            if (list[i] === element)
                return true;
        }
        return false;
    };
});

