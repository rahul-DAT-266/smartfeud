var mongoose=require('mongoose');
var Schema=mongoose.Schema;

var challengeSchema=new Schema({
    send_to : {type:mongoose.Schema.Types.ObjectId,ref:'User'},
    send_from : {type:mongoose.Schema.Types.ObjectId,ref:'User'},
    language_name : {type:String},
    board_layout : {type:String},
    game_mode : {type:String},
    send_date : {type:Number,default:new Date().getTime()},
    waiting_time : {type:Number},
    is_accepted : {type:Number,default:0},
});

module.exports=mongoose.model('Challenge',challengeSchema);
