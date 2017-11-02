var UserModel = require('../models/users');
var UserType = require('../models/user_types');
var UserLogModel = require('../models/user_log');
var PaymentModel = require('../models/payments');
var TransactionsModel = require('../models/transactions');
var passport = require('passport');
var jwt = require('jsonwebtoken');
var NodeRSA = require('node-rsa');
var request = require('request');
var EmailController = require('./EmailTemplateController');
var template_instance = new EmailController();

module.exports = function UserController() {
    /**
     * <h1>[API] User Normal Signup</h1>
     * <p>This api use for user signup[registration] by email id</p>
     * @see API_BASE_URL+user/signup</a>
     * @param {String} email [*Mandatory][Valid Email]
     * @param {String} password [*Mandatory]
     * @param {String} name [*Mandatory]
     * @param {String} mobile [Optional]
     * @header Content-Type: application/x-www-form-urlencoded
     * <pre>
     * {@code
     *    {
     *      "message": "Congratulation!! Your registration has been successfully made, Please verify your account",
     *      "status": "success",
     *      "result": ""
     *    }
     * </pre>
     * @author Subrata Nandi
     */

    this.signup = function (req, res, next) {
        var currentTime = new Date().getTime();
        req.assert('email', Toster.EMAIL_REQUIRED).notEmpty();
        req.assert('email', Toster.VALID_EMAIL).isEmail();
        req.assert('password', Toster.PASSWORD_REQUIRED).notEmpty(); // Adding validation rules over password
        req.assert('password', Toster.PASSWORD_VALIDATE).optional().isLength({min: 6, max: 20}); // Adding validation rules over password
        req.assert('name', Toster.NAME_REQUIRED).notEmpty();
        req.assert('name', Toster.NAME_MINIMUM).optional().isLength({min: 3, max: 255});
        req.assert('mobile', Toster.MOBILE_VALIDATE).optional().isLength({min: 10, max: 20});
        var errors = req.validationErrors();
        if (errors) {
            var messages = [];
            errors.forEach(function (error) {
                 messages.push(error.msg);
            });
           return res.json(Utility.output(messages, 'ERROR'));
        }
        UserModel.findOne({email: Utility.escape(req.body.email.toLowerCase()), status: {$ne: 3}}, function (err, user) {
            var isNewUser = true;
            if (err) {
                return res.json(Utility.output(err, 'ERROR'));
            }
            if (user)
            {
                if (user.status == 1 || user.status == 0 || user.status == 2)
                    return res.json(Utility.output(Toster.EMAIL_ALREADY_USED, 'ERROR'));
            }
            if (isNewUser)
            {
                /****************New User*****************/
                UserType.findOne({slug: 'end-user'}, function (err, userType) {
                    var newUser = new UserModel();
                    newUser.email = Utility.escape(req.body.email.toLowerCase().toLowerCase());
                    newUser.status = 0;
                    newUser.image = "nayantara.jpg";
                    newUser.password = newUser.encryptPassword(req.body.password); //Adding password
                    newUser.v_code = newUser.generateVcode(currentTime); // Adding Email Verification Code
                    newUser.name = Utility.escape(req.body.name);
                    newUser.mobile = Utility.escape(req.body.mobile);
                    newUser.currency = SITE_SETTINGS.SITE_DEFAULT_CURRENCY;
                    newUser._user_type = userType;
                    newUser.date_of_creation = currentTime;
                    newUser.date_of_modification = currentTime;
                    newUser.save(function (err, result) {
                        if (err) {
                            return res.json(Utility.output(err, 'ERROR'));
                        }
                        /********If normal User send welcome and verification email*****/
                        //-------------------edited subrata nandi--------------------------
                        var data = {
                            company_name: SITE_SETTINGS.COMPANY_NAME,
                            site_name: SITE_SETTINGS.SITE_NAME,
                            contact_person_name: req.body.name,
                            contact_person_email: req.body.email,
                            contact_person_password: req.body.password,
                            join_ucm: constants.base_url + '#/login',
                            signup_verify: constants.base_url + '#/verification/' + encodeURI(result.v_code),
                            subscribe_ucm: constants.base_url
                        };
                        template_instance.load_template('WELCOME', data, function (error, html) {
                            if (error)
                            {
                                return res.json(Utility.output(error, 'ERROR'));
                            }
                            var opta = {
                                to: req.body.email.toLowerCase(),
                                sub: SITE_SETTINGS.SITE_NAME + ": "+Toster.THANK_CONTACT,
                                body: html
                            }
                            Utility.sendMail(opta, function (err, info) {
                                if (err) {
                                    return console.log(err);
                                }
                                console.log('Message sent: ' + info.response);
                            });
                            return res.status(200).json(Utility.output(Toster.REGISTRATION_COMPLETE, 'SUCCESS'));
                        });
                        //-------------------edited subrata nandi--------------------------

                    });
                });
            }
        });
    };

    /**
     * <h1>[API] User Facebook Signup</h1>
     * <p>This api use for facebook user signup[registration]</p>
     * @see API_BASE_URL+user/facebook_signup</a>
     * @param {String} email [*Mandatory][Valid Email]
     * @param {String} facebook_id [*Mandatory]
     * @param {String} name [*Mandatory]
     * @param {String} mobile [Optional]
     * @param {String} access_token [*Mandatory] [You will be got from FB return response]
     * @header Content-Type: application/x-www-form-urlencoded
     * <pre>
     * {@code
     *    {
     *      "message": "Congratulation!! Your registration has been successfully made, Please verifsy your account",
     *      "status": "success",
     *      "result": ""
     *    }
     * </pre>
     * @author Subrata Nandi
     */
    this.facebook_signup = function (req, res, next) {
        req.assert('access_token', Toster.FB_TOKEN_REQUIRED).notEmpty();
        req.assert('email', Toster.EMAIL_REQUIRED).notEmpty();
        req.assert('email', Toster.VALID_EMAIL).isEmail();
        req.assert('name', Toster.NAME_REQUIRED).notEmpty();
        req.assert('name', Toster.NAME_MINIMUM).optional().isLength({min: 3, max: 255});
        var errors = req.validationErrors();
        if (errors) {
            var messages = [];
            errors.forEach(function (error) {
                messages.push(error.msg);
            });
            return res.json(Utility.output(messages, 'ERROR'));
        }
        passport.authenticate('facebook-token', { session: false},function(err, profile, info){
            var returnObj={
                'profile':{},
                'user':{}
            };
            console.log(err);
            if(!Utility.IsNullOrEmpty(err))
                if(!Utility.IsNullOrEmpty(err.oauthError))
                   return res.json(Utility.output(Toster.INVALID_ACCESS_TOKEN,'ERROR'));
            if(!profile)
                return res.json(Utility.output(Toster.FB_PROFILE_NOT_FOUND,'ERROR'));
            returnObj.profile=profile;
            UserModel.findOne({facebook_id: profile.id,'status':{$ne:3}}, function(err, user) {
                if (err) {
                    return res.json(Utility.output(err,'ERROR'));
                }
                if (user) {
                    returnObj.user=user;
                }
                return res.json(Utility.output('Valid Token','SUCCESS',returnObj));
            });
        })(req,res,next); 
    };

    /**
     * <h1>[API] User Google Signup</h1>
     * <p>This api use for google user signup[registration]</p>
     * @see API_BASE_URL+user/google_signup</a>
     * @param {String} email [*Mandatory][Valid Email]
     * @param {String} google_id [*Mandatory]
     * @param {String} name [*Mandatory]
     * @param {String} mobile [Optional]
     * @param {String} access_token [*Mandatory] [You will be got from FB return response]
     * @header Content-Type: application/x-www-form-urlencoded
     * <pre>
     * {@code
     *    {
     *      "message": "Congratulation!! Your registration has been successfully made, Please verify your account",
     *      "status": "success",
     *      "result": ""
     *    }
     * </pre>
     * @author Soham Krishna Paul
     */
    this.google_signup = function (req, res, next) {
        req.assert('access_token', Toster.GOOGLE_TOKEN_REQUIRED).notEmpty();
        req.assert('email', Toster.EMAIL_REQUIRED).notEmpty();
        req.assert('email', Toster.VALID_EMAIL).isEmail();
        req.assert('name', Toster.NAME_REQUIRED).notEmpty();
        req.assert('name', Toster.NAME_MINIMUM).optional().isLength({min: 3, max: 255});

        var errors = req.validationErrors();
        if (errors) {
            var messages = [];
            errors.forEach(function (error) {
                messages.push(error.msg);
            });
            return res.json(Utility.output(messages, 'ERROR'));
        }
        //Verify access_token is valid or not from google [OAuth2 Verification]
        passport.authenticate('google-plus-token', { session: false},function(err, profile, info){
            var returnObj={
                'profile':{},
                'user':{}
            };
            if(!Utility.IsNullOrEmpty(err))
                if(!Utility.IsNullOrEmpty(err.name))
                    if(err.name === "InternalOAuthError")
                        return res.json(Utility.output(Toster.INVALID_ACCESS_TOKEN,'ERROR'));
            if(!profile)
                return res.json(Utility.output(Toster.GOOGLE_PROFILE_NOT_FOUND,'ERROR'));
            returnObj.profile=profile;
            UserModel.findOne({google_id: profile.id,'status':{$ne:3}}, function(err, user) {
                if (err) {
                    return res.json(Utility.output(err,'ERROR'));
                }
                if (user) {
                    returnObj.user=user;
                }
                return res.json(Utility.output(Toster.VALID_TOKEN,'SUCCESS',returnObj));
            });
        })(req,res,next);
                //return res.send(returnObj);
                // UserType.findOne({slug: 'end-user'}, function (err, userType) {
                //     var currentTime = new Date().getTime();
                //     var newUser = new UserModel();
                //     newUser.email = Utility.escape(req.body.email.toLowerCase().toLowerCase());
                //     newUser.image = "";
                //     newUser.password = null;
                //     newUser.v_code = null;
                //     newUser.google_id = returnObj.profile.id; // Assign Google ID
                //     newUser.status = 1; //Default Activate Account no need to set any email verification code.
                //     newUser.image = Utility.escape(req.body.image); //Adding Facebook of Google Profile image path
                //     newUser.name = (req.body.name) ? Utility.escape(req.body.name) : 'Utitled';
                //     newUser._user_type = userType;
                //     newUser.date_of_creation = currentTime;
                //     newUser.date_of_modification = currentTime;
                //     if (req.body.image)
                //         newUser.image = Utility.escape(req.body.image);
                //     newUser.save(function (err, result) {
                //         if (err) {
                //             return res.json(Utility.output(err, 'ERROR'));
                //         }
                //         /********If facebook/google User send welcome email*****/
                //         var opta = {
                //             'to': req.body.email.toLowerCase(),
                //             'sub': "Your " + SITE_SETTINGS.SITE_NAME + Toster.ACCOUNT_CREATED,
                //             'body': 'Hello ' + Utility.escape(req.body.name) + '<br/><br/>\n\
                //                     Welcome to ' + SITE_SETTINGS.SITE_NAME + '<br/>'
                //         };
                //         Utility.sendMail(opta, function (err, info) {
                //             if (err) {
                //                 return console.log(err);
                //             }
                //         });
                //         return res.json(Utility.output(Toster.REGISTRATION_COMPLETED, 'SUCCESS'));
                //     });
                // });
            // } else
            //     return res.json(Utility.output(Toster.SOMETHING_WRONG, 'ERROR'));
        //});
    };

    /**
     * <h1>[API] User Linkedin Signup</h1>
     * <p>This api use for linkedin user signup[registration]</p>
     * @see API_BASE_URL+user/linkedin_signup</a>
     * @param {String} email [*Mandatory][Valid Email]
     * @param {String} linkedin_id [*Mandatory]
     * @param {String} name [*Mandatory]
     * @param {String} mobile [Optional]
     * @param {String} access_token [*Mandatory] [You will be got from FB return response]
     * @header Content-Type: application/x-www-form-urlencoded
     * <pre>
     * {@code
     *    {
     *      "message": "Congratulation!! Your registration has been successfully made, Please verify your account",
     *      "status": "success",
     *      "result": ""
     *    }
     * </pre>
     * @author Soham Krishna Paul
     */
    this.linkedin_signup = function (req, res, next) {
        req.assert('access_token', Toster.LINKEDIN_TOKEN_REQUIRED).notEmpty();
        req.assert('email', Toster.EMAIL_REQUIRED).notEmpty();
        req.assert('email', Toster.VALID_EMAIL).isEmail();
        req.assert('linkedin_id', Toster.LINKEDIN_ID_REQUIRED).notEmpty(); //Addinf Facebook id is required input.
        req.assert('name', Toster.NAME_REQUIRED).notEmpty();
        req.assert('name', Toster.NAME_MINIMUM).optional().isLength({min: 3, max: 255});
        var errors = req.validationErrors();
        if (errors) {
            var messages = [];
            errors.forEach(function (error) {
                messages.push(error.msg);
            });
            return res.json(Utility.output(messages, 'ERROR'));
        }
        //Verify access_token is valid or not from linkedin [OAuth2 Verification]
         passport.authenticate('linkedin-token', { session: false},function(err, profile, info){
            var returnObj={
                'profile':{},
                'user':{}
            };
            if(!Utility.IsNullOrEmpty(err))
                if(!Utility.IsNullOrEmpty(err.oauthError))
                   return res.json(Utility.output(Toster.INVALID_ACCESS_TOKEN,'ERROR'));
            if(!Utility.IsNullOrEmpty(info))
                if(!Utility.IsNullOrEmpty(info.oauthError))
                   return res.json(Utility.output(Toster.INVALID_ACCESS_TOKEN,'ERROR'));
            if(!profile)
                return res.json(Utility.output(Toster.LINKEDIN_PROFILE_NOT_FOUND,'ERROR'));
            returnObj.profile=profile;
            UserModel.findOne({linkedin_id: profile.id,'status':{$ne:3}}, function(err, user) {
                if (err) {
                    return res.json(Utility.output(err,'ERROR'));
                }
                if (user) {
                    returnObj.user=user;
                }
                return res.json(Utility.output(Toster.VALID_TOKEN,'SUCCESS',returnObj));
            });
        })(req,res,next);
                //return res.send(returnObj);
            //     UserType.findOne({slug: 'end-user'}, function (err, userType) {
            //         var currentTime = new Date().getTime();
            //         var newUser = new UserModel();
            //         newUser.email = Utility.escape(req.body.email.toLowerCase().toLowerCase());
            //         newUser.image = "";
            //         newUser.password = null;
            //         newUser.v_code = null;
            //         newUser.linkedin_id = returnObj.profile.id; // Assign Google ID
            //         newUser.status = 1; //Default Activate Account no need to set any email verification code.
            //         newUser.image = Utility.escape(req.body.image); //Adding Facebook of Google Profile image path
            //         newUser.name = (req.body.name) ? Utility.escape(req.body.name) : 'Utitled';
            //         newUser._user_type = userType;
            //         newUser.date_of_creation = currentTime;
            //         newUser.date_of_modification = currentTime;
            //         if (req.body.image)
            //             newUser.image = Utility.escape(req.body.image);
            //         newUser.save(function (err, result) {
            //             if (err) {
            //                 return res.json(Utility.output(err, 'ERROR'));
            //             }
            //             /********If facebook/google User send welcome email*****/
            //             var opta = {
            //                 'to': req.body.email.toLowerCase(),
            //                 'sub': "Your " + SITE_SETTINGS.SITE_NAME + " Account has been Created",
            //                 'body': 'Hello ' + Utility.escape(req.body.name) + '<br/><br/>\n\
            //                         Welcome to ' + SITE_SETTINGS.SITE_NAME + '<br/>'
            //             };
            //             Utility.sendMail(opta, function (err, info) {
            //                 if (err) {
            //                     return console.log(err);
            //                 }
            //             });
            //             return res.json(Utility.output(Toster.REGISTRATION_COMPLETED, 'SUCCESS'));
            //         });
            //     });
            // } else
            //     return res.json(Utility.output(Toster.SOMETHING_WRONG, 'ERROR'));
       //});
    };

    /**
     * <h1>[API] User Normal Login</h1>
     * <p>This api use for user login by email id</p>
     * @see API_BASE_URL+user/login</a>
     * @param {String} email [*Mandatory][Valid Email]
     * @param {String} password [*Mandatory]
     * @param {String} browser_token [*Mandatory]
     * @header Content-Type: application/x-www-form-urlencoded
     * <pre>
     * {@code
     *    {
     *      "message": "Successfully logged in",
     *      "status": "success",
     *      "result": {
     *        "user": {
     *          "_id": "582ec52757af7013c0bf2f6c",
     *          "date_of_modification": 1479460135101,
     *          "date_of_creation": 1479460135101,
     *          "mobile": "",
     *          "name": "Soham Krishna Paul",
     *          "email": "support.fdxz@gmail.com",
     *          "image": "",
     *          "status": 1,
     *          "custom_status": -99
     *        },
     *        "auth_token": "JWT eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI1ODJlYzUyNzU3YWY3MDEzYzBiZjJmNmMiLCJkYXRlX29mX21vZGlmaWNhdGlvbiI6MTQ3OTQ2MDEzNTEwMSwiZGF0ZV9vZl9jcmVhdGlvbiI6MTQ3OTQ2MDEzNTEwMSwibW9iaWxlIjoiIiwibmFtZSI6IlNvaGFtIEtyaXNobmEgUGF1bCIsImVtYWlsIjoic3VwcG9ydC5mZHh6QGdtYWlsLmNvbSIsImltYWdlIjoiIiwic3RhdHVzIjoxLCJjdXN0b21fc3RhdHVzIjotOTksImlhdCI6MTQ3OTQ2MDU3NCwiYXVkIjoiWXV2aXRpbWUuY29tLmF1IiwiaXNzIjoiWXV2aXRpbWUuY29tIn0.dWLcuykEvGALyBUt3uAytnuD6QfNtNaOvgf4pN29sLHqseVZz8uKhltPR4PPazVNJkRF1oXTvapjqagKKP4k5Q"
     *      }
     *    }
     * </pre>
     * @author Subrata Nandi
     * 
     */
    this.login = function (req, res, next) {
        var requestParser = require('ua-parser').parse(req.headers['user-agent']);
        var currentTime = new Date().getTime();
        req.assert('email', Toster.EMAIL_REQUIRED).notEmpty();
        req.assert('email', Toster.VALID_EMAIL).isEmail();
        req.assert('password', Toster.PASSWORD_REQUIRED).notEmpty(); //Adding Password Validation rule
        //req.assert('browser_token','Browser Token is required').notEmpty();

        var errors = req.validationErrors();
        if (errors) {
            var messages = [];
            errors.forEach(function (error) {
                messages.push(error.msg);
            });
            return res.json(Utility.output(messages, 'ERROR'));
        }
        var searchKey = {
            'email': req.body.email.toLowerCase()
        };

        UserModel.findOne(searchKey).populate('_user_type').exec(function (err, user) {
            if (err) {
                return res.json(Utility.output(err, 'ERROR'));
            }
            if (!user) {
                return res.json(Utility.output(Toster.USER_NOT_FOUND, 'ERROR'));
            } else {
                if (!user.validPassword(req.body.password)) {
                    return res.json(Utility.output(Toster.INVALID_PASSWORD, 'ERROR'));
                }
                if (user.status == 0)
                    return res.json(Utility.output(Toster.ACCOUNT_VERIFICATION_REQUIRED, 'ERROR'));
                if (user.status == 3)
                    return res.json(Utility.output(Toster.ACCOUNT_REMOVE, 'ERROR'));
                if (user.status == 2)
                    return res.json(Utility.output(Toster.ACCOUNT_BLOCKED_BY_ADMIN, 'ERROR'));
          
           var transCoins;
           TransactionsModel.find({'_user':user._id,'status':'1'},function(err,result){
                 if(err)
                  {
                    transCoins = Utility.output('Data not found', 'ERROR');
                  
                   }
                 else{
                     transCoins = Utility.output('Data found', 'SUCCESS',result);
                 var tokenUserDetails = {
                    "_id": user._id,
                    "date_of_modification": user.date_of_modification,
                    "date_of_creation": user.date_of_creation,
                    "mobile": user.mobile,
                    "name": user.name,
                    "email": user.email,
                    "image": user.image,
                    "facebook_id": null,
                    "google_id": null,
                    "linkedin_id": null,
                    "status": 1,
                    "custom_status": -99,
                    "last_activity": user.last_activity,
                    "user_type": user._user_type.type.toUpperCase()
                    };
                tokenUserDetails.Coins = transCoins;
                if (user.image)
                    if (user.image.indexOf('http://') > -1 || user.image.indexOf('https://') > -1) {
                    } else {
                        //tokenUserDetails.image = constants.profile_image_public_link + user.image;
                        tokenUserDetails.image =  user.image;
                    }
                 if (!user.image)
                    if (user.image.indexOf('http://') > -1 || user.image.indexOf('https://') > -1) {
                    } else {
                        tokenUserDetails.image =  user.image;
                    }
               
                    jwt.sign({'_id':user._id}, constants.getPrivateKey(), {
                        'algorithm':constants.algorithms,
                        'audience':constants.audience,
                        'issuer':constants.issuer,
                        }, function(err, token) {
                            if(err)
                                return res.json(Utility.output(err,'ERROR')); 
                            /*
                            var newLog=new UserLogModel();
                            newLog._user=user;
                            newLog.device=Utility.escape(req.body.device);
                            newLog.browser=Utility.escape(req.body.browser);
                            newLog.os=Utility.escape(req.body.os);
                            newLog.ip=Utility.escape(req.body.ip.replace('::ffff:',''));
                            newLog.auth_token='JWT '+token;
                            newLog.login_time=currentTime;
                            newLog.start_activity=currentTime;
                            newLog.last_activity=currentTime;
                            newLog.save();
                            console.log(token);*/
                           
                            tokenUserDetails.auth_token='JWT '+token;
                            return res.json(Utility.output('Successfully Logged IN','SUCCESS',tokenUserDetails)); 
                    }); 
                  }
                });
              }
        });
    };

    /**
     * <h1>[API] User Facebook Login</h1>
     * <p>This api use for user login by facebook account</p>
     * @see API_BASE_URL+user/facebook_login</a>
     * @param {String} access_token [*Mandatory][You will get this access token from FB API]
     * @param {String} facebook_id [*Mandatory]
     * @param {String} browser_token [*Mandatory]
     * @header Content-Type: application/x-www-form-urlencoded
     * <pre>
     * {@code
     *    {
     *      "message": "Successfully logged in",
     *      "status": "success",
     *      "result": {
     *        "user": {
     *          "_id": "582ec52757af7013c0bf2f6c",
     *          "date_of_modification": 1479460135101,
     *          "date_of_creation": 1479460135101,
     *          "mobile": "",
     *          "name": "Soham Krishna Paul",
     *          "email": "support.fdxz@gmail.com",
     *          "image": "",
     *          "status": 1,
     *          "custom_status": -99
     *        },
     *        "auth_token": "JWT eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI1ODJlYzUyNzU3YWY3MDEzYzBiZjJmNmMiLCJkYXRlX29mX21vZGlmaWNhdGlvbiI6MTQ3OTQ2MDEzNTEwMSwiZGF0ZV9vZl9jcmVhdGlvbiI6MTQ3OTQ2MDEzNTEwMSwibW9iaWxlIjoiIiwibmFtZSI6IlNvaGFtIEtyaXNobmEgUGF1bCIsImVtYWlsIjoic3VwcG9ydC5mZHh6QGdtYWlsLmNvbSIsImltYWdlIjoiIiwic3RhdHVzIjoxLCJjdXN0b21fc3RhdHVzIjotOTksImlhdCI6MTQ3OTQ2MDU3NCwiYXVkIjoiWXV2aXRpbWUuY29tLmF1IiwiaXNzIjoiWXV2aXRpbWUuY29tIn0.dWLcuykEvGALyBUt3uAytnuD6QfNtNaOvgf4pN29sLHqseVZz8uKhltPR4PPazVNJkRF1oXTvapjqagKKP4k5Q"
     *      }
     *    }
     * </pre>
     * @author Subrata Nandi
     */
    this.facebook_login = function (req, res, next) {
        var requestParser = require('ua-parser').parse(req.headers['user-agent']);
        var currentTime = new Date().getTime();
        req.assert('user_id','User ID is required').notEmpty();
        req.assert('access_token', Toster.FB_TOKEN_REQUIRED).notEmpty();

        var errors = req.validationErrors();
        if (errors) {
            var messages = [];
            errors.forEach(function (error) {
                messages.push(error.msg);
            });
            return res.json(Utility.output(messages, 'ERROR'));
        }

        //Verify access_token is valid or not from facebook [OAuth2 Verification]
        var headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        }

        var options = {
            'url': constants.auth_server + '/verify_facebook_auth',
            'method': 'POST',
            'headers': headers,
            'form': {
                'access_token': req.body.access_token,
            }
        };
        //Verify Facebook Auth Token
        request(options, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                body = JSON.parse(body);
                if (body.status == "error")
                    return res.json(Utility.output(body.message, 'ERROR'));
                returnObj = body.result;
                if (returnObj.user)
                {
                    if (returnObj.user.status == 3)
                        return res.json(Utility.output(Toster.ACCOUNT_REMOVE, 'ERROR'));
                    if (returnObj.user.status == 2)
                        return res.json(Utility.output(Toster.ACCOUNT_BLOCKED_BY_ADMIN, 'ERROR'));
                } else
                {
                    return res.json(Utility.output(Toster.USER_DOES_NOT_EXIST, 'ERROR'));
                }

                //Token Successfully Verified
                var tokenUserDetails = {
                    "_id": returnObj.user._id,
                    "date_of_modification": returnObj.user.date_of_modification,
                    "date_of_creation": returnObj.user.date_of_creation,
                    "mobile": returnObj.user.mobile,
                    "name": returnObj.user.name,
                    "email": returnObj.user.email,
                    "image": returnObj.user.image,
                    "facebook_id": returnObj.profile.id,
                    "google_id": null,
                    "linkedin_id": null,
                    "status": 1,
                    "custom_status": -99,
                    "last_activity": returnObj.user.last_activity
                };
                if (returnObj.user.image)
                    if (returnObj.user.image.indexOf('http://') > -1 || returnObj.user.image.indexOf('https://') > -1) {
                    } else {
                        tokenUserDetails.image = constants.profile_image_public_link + returnObj.user.image;
                    }
                //Create Authentication Token

                headers = {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }

                options = {
                    'url': constants.auth_server + '/login',
                    'method': 'POST',
                    'headers': headers,
                    'form': {
                        'user_id': returnObj.user._id.toString(),
                        'device': requestParser.device.family,
                        'browser': requestParser.ua.toString(),
                        'os': requestParser.os.toString(),
                        'ip': (req.ip === '::1' || req.ip === '::ffff:127.0.0.1') ? 'localhost' : req.ip,
                    }
                };
                //Curl Call to login this user in Auth Server and Get Auth_Token
                request(options, function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        body = JSON.parse(body);
                        if (body.status == "error")
                            return res.json(Utility.output(body.message, 'ERROR'));
                        UserModel.update(
                                {_id: tokenUserDetails._id},
                                {$set: {last_activity: currentTime}}, function (err, numberUpdate) {
                            if (err)
                                return res.json(Utility.output(Toster.SOMETHING_WRONG, 'ERROR'));
                        });

                        var output = {
                            'user': tokenUserDetails,
                            'auth_token': body.result
                        };
                        return res.json(Utility.output(Toster.LOGIN_SUCCESS, 'SUCCESS', output));
                    } else
                        return res.json(Utility.output(Toster.LOGIN_ERROR, 'ERROR'));
                });
            } else
                return res.json(Utility.output(Toster.FB_TOEN_ERROR, 'ERROR'));
        });
    };

    /**
     * <h1>[API] User Google Login</h1>
     * <p>This api use for user login by google account</p>
     * @see API_BASE_URL+user/google_login</a>
     * @param {String} access_token [*Mandatory][You will get this access token from FB API]
     * @param {String} google_id [*Mandatory]
     * @param {String} browser_token [*Mandatory]
     * @header Content-Type: application/x-www-form-urlencoded
     * <pre>
     * {@code
     *    {
     *      "message": "Successfully logged in",
     *      "status": "success",
     *      "result": {
     *        "user": {
     *          "_id": "582ec52757af7013c0bf2f6c",
     *          "date_of_modification": 1479460135101,
     *          "date_of_creation": 1479460135101,
     *          "mobile": "",
     *          "name": "Soham Krishna Paul",
     *          "email": "support.fdxz@gmail.com",
     *          "image": "",
     *          "status": 1,
     *          "custom_status": -99
     *        },
     *        "auth_token": "JWT eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI1ODJlYzUyNzU3YWY3MDEzYzBiZjJmNmMiLCJkYXRlX29mX21vZGlmaWNhdGlvbiI6MTQ3OTQ2MDEzNTEwMSwiZGF0ZV9vZl9jcmVhdGlvbiI6MTQ3OTQ2MDEzNTEwMSwibW9iaWxlIjoiIiwibmFtZSI6IlNvaGFtIEtyaXNobmEgUGF1bCIsImVtYWlsIjoic3VwcG9ydC5mZHh6QGdtYWlsLmNvbSIsImltYWdlIjoiIiwic3RhdHVzIjoxLCJjdXN0b21fc3RhdHVzIjotOTksImlhdCI6MTQ3OTQ2MDU3NCwiYXVkIjoiWXV2aXRpbWUuY29tLmF1IiwiaXNzIjoiWXV2aXRpbWUuY29tIn0.dWLcuykEvGALyBUt3uAytnuD6QfNtNaOvgf4pN29sLHqseVZz8uKhltPR4PPazVNJkRF1oXTvapjqagKKP4k5Q"
     *      }
     *    }
     * </pre>
     * @author Soham Krishna Paul
     */
    this.google_login = function (req, res, next) {
        var requestParser = require('ua-parser').parse(req.headers['user-agent']);
        var currentTime = new Date().getTime();
        req.assert('access_token', Toster.GOOGLE_TOKEN_REQUIRED).notEmpty();

        var errors = req.validationErrors();
        if (errors) {
            var messages = [];
            errors.forEach(function (error) {
                messages.push(error.msg);
            });
            return res.json(Utility.output(messages, 'ERROR'));
        }
        //Verify access_token is valid or not from google [OAuth2 Verification]
        var headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        }

        var options = {
            'url': constants.auth_server + '/verify_google_auth',
            'method': 'POST',
            'headers': headers,
            'form': {
                'access_token': req.body.access_token,
            }
        };
        //Verify Facebook Auth Token
        request(options, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                body = JSON.parse(body);
                if (body.status == "error")
                    return res.json(Utility.output(body.message, 'ERROR'));
                returnObj = body.result;
                if (returnObj.user)
                {
                    if (returnObj.user.status == 3)
                        return res.json(Utility.output(Toster.ACCOUNT_REMOVE, 'ERROR'));
                    if (returnObj.user.status == 2)
                        return res.json(Utility.output(Toster.ACCOUNT_BLOCKED_BY_ADMIN, 'ERROR'));
                } else
                {
                    return res.json(Utility.output(Toster.USER_DOES_NOT_EXIST, 'ERROR'));
                }

                //Token Successfully Verified
                var tokenUserDetails = {
                    "_id": returnObj.user._id,
                    "date_of_modification": returnObj.user.date_of_modification,
                    "date_of_creation": returnObj.user.date_of_creation,
                    "mobile": returnObj.user.mobile,
                    "name": returnObj.user.name,
                    "email": returnObj.user.email,
                    "image": returnObj.user.image,
                    "facebook_id": null,
                    "google_id": returnObj.profile.id,
                    "linkedin_id": null,
                    "status": 1,
                    "custom_status": -99,
                    "last_activity": returnObj.user.last_activity
                };
                if (returnObj.user.image)
                    if (returnObj.user.image.indexOf('http://') > -1 || returnObj.user.image.indexOf('https://') > -1) {
                    } else {
                        tokenUserDetails.image = constants.profile_image_public_link + returnObj.user.image;
                    }
                //Create Authentication Token

                headers = {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }

                options = {
                    'url': constants.auth_server + '/login',
                    'method': 'POST',
                    'headers': headers,
                    'form': {
                        'user_id': returnObj.user._id.toString(),
                        'device': requestParser.device.family,
                        'browser': requestParser.ua.toString(),
                        'os': requestParser.os.toString(),
                        'ip': (req.ip === '::1' || req.ip === '::ffff:127.0.0.1') ? 'localhost' : req.ip,
                    }
                };
                //Curl Call to login this user in Auth Server and Get Auth_Token
                request(options, function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        body = JSON.parse(body);
                        if (body.status == "error")
                            return res.json(Utility.output(body.message, 'ERROR'));
                        UserModel.update(
                                {_id: tokenUserDetails._id},
                                {$set: {last_activity: currentTime}}, function (err, numberUpdate) {
                            if (err)
                                return res.json(Utility.output(Toster.SOMETHING_WRONG, 'ERROR'));
                        });

                        var output = {
                            'user': tokenUserDetails,
                            'auth_token': body.result
                        };
                        return res.json(Utility.output(Toster.LOGIN_SUCCESS, 'SUCCESS', output));
                    } else
                        return res.json(Utility.output(Toster.LOGIN_ERROR, 'ERROR'));
                });
            } else
                return res.json(Utility.output(Toster.FB_TOEN_ERROR, 'ERROR'));
        });
    };

    /**
     * <h1>[API] User Linkedin Login</h1>
     * <p>This api use for user login by Linkedin account</p>
     * @see API_BASE_URL+user/linkedin_login</a>
     * @param {String} access_token [*Mandatory][You will get this access token from FB API]
     * @param {String} linkedin_id [*Mandatory]
     * @param {String} browser_token [*Mandatory]
     * @header Content-Type: application/x-www-form-urlencoded
     * <pre>
     * {@code
     
     *}
     * </pre>
     * @author Soham Krishna Paul
     */
    this.linkedin_login = function (req, res, next) {
        var requestParser = require('ua-parser').parse(req.headers['user-agent']);
        var currentTime = new Date().getTime();
        req.assert('access_token', Toster.LINKEDIN_TOKEN_REQUIRED).notEmpty();

        var errors = req.validationErrors();
        if (errors) {
            var messages = [];
            errors.forEach(function (error) {
                messages.push(error.msg);
            });
            return res.json(Utility.output(messages, 'ERROR'));
        }

        //Verify access_token is valid or not from linkedin [OAuth2 Verification]
        var headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        }

        var options = {
            'url': constants.auth_server + '/verify_linkedin_auth',
            'method': 'POST',
            'headers': headers,
            'form': {
                'access_token': req.body.access_token,
            }
        };
        //Verify Facebook Auth Token
        request(options, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                body = JSON.parse(body);
                if (body.status == "error")
                    return res.json(Utility.output(body.message, 'ERROR'));
                returnObj = body.result;
                if (returnObj.user)
                {
                    if (returnObj.user.status == 3)
                        return res.json(Utility.output(Toster.ACCOUNT_REMOVE, 'ERROR'));
                    if (returnObj.user.status == 2)
                        return res.json(Utility.output(Toster.ACCOUNT_BLOCKED_BY_ADMIN, 'ERROR'));
                } else
                {
                    return res.json(Utility.output(Toster.USER_DOES_NOT_EXIST, 'ERROR'));
                }

                //Token Successfully Verified
                var tokenUserDetails = {
                    "_id": returnObj.user._id,
                    "date_of_modification": returnObj.user.date_of_modification,
                    "date_of_creation": returnObj.user.date_of_creation,
                    "mobile": returnObj.user.mobile,
                    "name": returnObj.user.name,
                    "email": returnObj.user.email,
                    "image": returnObj.user.image,
                    "facebook_id": null,
                    "google_id": null,
                    "linkedin_id": returnObj.profile.id,
                    "status": 1,
                    "custom_status": -99,
                    "last_activity": returnObj.user.last_activity
                };
                if (returnObj.user.image)
                    if (returnObj.user.image.indexOf('http://') > -1 || returnObj.user.image.indexOf('https://') > -1) {
                    } else {
                        tokenUserDetails.image = constants.profile_image_public_link + returnObj.user.image;
                    }
                //Create Authentication Token

                headers = {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }

                options = {
                    'url': constants.auth_server + '/login',
                    'method': 'POST',
                    'headers': headers,
                    'form': {
                        'user_id': returnObj.user._id.toString(),
                        'device': requestParser.device.family,
                        'browser': requestParser.ua.toString(),
                        'os': requestParser.os.toString(),
                        'ip': (req.ip === '::1' || req.ip === '::ffff:127.0.0.1') ? 'localhost' : req.ip,
                    }
                };
                //Curl Call to login this user in Auth Server and Get Auth_Token
                request(options, function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        body = JSON.parse(body);
                        if (body.status == "error")
                            return res.json(Utility.output(body.message, 'ERROR'));
                        UserModel.update(
                                {_id: tokenUserDetails._id},
                                {$set: {last_activity: currentTime}}, function (err, numberUpdate) {
                            if (err)
                                return res.json(Utility.output(Toster.SOMETHING_WRONG, 'ERROR'));
                        });

                        var output = {
                            'user': tokenUserDetails,
                            'auth_token': body.result
                        };
                        return res.json(Utility.output(Toster.LOGIN_SUCCESS, 'SUCCESS', output));
                    } else
                        return res.json(Utility.output(Toster.LOGIN_ERROR, 'ERROR'));
                });
            } else
                return res.json(Utility.output(Toster.FB_TOEN_ERROR, 'ERROR'));
        });
        passport.authenticate('linkedin-token', {session: false}, function (err, user, info) {
            if (!Utility.IsNullOrEmpty(err))
                if (!Utility.IsNullOrEmpty(err.oauthError))
                    return res.json(Utility.output(Toster.INVALID_ACCESS_TOKEN, 'ERROR'));

            if (user)
            {
                if (user.status == 3)
                    return res.json(Utility.output(Toster.ACCOUNT_REMOVE, 'ERROR'));
                if (user.status == 2)
                    return res.json(Utility.output(Toster.ACCOUNT_BLOCKED_BY_ADMIN, 'ERROR'));
            }
            var tokenUserDetails = {
                "_id": user._id,
                "date_of_modification": user.date_of_modification,
                "date_of_creation": user.date_of_creation,
                "mobile": user.mobile,
                "name": user.name,
                "email": user.email,
                "image": user.image,
                "facebook_id": null,
                "google_id": null,
                "linkedin_id": user.linkedin_id,
                "status": 1,
                "custom_status": -99,
                "last_activity": user.last_activity
            };
            if (user.image)
                if (user.image.indexOf('http://') > -1 || user.image.indexOf('https://') > -1) {
                } else {
                    tokenUserDetails.image = constants.profile_image_public_link + user.image;
                }
            jwt.sign({'_id': user._id}, constants.getPrivateKey(), {
                'algorithm': constants.algorithms,
                'audience': constants.audience,
                'issuer': constants.issuer,
            }, function (err, token) {
                if (err)
                    return res.json(Utility.output(err, 'ERROR'));
                UserModel.update(
                        {_id: tokenUserDetails._id},
                        {$set: {last_activity: currentTime, forget_password_request: null}}, function (err, numberUpdate) {
                    if (err)
                        return res.json(Utility.output(Toster.SOMETHING_WRONG, 'ERROR'));
                });
                UserLogModel.findOne({
                    'browser_token': req.body.browser_token,
                    '_user': user._id,
                }, function (err, logx) {
                    if (err)
                        return res.json(Utility.output(err, 'ERROR'));
                    if (!logx)
                    {
                        var newLog = new UserLogModel();
                        newLog._user = user;
                        newLog.device = requestParser.device.family;
                        newLog.browser = requestParser.ua.toString();
                        newLog.os = requestParser.os.toString();
                        newLog.ip = (req.ip == '::1') ? 'localhost' : req.ip;
                        newLog.login_token = 'JWT ' + token;
                        newLog.browser_token = req.body.browser_token;
                        newLog.login_time = currentTime;
                        newLog.start_activity = currentTime;
                        newLog.last_activity = currentTime;
                        newLog.save();
                    } else
                    {
                        UserLogModel.update({
                            'login_token': 'JWT ' + token,
                            'login_time': currentTime,
                            'last_activity': currentTime
                        }, {$set: {'browser_token': req.browser_token, '_user': user}});
                    }
                });
                var output = {
                    'user': tokenUserDetails,
                    'auth_token': 'JWT ' + token
                };
                return res.json(Utility.output(Toster.LOGIN_SUCCESS, 'SUCCESS', output));
            });
        })(req, res, next);
    };

    /**
     * <h1>[API] Verify Forget Password Token</h1>
     * <p>This api use for verification the url what was generated for reset password.
     * Generally Server check the token that the token is valid or nor before proceed to Set new password</p>
     * @see API_BASE_URL+user/verify_forget_password_token</a>
     * @param {String} password_request_token [*Mandatory]
     * @header Content-Type: application/x-www-form-urlencoded
     * <pre>
     * {@code
     *{
     *    "message": "Valid request token",
     *    "status": "success",
     *    "result": ""
     *  }
     *}
     * </pre>
     * @author Soham Krishna Paul
     */
    this.logout = function (req, res, next) {
        var headers = {
            'Authorization': req.headers.authorization,
            'Content-Type': 'application/x-www-form-urlencoded'
        }
        var options = {
            'url': constants.auth_server + '/logout',
            'method': 'POST',
            'headers': headers,
        };
        request(options, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                return res.send(body);
            } else
                return res.json(Utility.output(Toster.SOMETHING_WRONG, 'ERROR'));
        });
    };

    /**
     * <h1>[API] Send a forget password request [Forget Password]</h1>
     * <p>This api use for user can request for a new password. 
     * Generally a Reset password URL will be sent to that user email id
     * That Link/URL will have an expiry time</p>
     * @see API_BASE_URL+user/request_forget_password</a>
     * @param {String} email [*Mandatory][Valid Email]
     * @header Content-Type: application/x-www-form-urlencoded
     * <pre>
     * {@code
     *    {
     *    "message": "Reset password url has been sent",
     *    "status": "success",
     *    "result": ""
     *    }
     *}
     * </pre>
     * @author Soham Krishna Paul
     */
    this.request_forget_password = function (req, res, next) {
        var currentTime = new Date().getTime();
        req.assert('email', 'Email is required').notEmpty();
        req.assert('email', 'Enter valid email').isEmail();
        var errors = req.validationErrors();
        if (errors) {
            var messages = [];
            errors.forEach(function (error) {
                messages.push(error.msg);
            });
            return res.json(Utility.output(messages, 'ERROR'));
        }
        UserModel.findOne({email: req.body.email.toLowerCase()}, function (err, user) {
            if (err)
                return res.json(Utility.output(Toster.FETCH_INFO_ERROR, 'ERROR'));
            if (!user)
                return res.json(Utility.output(Toster.USER_INFO_NOT_FOUND, 'ERROR'));
            if (user.status == 0)
                return res.json(Utility.output(Toster.ACCOUNT_VERIFICATION_REQUIRED, 'ERROR'));
            if (user.status == 3)
                return res.json(Utility.output(Toster.ACCOUNT_REMOVE, 'ERROR'));
            if (user.status == 2)
                return res.json(Utility.output(Toster.ACCOUNT_BLOCKED_BY_ADMIN, 'ERROR'));
            if (user.facebook_id)
                return res.json(Utility.output(Toster.ACCOUNT_WITH_FB, 'ERROR'));
            if (user.google_id)
                return res.json(Utility.output(Toster.ACCOUNT_WITH_GOOGLE, 'ERROR'));

            var passwordRequest = {
                'expire_on': (new Date().getTime() + (24 * 3600 * 1000)),
                'user_id': user._id
            };
            //Generate "forget_password_request" token.
            var forget_password_request = new NodeRSA(constants.getPublicKey()).encrypt(JSON.stringify(passwordRequest), 'base64');
            UserModel.update(
                    {_id: user._id},
                    {$set: {'forget_password_request': forget_password_request}}, function (err, numberUpdate) {
                if (err)
                    return res.json(Utility.output(err, 'ERROR'));
                if (numberUpdate)
                {
                    //-------------------------------------------------
                    var data = {
                        company_name: SITE_SETTINGS.COMPANY_NAME,
                        site_name: SITE_SETTINGS.SITE_NAME,
                        contact_person_name: user.name,
                        join_yuvitime: constants.base_url + '#/login',
                        subscribe_yuvitime: constants.base_url,
                        forget_pass: constants.base_url+'#/password_request/'+encodeURI(forget_password_request)
                    };
                    template_instance.load_template('FORGOT_PASSWORD', data, function (error, html) {
                        if (error)
                        {
                            return res.json(Utility.output(error, 'ERROR'));
                        }
                        var opta = {
                            to: user.email,
                            sub: SITE_SETTINGS.SITE_NAME + Toster.NEW_PASSWORD_REQUEST,
                            body: html
                        }
                        Utility.sendMail(opta, function (err, info) {
                            if (err) {
                                return res.json(Utility.output(Toster.SEND_PASSWORD_ERROR, 'ERROR'));
                            } else
                            {
                                return res.json(Utility.output(Toster.RESET_PASSWORD_EMAIL, 'SUCCESS'));
                                console.log('Message sent: ' + info.response);
                            }

                        });
                    });
                    //------------------------------------------------------
//                    var opta={
//                        'to':user.email,
//                        'sub':SITE_SETTINGS.SITE_NAME+" New Password Request",
//                        'body':'Hello '+user.name+'<br/><br/>\n\
//                                Welcome to '+SITE_SETTINGS.SITE_NAME+'<br/>\n\
//                                Your new password request link is below<br/>\n\
//                                <br/><a style="background-color: #ff930c;\n\
//                                border-radius: 0px;\n\
//                                color: #fff;\n\
//                                cursor: pointer;\n\
//                                display: inline-block;\n\
//                                font-size: 14px;\n\
//                                font-weight: 700;\n\
//                                line-height: 20px;\n\
//                                min-width: 180px;\n\
//                                padding: 14px 30px;\n\
//                                text-align: center;\n\
//                                text-transform: uppercase;\n\
//                                vertical-align: top;\n\
//                                text-decoration: none;" href="'+constants.base_url+'#/password_request/'+encodeURI(forget_password_request)+'">Click Here</a><br/>to set new password for your account.\n\
//                                <br/>or, Paste the below link on your browser.<br/>\n\
//                                <a href="'+constants.base_url+'#/password_request/'+encodeURI(forget_password_request)+'">'+constants.base_url+'#/password_request/'+encodeURI(forget_password_request)+'</a>\n\
//                                <br/>'
//                    };
//                    Utility.sendMail(opta,function(err,info){
//                        if(err){
//                            return res.json(Utility.output('Error in send password url','ERROR'));
//                        }
//                        else
//                        {
//                            return res.json(Utility.output('Reset password url has been sent to your email address','SUCCESS'));
//                        }
//                    });
                }
            });
        });
    };

    /**
     * <h1>[API] Verify Forget Password Token</h1>
     * <p>This api use for verification the url what was generated for reset password.
     * Generally Server check the token that the token is valid or nor before proceed to Set new password</p>
     * @see API_BASE_URL+user/verify_forget_password_token</a>
     * @param {String} password_request_token [*Mandatory]
     * @header Content-Type: application/x-www-form-urlencoded
     * <pre>
     * {@code
     *{
     *    "message": "Valid request token",
     *    "status": "success",
     *    "result": ""
     *  }
     *}
     * </pre>
     * @author Soham Krishna Paul
     */
    this.verify_forget_password_token = function (req, res, next) {
        req.assert('password_request_token', Toster.PASSWORD_TOKEN).notEmpty();
        var errors = req.validationErrors();
        if (errors) {
            var messages = [];
            errors.forEach(function (error) {
                messages.push(error.msg);
            });
            return res.json(Utility.output(messages, 'ERROR'));
        }
        try {
            var decodedContain = new NodeRSA(constants.getPrivateKey()).decrypt(req.body.password_request_token, 'utf8');
        } catch (e) {
            return res.json(Utility.output(Toster.INVALID_REQUEST_TOKEN, 'ERROR'));
        }
        var extractToken = JSON.parse(decodedContain);
        if (!extractToken)
            return res.json(Utility.output(Toster.INVALID_REQUEST_TOKEN, 'ERROR'));
        if (extractToken.expire_on < new Date().getTime())
            return res.json(Utility.output(Toster.REQUEST_EXPIRED, 'ERROR'));

        UserModel.findOne({_id: extractToken.user_id}, function (err, user) {
            if (err)
                return res.json(Utility.output(err, 'ERROR'));
            if (!user)
                return res.json(Utility.output(Toster.USER_NOT_FOUND, 'ERROR'));
            if (user.forget_password_request != req.body.password_request_token)
                return res.json(Utility.output(Toster.INVALID_REQUEST_TOKEN, 'ERROR'));
            return res.json(Utility.output(Toster.VALID_TOKEN, 'SUCCESS'));
        });
    };

    /**
     * <h1>[API] Email Verification and Account Activation</h1>
     * <p>This api use for verification of user email that the user is genuin user or not.
     * If success then account will be activated</p>
     * @see API_BASE_URL+user/verification</a>
     * @param {String} verification_code [*Mandatory]
     * @header Content-Type: application/x-www-form-urlencoded
     * <pre>
     * {@code
     *    {
     *      "message": "Your account verification has been completed",
     *      "status": "success",
     *      "result": ""
     *    }
     *}
     * </pre>
     * @author Soham Krishna Paul
     */
    this.email_verification = function (req, res, next) {
        req.assert('verification_code', 'Verification Code is required').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
            var messages = [];
            errors.forEach(function (error) {
                messages.push(error.msg);
            });
            return res.json(Utility.output(messages, 'ERROR'));
        }
        UserModel.findOne({'v_code': decodeURI(req.body.verification_code)}, function (err, user) {
            if (err)
                return res.json(Utility.output(err, 'ERROR'));
            if (!user)
                return res.json(Utility.output(Toster.INVALID_VERIFICATION, 'ERROR'));

            UserModel.update(
                    {_id: user._id},
                    {$set: {'v_code': null, 'status': 1}}, function (err, numberUpdate) {
                if (err)
                    return res.json(Utility.output(err, 'ERROR'));
                if (numberUpdate)
                    return res.json(Utility.output(Toster.VERIFICATION_COMPLETED, 'SUCCESS'));
            });
        });
    };

    /**
     * <h1>[API] Resend verification url</h1>
     * <p>This api use for resend verification email to user email</p>
     * @see API_BASE_URL+user/resend_verification</a>
     * @param {String} email [*Mandatory][Valid Email]
     * @header Content-Type: application/x-www-form-urlencoded
     * <pre>
     * {@code
     *    {
     *      "message": "Verification mail sent to "example@example.com" email address",
     *      "status": "success",
     *      "result": ""
     *    }
     *}
     * </pre>
     * @author Soham Krishna Paul
     */
    this.resend_email_verification = function (req, res, next) {
        req.assert('email', 'Email is required').notEmpty();
        req.assert('email', 'Enter valid email').isEmail();
        var errors = req.validationErrors();
        if (errors) {
            var messages = [];
            errors.forEach(function (error) {
                messages.push(error.msg);
            });
            return res.json(Utility.output(messages, 'ERROR'));
        }
        UserModel.findOne({'email': req.body.email.toLowerCase()}, function (err, user) {
            if (err)
                return res.json(Utility.output(err, 'ERROR'));
            if (!user)
                return res.json(Utility.output(Toster.USER_NOT_FOUND, 'ERROR'));

            if (user.status == 1)
                return res.json(Utility.output(Toster.ACCOUNT_ALREADY_ACTIVATED, 'ERROR'));
            if (user.status == 2)
                return res.json(Utility.output(Toster.USER_BLOCKED, 'ERROR'));
            if (user.status == 3)
                return res.json(Utility.output(Toster.ACCOUNT_REMOVE, 'ERROR'));

            var newVcode = user.generateVcode(new Date().getTime());
            UserModel.update(
                    {_id: user._id},
                    {$set: {'v_code': newVcode}}, function (err, numberUpdate) {
                if (err)
                    return res.json(Utility.output(err, 'ERROR'));
                if (numberUpdate)
                 {
                 //-------------------------------------------------
                    var data = {
                        company_name: SITE_SETTINGS.COMPANY_NAME,
                        site_name: SITE_SETTINGS.SITE_NAME,
                        contact_person_name: user.name,
                        verify_account:constants.base_url + '#/verification/' + encodeURI(newVcode),
                        join_yuvitime: constants.base_url + '#/login',
                        subscribe_yuvitime: constants.base_url
                        
                    };
                    template_instance.load_template('RESEND_EMAIL_VERIFICATION', data, function (error, html) {
                        if (error)
                        {
                            return res.json(Utility.output(error, 'ERROR'));
                        }
                        var opta = {
                        'to': user.email,
                        'sub': SITE_SETTINGS.SITE_NAME + Toster.EMAIL_VERIFICATION,
                        'body': html
                        };
                         Utility.sendMail(opta, function (err, info) {
                        if (err) {
                            return res.json(Utility.output(Toster.SEND_MAIL_ERROR, 'ERROR'));
                        } else
                        {
                            return res.json(Utility.output('Verification mail sent to ' + user.email + ' email address', 'SUCCESS'));
                        }
                      });
                    });
                    //------------------------------------------------------
//                    var opta = {
//                        'to': user.email,
//                        'sub': SITE_SETTINGS.SITE_NAME + " Account email verification mail",
//                        'body': html
//                    };
//                    Utility.sendMail(opta, function (err, info) {
//                        if (err) {
//                            return res.json(Utility.output('Error in send verification email', 'ERROR'));
//                        } else
//                        {
//                            return res.json(Utility.output('Verification mail sent to "' + user.email + '" email address', 'SUCCESS'));
//                        }
//                    });
                }
            });
        });
    };

    /**
     * <h1>[API] Set New Password</h1>
     * <p>This api use for set new password for [Forget Password]</p>
     * @see API_BASE_URL+user/set_new_password</a>
     * @param {String} password_request_token [*Mandatory]
     * @param {String} password [*Mandatory]
     * @header Content-Type: application/x-www-form-urlencoded
     * <pre>
     * {@code
     *    {
     *      "message": "Password has been changed",
     *      "status": "success",
     *      "result": ""
     *    }
     *}
     * </pre>
     * @author Soham Krishna Paul
     */
    this.set_new_password = function (req, res, next) {
        req.assert('password_request_token', Toster.PASSWORD_TOKEN).notEmpty();
        req.assert('password', Toster.PASSWORD_REQUIRED).notEmpty(); // Adding validation rules over password
        req.assert('password', Toster.PASSWORD_VALIDATE).isLength({min: 6, max: 20});
        var errors = req.validationErrors();
        if (errors) {
            var messages = [];
            errors.forEach(function (error) {
                messages.push(error.msg);
            });
            return res.json(Utility.output(messages, 'ERROR'));
        }
        var decodedContain = new NodeRSA(constants.getPrivateKey()).decrypt(req.body.password_request_token, 'utf8');
        var extractToken = JSON.parse(decodedContain);
        if (!extractToken)
            return res.json(Utility.output(Toster.INVALID_REQUEST_TOKEN, 'ERROR'));
        if (extractToken.expire_on < new Date().getTime())
            return res.json(Utility.output(Toster.REQUEST_EXPIRED, 'ERROR'));

        UserModel.findOne({_id: extractToken.user_id}, function (err, user) {
            if (err)
                return res.json(Utility.output(err, 'ERROR'));
            if (!user)
                return res.json(Utility.output(Toster.USER_NOT_FOUND, 'ERROR'));
            if (user.forget_password_request != req.body.password_request_token)
                return res.json(Utility.output(Toster.INVALID_REQUEST_TOKEN, 'ERROR'));
            UserModel.update(
                    {_id: user._id},
                    {$set: {'forget_password_request': null, 'password': user.encryptPassword(req.body.password)}}, function (err, numberUpdate) {
                if (err)
                    return res.json(Utility.output(err, 'ERROR'));
                if (numberUpdate)
                    return res.json(Utility.output(Toster.PASSWORD_CHANGED, 'SUCCESS'));
            });
        });
    };

    /**
     * <h1>[Member Function] IsLogin</h1>
     * <p>This function use check that Authentication token header is valid or not
     * This is a Middleware function</p>
     * @author Soham Krishna Paul
     */
    this.isLoggedIn = function (req, res, next) {
        passport.authenticate('jwt', { session: false},function(err, user, info){
            if(err)
                return res.json(Utility.output(err.stack,'ERROR'));
            if(!Utility.IsNullOrEmpty(info))
                if(info.name === 'JsonWebTokenError')
                    return res.json(Utility.output(Toster.INVALID_TOKEN,'ERROR'));
            if(!user)
                return res.json(Utility.output(Toster.NOT_LOGGED_IN,'ERROR'));
            next();
        })(req,res,next);  
    }
};