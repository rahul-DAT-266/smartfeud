var UserModel = require('../../models/User')

/**
 * This function use for check authentication of
 * the users in a particular socket
 * @param  {Object}  io [description]
 * @return {[type]}    [description]
 */
function checkAuthentication(socket, io) {

	if (socket.handshake.query && socket.handshake.query.Authorization) {

		UserModel.findOne({
			auth_token: socket.handshake.query.Authorization
		}, function(err, userDetails) {
			if (err) {
				socket.emit('login_ack_err', err);
			} else {
				if (userDetails) {
					this.mappingOnlineUsers(userDetails, socket, io);
				} else {
					socket.emit('login_ack_err', 'User is not found');
				}
			}
		})
	} else {
		socket.emit('login_ack_err', 'Invalid Token');
	}

}

/**
 * This function use for mapping socketId with
 * respective userId and vice-versa
 * @param  {Object} user   [The Users information]
 * @param  {Object} socket [The socket information]
 * @param  {Object} io     [The parent io socket]
 */
function mappingOnlineUsers(user, socket, io) {

	onlineSocket[socket.id] = {
		userId: user._id,
		auth_token: user.auth_token
	}

	if (onlineUsers.indexOf(user._id) !== -1) {
		onlineUsers[user._id].push(socket.id)
	} else {
		onlineUsers[user._id] = [socket.id];
	}
}

/**
 * This function use for add particular member in existing 
 * game room
 * @param  {Object} user   [The Users information]
 * @param  {Object} socket [The socket information]
 * @param  {Object} io     [The parent io socket]
 */
function joinInExistingGameRoom(user,socket,io){

}