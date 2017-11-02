var mongoose=require('mongoose');
var Schema=mongoose.Schema;

var dictionarySchema=new Schema({
    language_code : {type:String},
    dictionary : {type:Array}
});

module.exports=mongoose.model('Dictionary',dictionarySchema);
