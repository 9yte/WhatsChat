$(function () {
    $("#message-pane").hide();
    var socket = io.connect();
    var messages = [];
    var USERNAME;
    socket.on('signin-req', function (data) {
        $('.ui.modal')
            .modal('setting', 'closable', false)
            .modal('show')
        ;
        console.log("hi");
        messages = [];
        $('#message').attr('username', '');
        $('a.item').remove();
        $('.comment').remove();
        $('#messages-pane').css("display", "none");
    });

    socket.on('signup-status', function (data) {
        var status = data.status;
        if (status === 'success') {
            var username = data.username;
            var name = data.name;
            $('.ui.modal')
                .modal('hide')
            ;
            setUsernameAndName(username, name);
        }
        else {
            showError(status, false);
        }
    });

    socket.on('signin-status', function (data) {
        var status = data.status;
        if (status === 'success') {
            console.log(data.user[0]);
            var username = data.user[0].username;
            var name = data.user[0].name;
            $('.ui.modal')
                .modal('hide')
            ;
            setUsernameAndName(username, name);
            var f = data.user[0].friends;
            var l = f.length;
            for (var i = 0; i < l; i++) {
                addToFriendsList(f[i]);
            }
        }
        else {
            showError(status, true);
        }
    });

    socket.on('find-friend-status', function (data) {
        var status = data.status;
        if (status === 'success') {
            var username = data.user.username;
            var name = data.user.name;
            addToFriendsList(username);
            $('input').val(null);
        }
        else {
            // TODO
        }
    });

    socket.on('friend', function (data) {
        var friend = data.friend;
        addToFriendsList(friend);
    });

    socket.on('messages', function (data) {
        var message = data.message;
        messages.push(message);
        var c = $('#message').attr('username');
        if (c === message.to || c === message.from) {
            addMessage(message);
        }
        else {
            incrementUnseenMessages(message);
        }
    });

    socket.on('seen-ack', function (data) {
        var username = data.username;
        var lastSeen = data.lastSeen;
        var c = $('#message').attr('username');
        if (c === username) {
            var d = new Date(lastSeen);
            lastSeen = dateFormat(d, "dddd, mmmm dS, yyyy, h:MM:ss TT");
            var c = '<div class="sub header">' + lastSeen + "</div>";
            $('#header').append(c);
        }
    });

    socket.on('online', function (data) {
        var username = data.username;
        socket.emit('online-ack', {username: username});
        setTimeout(function () {
            if (!$('a.item[username="' + username + '"]').hasClass("green")) {
                $('a.item[username="' + username + '"]').removeClass("blue");
                $('a.item[username="' + username + '"]').addClass("green active");
            }
        }, 100);

    });

    socket.on('online-ack', function (data) {
        var username = data.username;
        if (!$('a.item[username="' + username + '"]').hasClass("green")) {
            $('a.item[username="' + username + '"]').removeClass("blue");
            $('a.item[username="' + username + '"]').addClass("green active");
        }
    });

    socket.on('notonline', function (data) {
        var username = data.username;
        if ($('a.item[username="' + username + '"]').hasClass("green")) {
            $('a.item[username="' + username + '"]').removeClass("green");
            $('a.item[username="' + username + '"]').removeClass("active");
            $('a.item[username="' + username + '"]').addClass("blue");
        }
    });

    // when Sign Up button clicked
    $('#signup').click(function () {
        var username = $('#username-signup').val();
        var name = $('#name-signup').val();
        $('input').val(null);
        socket.emit('signup', {username: username, name: name});
    });

    // when Sign In button clicked
    $('#signin').click(function () {
        var username = $('#username-signin').val();
        $('input').val(null);
        socket.emit('signin', {username: username});
    });

    // when the user enter name of his/her friend!
    $('#friend-name').keyup(function (e) {
        e.stopPropagation();
        if (e.which == 13) {
            var friend = $('#friend-name').val();
            socket.emit('find-friend', {friend: friend});
        }
    });

    // when the user enter a message
    $('#message').keyup(function (e) {
        e.stopPropagation();
        e.preventDefault();
        if (e.which == 13) {
            var message = $('#message').val();
            $('input').val(null);
            var friend = $('#message').attr('username');
            sendMessage(friend, message);
        }
    });

    // when the user selects a friend from friends list!
    $('a.item').click(friendSelect);

    // when the user enter a message
    $('#send').click(function (e) {
        e.stopPropagation();
        var message = $('#message').val();
        $('input').val(null);
        var friend = $('#message').attr('username');
        sendMessage(friend, message);
    });

    // send the text to friend! (actually to server)
    function sendMessage(friend, text) {
        console.log(friend);
        socket.emit('message', {'friend': friend, 'text': text});
    }

    function friendSelect(e) {
        var t = $(e.target);
        var fUsername = t.attr('username');
        $('#header').text("Conversation with @" + fUsername);
        socket.emit('seen-req', {username: fUsername});
        $('a.item[username="' + fUsername + '"] .label').remove();
        $('#message').attr('username', fUsername);
        $('#messages-pane').css("display", "");
        $('.comment').remove();
        fillRelevantMessages(fUsername);
    }

    function fillRelevantMessages(username) {
        var m = findRelevantMessages(username);
        var l = m.length;
        for (var i = 0; i < l; i++) {
            addMessage(m[i]);
        }
    }

    function findAnother(message) {
        if (message.from === USERNAME)
            return message.to;
        else
            return message.from;
    }

    function incrementUnseenMessages(message) {
        if (message.from !== USERNAME && message.seen === 0) {
            var username = message.from;
            var x = $('a.item[username="' + username + '"] .label');
            if (x.length === 0) {
                var c = '<div class="ui blue label">1</div>';
                $('a.item[username="' + username + '"]').append(c);
            }
            else {
                var s = x.text();
                var i = +s;
                i++;
                x.text(i + "");
            }
            notifyMe(message);
        }
    }

    function findRelevantMessages(username) {
        var m = [];
        var l = messages.length;
        for (var i = 0; i < l; i++) {
            if (messages[i].from === username | messages[i].to === username) {
                m.push(messages[i]);
            }
        }
        return m;
    }

    // this function add the friend to friends list
    var addToFriendsList = function (username) {
        var c = '<a class="blue item" username=' + username + '>' + username + '</a>';
        $('#roster').append(c);
        $('a.item[username="' + username + '"]').click(friendSelect);
    };


    // this function set the username and name (that has given from server) in client-side!
    var setUsernameAndName = function (username, name) {
        USERNAME = username;
        var $n = $('#name');
        var s = 'Welcome, ' + name;
        $n.text(s);
        s = "";
        s += '<div id="username" class="sub header">@';
        s += username;
        s += '</div>';
        $n.append(s);
    };

    function showError(message, isSignIn) {
        var c = '<div class="ui negative message"><i class="close icon"></i><div class="header">';
        c += message;
        c += '</div></p></div>';
        if (isSignIn)
            $('.horizontal.divider.ui').after(c);
        else
            $('#alert').prepend(c);
        setTimeout(function () {
            $('.negative.message').remove();
        }, 3000);
    }

    function addMessage(message) {
        console.log(message);
        var sender = message.from;
        var date = message.dateTime;
        var seen = message.seen;
        var id = message._id;
        var message = message.message;
        if (seen === 0 && USERNAME !== sender) {
            socket.emit('seen', {id: id, receiver: message.to});
            message.seen = 1;
        }
        var d = new Date(date);
        date = dateFormat(d, "dddd, mmmm dS, yyyy, h:MM:ss TT");
        var c = '<div class="comment">';
        c += '<a class="avatar">';
        c += '<img src="static/avatars/1.jpg"></a>';
        c += '<div class="content">';
        c += '<a class="author">' + sender + '</a>';
        c += '<div class="metadata"><span class="date">' + date + '</span></div>';
        c += '<div class="text">';
        c += message;
        c += '</div></div></div>';
        $('.ui.comments').append(c);
    }

    function notifyMe(message) {
        // Let's check if the browser supports notifications
        if (!("Notification" in window)) {
            alert("This browser does not support desktop notification");
        }

        // Let's check whether notification permissions have alredy been granted
        else if (Notification.permission === "granted") {
            // If it's okay let's create a notification
            var notification = new Notification(message.from, {icon: 'http://cdn.sstatic.net/stackexchange/img/logos/so/so-icon.png', tag: message.from, body: message.message});
        }

        // Otherwise, we need to ask the user for permission
        else if (Notification.permission !== 'denied') {
            Notification.requestPermission(function (permission) {
                // If the user accepts, let's create a notification
                if (permission === "granted") {
                    var notification = new Notification(message.from, {icon: 'http://cdn.sstatic.net/stackexchange/img/logos/so/so-icon.png', tag: message.from, body: message.message});
                }
            });
        }

        // At last, if the user has denied notifications, and you
        // want to be respectful there is no need to bother them any more.
    }
});
