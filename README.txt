
——————————————————————————————————————Description——————————————————————————————————————————

A joint project for Web Programming course, a realtime chat program using Web Socket on Node.js platform.

WhatsChat is a chat client & server program implemented using Node.js platform. The most important feature of the chat program is being realtime and obviously bidirectional event-based communication. That is to say, there is no AJAX in play. Every event is reported to server realtime, so there is no delay between the occurrence of an event and notifying users.

——————————————————————————————————————How to run——————————————————————————————————————————


At first, you should run database server:
1. make a directory for database or consider a directory for database!
2. run database server: mongod —-dbpath <DB-directory>

Next, you should run application server (index.js):
1. node index.js

finally the client can connect to the server through his browser!
the server url is “http://127.0.0.1:3000/“

Please pay attention that your browser will be asked to allow notifications appear!


——————————————————————————————————————Requirements——————————————————————————————————————————
Requierments:
1. mongodb database on your system
2. mongodb module in node
3. socket.io module in node
4. express module in node
5. jade module in node

Best Regards,

Aghakhani, Abolhasani, Ezzati
