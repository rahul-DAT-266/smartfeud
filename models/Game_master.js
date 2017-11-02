var mongoose=require('mongoose');
var Schema=mongoose.Schema;

var game_masterSchema=new Schema({
    no_of_characters : {type:Number},
    total_characters : {type:Array},
    language : {type:Array},
    language_code : {type:Array},
    date_of_creation:{type:Number,required:true,default:new Date().getTime()},
    date_of_modification:{type:Number,required:true,default:new Date().getTime()},
    status : {type:Number,default:0}
});

module.exports=mongoose.model('Game_master',game_masterSchema);
