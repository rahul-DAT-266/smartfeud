var UserModel=require('../models/users');
var DocumentModel = require('../models/documents');
var multer=require('multer');
var fs = require('fs');
var async = require('async');
var multiparty = require('multiparty');
module.exports=function ProfileController(){
    /**
    * <h1>[API] Get Profile Information</h1>
    * <p>This api use for get logged in user information</p>
    * @see API_BASE_URL+profile/get_profile</a>
    * @header Authorization: Auth Token [*Mandatory][String]
    * @header Content-Type: application/x-www-form-urlencoded
    * <pre>
    * {@code
    *    {
    *      "message": "Successfully Fetched",
    *      "status": "success",
    *      "result": {
    *        "mobile": "",
    *        "name": "Subrata Nandi",
    *        "image": "",
    *        "email": "subratan@digitalaptech.com"
    *      }
    *    }
    *}
    * </pre>
    * @author Soham Krishna Paul
    */
    this.get_profile=function(req,res,next){
        UserModel.findOne({_id:req.user._id},function(err,user){
            if(err)
               return res.json(Utility.output(Toster.FETCH_INFO_ERROR,'ERROR')); 
            if(!user)
                return res.json(Utility.output(Toster.USER_INFO_NOT_FOUND,'ERROR')); 
            var output={
                'mobile':user.mobile,
                'name':user.name,
                'image':user.image,
                'email':user.email,
            };
            if(user.image)
                if( user.image.indexOf('http://')!=-1 || user.image.indexOf('https://')!=-1){}
                else
                {
                    output.image=constants.profile_image_public_link+user.image;
                }
            return res.json(Utility.output(Toster.PROFILE_FETCHED,'SUCCESS',output));
        });
    };
    
    
    /**
    * <h1>[API] Upload Profile Image</h1>
    * <p>This api use for upload profile image</p>
    * @param {File} file [*Mandatory]
    * @see API_BASE_URL+profile/upload_image</a>
    * @header Authorization: Auth Token [*Mandatory][String]
    * <pre>
    * {@code
    *    {
    *      "message": "Profile Image Updated",
    *      "status": "success",
    *      "result": "BASE_URL+uploads/profile_images/image_name.extension"
    *    }
    *}
    * </pre>
    * @author Subrata Nandi
    */
    this.upload_image=function(req,res,next){
        UserModel.findOne({_id:req.user._id},function(err,user){
            if(err)
               return res.json(Utility.output(Toster.FETCH_INFO_ERROR,'ERROR')); 
            if(!user)
                return res.json(Utility.output(Toster.USER_INFO_NOT_FOUND,'ERROR')); 
            
            var storage = multer.diskStorage({
                destination: function (req, file, cb) {
                    cb(null, constants.profile_image_path)
                },
                filename: function (req, file, cb) {
                    cb(null, new Date().getTime()+'.'+((/[.]/.exec(file.originalname)) ? /[^.]+$/.exec(file.originalname) : ''))
                },
                fileFilter:function(req,res,cb){
                    if(Utility.IsNullOrEmpty(req.file.filename)){
                        return res.json(Utility.output(Toster.PROFILE_IMAGE_REQUIRED,'ERROR')); 
                    }
                    var extension=((/[.]/.exec(req.file.originalname)) ? /[^.]+$/.exec(req.file.originalname) : '');
                    if(extension == "jpg" || extension == "jpeg" || extension =="png" || extension == "gif")
                        cb(null,false);
                    else
                        cb(null,true);
                }
            });
            var upload = multer({ storage: storage }).single('profile_image');
            upload(req,res,function(err){
                if(err)
                    return res.json(Utility.output(err.stack,'ERROR')); 
                if(Utility.IsNullOrEmpty(req.file))
                    return res.json(Utility.output(Toster.PROFILE_IMAGE_REQUIRED,'ERROR'));
                if(user.image)
                    fs.unlink(constants.profile_image_path+'/'+user.image);
                  UserModel.update(
                    {_id:user._id},
                    { $set : {'image':req.file.filename}},function(err,numberUpdate){
                    if(err)
                        return res.json(Utility.output(Toster.PROFILE_UPDATE_ERROR,'ERROR'));
                    if(numberUpdate){
                        var result = {'path':req.file.filename};
                        return res.json(Utility.output(Toster.PROFILE_IMAGE_UPDATED,'SUCCESS',result)); 
                    }
                });
            });
        });
    };
    
    /**
    * <h1>[API] Edit Profile Infomation</h1>
    * <p>This api use for change/edit profile infomation</p>
    * @param {String} name [*Mandatory]
    * @param {String} mobile [Optional]
    * @see API_BASE_URL+profile/edit_profile</a>
    * @header Content-Type: application/x-www-form-urlencoded
    * @header Authorization: Auth Token [*Mandatory][String]
    * <pre>
    * {@code
    *    {
    *      "message": "Profile Updated",
    *      "status": "success",
    *      "result": ""
    *    }
    *}
    * </pre>
    * @author Subrata Nandi
    */
    this.edit_profile=function(req,res,next){
        req.assert('name',Toster.NAME_REQUIRED).notEmpty();
        req.assert('mobile',Toster.MOBILE_VALIDATE).optional().isLength({min:10,max:20});
        var errors=req.validationErrors();
        if(errors){
            var messages=[];
            errors.forEach(function(error){
                messages.push(error.msg);
            });
            return res.json(Utility.output(messages,'ERROR'));
        }
        UserModel.findOne({_id:req.user._id},function(err,user){
            if(err)
               return res.json(Utility.output(Toster.FETCH_INFO_ERROR,'ERROR')); 
            if(!user)
                return res.json(Utility.output(Toster.USER_INFO_NOT_FOUND,'ERROR')); 
            var update={
                'mobile':Utility.escape(req.body.mobile),
                'name':Utility.escape(req.body.name),
            };
            UserModel.update(
                {_id:user._id},
                { $set : update},function(err,numberUpdate){
                if(err)
                    return res.json(Utility.output(Toster.PROFILE_UPDATE_ERROR,'ERROR'));
                if(numberUpdate)
                    return res.json(Utility.output(Toster.PROFILE_UPDATED,'SUCCESS')); 
            });
        });
    };
    
    /**
    * <h1>[API] Change Existing Password</h1>
    * <p>This api use for change/edit profile infomation</p>
    * @param {String} old_password [*Mandatory]
    * @param {String} password [*Mandatory]
    * @see API_BASE_URL+profile/change_password</a>
    * @header Content-Type: application/x-www-form-urlencoded
    * @header Authorization: Auth Token [*Mandatory][String]
    * <pre>
    * {@code
    *    {
    *      "message": "Password Changed",
    *      "status": "success",
    *      "result": ""
    *    }
    *}
    * </pre>
    * @author Subrata Nandi
    */
    this.change_password=function(req,res,next){
        req.assert('old_password',Toster.OLD_PASS_REQUIRED).notEmpty();
        req.assert('password',Toster.NEW_PASS_REQUIRED).notEmpty();
        req.assert('password',Toster.PASSWORD_VALIDATE).isLength({min:6,max:20});
        var errors=req.validationErrors();
        if(errors){
            var messages=[];
            errors.forEach(function(error){
                messages.push(error.msg);
            });
            return res.json(Utility.output(messages,'ERROR'));
        }
        UserModel.findOne({_id:req.user._id},function(err,user){
            if(err)
                return res.json(Utility.output(Toster.FETCH_INFO_ERROR,'ERROR')); 
            if(!user.validPassword(req.body.old_password))
                return res.json(Utility.output(Toster.OLD_PASSWORD_NOT_MATCHED,'ERROR')); 
            var newPassword=user.encryptPassword(req.body.password);
            UserModel.update(
                    {_id:req.user._id},
                    { $set : { password:newPassword }},function(err,numberUpdate){
                if(err)
                    return res.json(Utility.output(Toster.SETTING_NEW_PASSWORD_ERROR,'ERROR'));
                if(numberUpdate)
                    return res.json(Utility.output(Toster.PASSWORD_CHANGED,'SUCCESS'));
                return res.json(Utility.output(Toster.USER_INFO_NOT_FOUND,'ERROR')); 
            });
        });
    };
    /**
    * <h1>[API] Document to be uploaded by User </h1>
    * <p>This api use for upload document by User which will be verified and approved by Admin</p>
    * @param {File} File name [*Mandatory]
    * @param {File} Extension [*Mandatory]
    * @see API_BASE_URL+profile/upload_document</a>
    * @header Content-Type: application/x-www-form-urlencoded
    * @header Authorization: Auth Token [*Mandatory][String]
    * <pre>
    * {@code
    *    {
    *      "message": "Document Uploaded",
    *      "status": "success",
    *      "result": ""
    *    }
    *}
    * </pre>
    * @author Subrata Nandi
    */
 this.upload_document=function(req,res,next){
        var form = new multiparty.Form();
        form.parse(req, function (err, fields, files) {
            // console.log(JSON.stringify(files));
            // console.log(JSON.stringify(fields));
             async.eachSeries(files.file_name, function (filestore, callback_each) {
                   if (!Utility.IsNullOrEmpty(filestore.path))
                           {
                           // var extension = ((/[.]/.exec(files.file_name[0].originalFilename)) ? /[^.]+$/.exec(files.file_name[0].originalFilename) : '');
                            var extension = ((/[.]/.exec(filestore.path)) ? /[^.]+$/.exec(filestore.path) : '');
                            if (extension == "jpg" || extension == "jpeg" || extension == "png" || extension == "gif" || extension == "pdf" ) {
                                fs.readFile(filestore.path, function (err, data) {
                                    if (err)
                                      {
                                        console.log('reading file error:'+err);
                                        return callback_each();
                                      }else{
                                    var rand_val = Math.floor(1000 + Math.random() * 9000);
                                    var fileNamex = new Date().getTime() + rand_val + '.' + extension;
                                    var newPath = constants.document_upload_path + '/' + fileNamex;
                                    fs.writeFile(newPath, data, function (err) {
                                        if (err) {
                                            console.log('error uploading file:'+err);
                                            return callback_each();
                                        } else {
                                            // console.log('New File:'+fileNamex);
                                           // return callback_each();
                                            var newDocument = new DocumentModel();
                                            newDocument._user = req.user._id;
                                            newDocument.temp_identifier = filestore.path;
                                            newDocument.file_name = filestore.originalFilename;
                                            newDocument.file_extension = extension;
                                            newDocument.start_upload_time = new Date().getTime();
                                            newDocument.file_size=filestore.size;
                                            newDocument.storage_file_name=fileNamex;
                                            newDocument.__v = "0.0";
                                            newDocument.end_upload_time = new Date().getTime();
                                            newDocument.save(function (err) {
                                                if (err) {
                                                        return err;
                                                }
                                                else {
                                                    console.log("document uploaded succesfully");
                                                }
                                            });
                                            return callback_each();
                                         }
                                    });
                                  }
                                });
                            } else
                            {
                                errors.push('Only image file[*.jpg/*.jpeg/*.png/*.gif] will be accepted');
                                return callback_each();
                            }
                        }
                    }, function (calback_each) {
                        if (err) { throw err; }
                        console.log('Well done :-)!');
                        return res.json(Utility.output('File Uploded','SUCCESS',calback_each));
                    });
                   
        });
    };
};
