var express=require('express');
var app=express();
var http=require('http').Server(app);
var io = require('socket.io')(http);
//var ip = require('ip');

// var mongoose = require('mongoose');
// mongoose.Promise = require('bluebird');
// mongoose.connect("mongodb://localhost:27017/chat");
// global.ObjectID=require('mongoose').Types.ObjectId;

// mongoose.connection.on('open', function (ref) {
//     console.log('Connected to mongo server.');
// });
// mongoose.connection.on('error', function (err) {
//     console.log('Could not connect to mongo server!');
//     console.log(err);
// });
app.use(express.static('./')); 

require("./controllerPrev.js")(app,io);

http.listen(8081,function(){
    console.log("Node Server is setup and it is listening on http://:8081");
});



