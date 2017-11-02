var express = require('express');
var router = express.Router();
var UserController=new require('../controllers/UserController');
var ProfileController=new require('../controllers/ProfileController');

var UserControllerInstance=new UserController();
var ProfileControllerInstance=new ProfileController();
router.post('/get_profile',function(req,res,next){ 
     ProfileControllerInstance.get_profile(req,res,next);
});
router.post('/edit_profile',function(req,res,next){
    ProfileControllerInstance.edit_profile(req,res,next);
});
router.post('/change_password',UserControllerInstance.isLoggedIn,function(req,res,next){
    ProfileControllerInstance.change_password(req,res,next);
});
router.post('/upload_image',UserControllerInstance.isLoggedIn,function(req,res,next){
    ProfileControllerInstance.upload_image(req,res,next);
});

module.exports = router;

