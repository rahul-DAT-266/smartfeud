var mongoose=require('mongoose');
//var bcrypt=require('bcrypt-nodejs');
var Schema=mongoose.Schema;

var usersSchema=new Schema({
    email:{type:String,required:true,max:255,lowercase:true,trim:true},
    password:{type:String,min:6},
    _login_type:{type:Number,default:1,required:true},
    name:{type:String,required:true,max:255,min:3},
    social_id:{type:String,max:255},
    description:{type:String},
    mobile:{type:String,max:20},
    image:{type:String},
    v_code:{type:String},
    forget_password_request:{type:String},
    custom_status:{type:Number,default:-99},
    is_login:{type:Number,default:0},//0=Logout//1=Online
    status:{type:Number,default:0},//0=Inactive,1=Active,2=Blocked,3=Partially Deleted/4=Invited Non-Registered User
    last_activity:{type:Number},
    date_of_creation:{type:Number,required:true,default:new Date().getTime()},
    date_of_modification:{type:Number,required:true,default:new Date().getTime()}
});
// usersSchema.methods.generateVcode=function(time){
//     return bcrypt.hashSync(time,bcrypt.genSaltSync(5),null);
// };
// usersSchema.methods.encryptPassword=function(password){
//     return bcrypt.hashSync(password,bcrypt.genSaltSync(5),null);
// };
// usersSchema.methods.validPassword=function(password){
//     if(!this.password)
//         return false;
//     return bcrypt.compareSync(password,this.password);
// };
module.exports=mongoose.model('user',usersSchema);