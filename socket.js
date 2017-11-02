var express = require('express'),
    path = require('path'),
    app = express();
var http=require('http').Server(app);
var io = require('socket.io')(http);
app.use('/uploads',express.static('uploads'));
http.listen(3000);
app.get('/indexFile',function(req,res){
    res.sendFile(__dirname+'/public/socketIndex.html');
});
//console.log(handle);
var nicknames = [];
io.sockets.on('connection',function(socket){
    console.log(socket);
    console.log("Connection :User is connected  ");
    console.log("Connection : " +socket.id);
    socket.on('nickName',function(data,callback){
    	if(nicknames.indexOf(data)!=-1){
    		callback(false);
    	}else{
    		
    		socket.nickname = data;
    		nicknames.push(socket.nickname);
    		console.log(nicknames);
    		io.sockets.emit('nicknameList',nicknames);
    		callback(true);
    		//io.sockets.on('nickNameList',socket.nickname);

    	}
    })
    socket.on('send_message',function(data){
        console.log(data);
        io.sockets.emit('new_message',data);
    });
    socket.on('join',data =>{
        socket.join(data.gameId)
    });


    socket.on('send-word',data => {
        socket.broadcast.to(data.gameId).emit('received-word',data.word)
    })
});
// io.on('connection', function (socket) {
//     console.log("Connected");
  
// });