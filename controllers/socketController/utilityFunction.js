var UserModel = require('../../models/User'),
    //GameModel = require('../../models/Test_game');
    GameModel = require('../../models/Game_room');


function UtlitySocketFunction() {
    /**
     * This function use for check authentication of
     * the users in a particular socket
     * @param  {Object}  io [description]
     * @return {[type]}    [description]
     */
    function checkAuthentication(socket, io) {
        //console.log(socket.handshake.query)
        if (socket.handshake.query && socket.handshake.query.Authorization) {

            UserModel.findOne({
                auth_token: socket.handshake.query.Authorization
            }, function(err, userDetails) {
                if (err) {
                    socket.emit('login_ack_err', err);
                } else {
                    if (userDetails) {
                        mappingOnlineUsers(userDetails, socket, io);
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
        joinInExistingGameRoom(user, socket, io);
    }

    /**
     * This function use for add particular member in existing 
     * game room
     * @param  {Object} user   [The Users information]
     * @param  {Object} socket [The socket information]
     * @param  {Object} io     [The parent io socket]
     */
    function joinInExistingGameRoom(user, socket, io) {
        var searchQuery = {};

        searchQuery["$or"] = [{
            send_from: user._id
        }, {
            send_to: {
                "$elemMatch": {
                    opponent_id: user._id,
                    status: 1
                }
            }
        }];


        GameModel.find(searchQuery)
            .lean(true)
            .exec(function(err, gameRoomData) {
                if (err) {

                } else {
                    if (gameRoomData.length) {
                        joinInGameRoomUtility(gameRoomData, socket);
                    }
                }
            })
    }

    /**
     * This function is used to join a member 
     * in all existing room
     * @param  {Array}   gameRoomData  [This is the array of game data]
     * @param  {Object}  socket        [This is the socket object]
     * @param  {Function} cb           [This is the callback function]
     */
    function joinInGameRoomUtility(gameRoomData, socket) {

        for (var i = 0; i < gameRoomData.length; i++) {
            (function(value) {
                setTimeout(function() {
                    socket.join(value.toString())
                }, 0);
            })(gameRoomData[i]._id);
        }
    }


    return {
        checkAuthentication: checkAuthentication
    }

}


module.exports = {
    utlitySocketFunction: UtlitySocketFunction
};