var mongoose=require('mongoose');
var Schema=mongoose.Schema;

var userTypesSchema=new Schema({
    type:{type:String,required:true,max:255},
    slug:{type:String,required:true,max:255,unique:true},
    date_of_creation:{type:Number,required:true,default:new Date().getTime()},
    date_of_modification:{type:Number,required:true,default:new Date().getTime()}
});
module.exports=mongoose.model('user_types',userTypesSchema);