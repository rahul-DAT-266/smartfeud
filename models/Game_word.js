var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var game_wordSchema = new Schema({
    letter: [{
        "charecter": {
            type: String
        },
        "value": {
            type: Number,
            default: 0
        }
    }],
    language: { type: String },
    language_code: { type: String },
    date_of_creation: { type: Number, required: true, default: new Date().getTime() },
    date_of_modification: { type: Number, required: true, default: new Date().getTime() },
    status: { type: Number, default: 0 }
});

module.exports = mongoose.model('Game_word', game_wordSchema);