'use strict';


module.exports = function(io) {
    require('../controllers/socketController/index').socketConnection(io),
        require('../controllers/socketController/game')(io)
}