var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var user_rankSchema = new Schema({
    game_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Game_room' },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rank: { type: Number }
});

module.exports = mongoose.model('User_rank', user_rankSchema);