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
    language_code: { type: String },
    board_layout: { type: String },
    game_mode: { type: String },
    send_date: { type: Number, default: new Date().getTime() },
    waiting_time: { type: Number },
    letter: [{
        "charecter": {
            type: String
        },
        "value": {
            type: Number,
            default: 0
        }
    }],
    current_turn: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    next_turn: [{
        "next_turn_id": {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    last_word: { type: String },
    boardlayout_position: { type: Array },
    board_letters: [{
        "letter": {
            type: String
        },
        "val": {
            type: Number
        },
        "index": {
            type: Number
        },
    }],
    game_status: { type: Number, default: 0 },
});

module.exports = mongoose.model('Game', gameSchema);