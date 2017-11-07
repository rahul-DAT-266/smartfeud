var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var gameSchema = new Schema({
    send_to: [{
        "opponent_id": {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        "status": {
            type: Number,
            default: 0
        }
    }],
    send_from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    number_of_player: { type: Number },
    language_name: { type: String },
    board_layout: { type: String },
    game_mode: { type: String },
    send_date: { type: Number, default: new Date().getTime() },
    waiting_time: { type: Number },
    game_status: { type: Number, default: 0 },
});

module.exports = mongoose.model('Game', gameSchema);