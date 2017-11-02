var mongoose=require('mongoose');
var Schema=mongoose.Schema;

var friendSchema=new Schema({
    user_id : {type:mongoose.Schema.Types.ObjectId,ref:'User'},
    friend_id : {type:mongoose.Schema.Types.ObjectId,ref:'User'},
    add_date : {type:Number,default:new Date().getTime()}
});

module.exports=mongoose.model('Friend',friendSchema);
