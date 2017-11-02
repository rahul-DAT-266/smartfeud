var mongoose=require('mongoose');
//var bcrypt=require('bcrypt-nodejs');
var Schema=mongoose.Schema;

var testsSchema=new Schema({
    test:{type:String}
});
module.exports=mongoose.model('tests',testsSchema);