var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var user_rankSchema = new Schema({
    game_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Game' },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    current_letter: [{
        "charecter": {
            type: String
        },
        "value": {
            type: Number,
            default: 0
        }
    }],
    used_letter: [{
        "charecter": {
            type: String
        },
        "value": {
            type: Number,
            default: 0
        }
    }],
    rank: { type: Number },
    score: { type: Number, default: 0 },
});

module.exports = mongoose.model('User_rank', user_rankSchema);