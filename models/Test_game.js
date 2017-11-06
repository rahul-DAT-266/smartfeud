var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var test_gameSchema = new Schema({
    sender_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    receive_id: [{
        "opponent_id": {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        "status": {
            type: Number,
            default: 0
        }
    }]
});
module.exports = mongoose.model('Test_game', test_gameSchema);