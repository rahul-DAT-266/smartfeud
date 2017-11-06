'use strict';


module.exports = function(io) {
	require('../controllers/socketController/index').socketConnection(io)
		//require('../controller/socketController/game')(io),
}