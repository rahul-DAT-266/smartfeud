var mongoose=require('mongoose');
var Schema=mongoose.Schema;

var blockUserSchema=new Schema({
    user_id : {type:mongoose.Schema.Types.ObjectId,ref:'User'},
    block_id : {type:mongoose.Schema.Types.ObjectId,ref:'User'},
    block_date : {type:Number,default:new Date().getTime()}
});

module.exports=mongoose.model('Block_user',blockUserSchema);
