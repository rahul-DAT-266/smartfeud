var utilityModule = require('./utilityFunction.js');

function socketConnection(io) {
	io.use(function(socket, next) {
			utilityModule.utlitySocketFunction().checkAuthentication(socket, io);
			next();
		})
		.on('connection', function(socket) {

			socket.on('disconnect', function(socket) {

			})

		});

}

module.exports={
	socketConnection:socketConnection
}