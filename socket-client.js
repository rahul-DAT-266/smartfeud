var socket=require('socket.io-client')('ws://localhost:3001',{query:{
	"Authorization":"JWT Token"
}});
socket.on('connect', function(){
	console.log('socket connect')
});