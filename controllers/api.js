var express = require('express');
var nodemailer = require('nodemailer');
var fs = require('fs');
var csv = require('fast-csv');
var multiparty = require('multiparty');
var path = require('path');
var user = require('../models/User');
var game_master = require('../models/Game_master');
var dictionary = require('../models/Dictionary');
var challenge = require('../models/Challenge');
var friend = require('../models/Friend');
var block_user = require('../models/Block_user');
var test_game = require('../models/Test_game');
var PushNotification = require('../utility/push-notification');
//var push_notification = PushNotification();
var router = express.Router();
var live_url = 'http://182.75.72.148:3001/';
var profile_image_url = 'http://182.75.72.148/smartfeud_image/uploads/smartfued_image/';
var url_regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'testdevloper007@gmail.com',
        pass: 'Password@321'
    }
});
//--------------------------- Function for user registration ----------------------------//
router.post('/userRegistration', function(req, res, next) {
    var userName = req.body.username;
    var email = req.body.email;
    var password = req.body.password;
    var confirm_password = req.body.confirm_password;
    var has_error = 0;
    var error_section = [];
    if (userName == '') {
        error_section.push("Username is rerquired.");
        has_error++;
    }
    if (email == '') {
        error_section.push("Email is rerquired.");
        has_error++;
    }
    if (password == '') {
        error_section.push("Password is rerquired.");
        has_error++;
    }
    var message = [];
    var result = {};
    if (error_section.length > 0) {
        result.message = 'error';
        result.error = error_section;
    } else {
        user.find({ $or: [{ 'name': userName }, { 'email': email }] }, function(usr_err, usr_result) {
            if (usr_err) {
                res.send(usr_err);
            } else {
                if (usr_result.length > 0) {
                    error_section.push("This user is allready exist.");
                    result.status = 'error';
                    result.message = error_section;
                    res.json(result);
                } else {
                    var user_details = new user();
                    user_details.name = userName;
                    user_details.email = email;
                    user_details.password = user_details.encryptPassword(password);
                    user_details._login_type = 2;
                    user_details.save(function(save_err, save_result) {
                        if (save_err) {
                            res.send(save_err);
                        } else {
                            result.status = 'success';
                            result.message = "Profile Successfully created.";
                            res.json(result);
                        }
                    })
                }
            }
        })
    }
});
//---------------------------- Function for user Singin ----------------------------------//
router.post('/login', function(req, res, next) {
    //console.log("TEST");
    var login_type = req.body.login_type;
    var device_token = req.body.device_token;
    var response = {};
    if (login_type == 2) {
        var username = req.body.username;
        var password = req.body.password;
        user.findOne({ 'name': username }, function(usr_err, usr_result) {
            if (usr_err) {
                res.send(usr_err);
            } else {
                if (usr_result) {
                    var get_result = usr_result;
                    var new_usr = new user();
                    new_usr.encryptPassword(password);
                    if (!get_result.validPassword(password)) {
                        response.status = "error";
                        response.message = "Password does not match";
                        res.json(response);
                    } else {
                        var getTime = new Date().getTime();
                        var auth_token = get_result._id + getTime;
                        var usr_data = {};
                        usr_data.username = get_result.name;
                        usr_data.email = get_result.email;
                        if (get_result.image) {
                            if (url_regexp.test(get_result.image)) {
                                usr_data.image = get_result.image;
                            } else {
                                //usr_data.image = live_url+'uploads/'+get_result.image;
                                usr_data.image = profile_image_url + get_result.image;
                            }

                        } else {
                            usr_data.image = live_url + 'uploads/no-user.png';
                        }
                        //usr_data.image = live_url+'uploads/no-user.png';
                        usr_result.auth_token = auth_token;
                        usr_result.device_token = device_token;
                        usr_result.save(function(updt_err, updt_result) {
                            if (updt_err) {
                                res.send(updt_err);
                            } else {
                                response.status = "success";
                                response.message = "Logged in successfully!";
                                response.auth_token = auth_token;
                                response.data = usr_data;
                                //res.send("TEST AGAIN");
                                res.json(response);
                            }
                        })

                    }
                } else {
                    response.status = "error";
                    response.message = "User does not exist!";
                    res.json(response);
                }
            }
        })
    }
    if ((login_type == 3) || (login_type == 4)) {
        var social_id = req.body.social_id;
        var username = req.body.name;
        var image = req.body.image;
        user.findOne({ '_login_type': login_type, 'social_id': social_id }, function(usr_err, usr_result) {
            if (usr_err) {
                res.send(usr_err);
            } else {
                if (usr_result) {
                    var getTime = new Date().getTime();
                    var auth_token = usr_result._id + getTime;
                    var usr_data = {};
                    usr_data.username = usr_result.name;
                    if (usr_result.image) {
                        if (url_regexp.test(usr_result.image)) {
                            usr_data.image = usr_result.image;
                        } else {
                            //usr_data.image = live_url+'uploads/'+usr_result.image;
                            usr_data.image = profile_image_url + get_result.image;
                        }

                    } else {
                        usr_data.image = live_url + 'uploads/no-user.png';
                    }
                    usr_result.auth_token = auth_token;
                    usr_result.device_token = device_token;
                    usr_result.save(function(updt_err, updt_result) {
                        if (updt_err) {
                            res.send(updt_err);
                        } else {
                            response.status = "success";
                            response.message = "Logged in successfully!";
                            response.auth_token = auth_token;
                            response.data = usr_data;
                            res.json(response);
                        }
                    })
                } else {

                    var new_usr = new user();
                    new_usr._login_type = login_type;
                    new_usr.social_id = social_id;
                    new_usr.name = username;
                    new_usr.image = image;
                    //res.send("New Entry");
                    new_usr.save(function(insert_err, insert_result) {
                        //res.send(insert_err);
                        if (insert_err) {
                            res.send(insert_err);
                        } else {


                            user.findOne({ '_id': insert_result._id }, function(get_err, get_result) {
                                if (get_err) {
                                    res.send(get_err);
                                } else {
                                    //res.send(get_result);
                                    var usr_data = {};
                                    usr_data.username = get_result.name;
                                    if (get_result.image) {
                                        if (url_regexp.test(get_result.image)) {
                                            usr_data.image = get_result.image;
                                        } else {
                                            //usr_data.image = live_url+'uploads/'+get_result.image;
                                            usr_data.image = profile_image_url + get_result.image;
                                        }

                                    } else {
                                        usr_data.image = live_url + 'uploads/no-user.png';
                                    }
                                    var getTime = new Date().getTime();
                                    var new_auth_token = get_result._id + getTime;
                                    get_result.auth_token = new_auth_token;
                                    get_result.device_token = device_token;
                                    //res.send(usr_result);
                                    get_result.save(function(updt_err, updt_result) {
                                        if (updt_err) {
                                            res.send(updt_err);
                                        } else {
                                            response.status = "success";
                                            response.message = "Logged in successfully!";
                                            response.auth_token = new_auth_token;
                                            response.data = usr_data;
                                            res.json(response);
                                        }
                                    })
                                }
                            })
                        }

                    })
                }
            }
        })
    }
})
//----------------------------- Function for logout section ----------------------------------//
router.post('/logout', function(req, res, next) {
    //console.log("Logout Section");
    var result = {};
    var auth_token = req.body.auth_token;
    //res.send(auth_token);
    user.findOne({ 'auth_token': auth_token }, function(get_err, get_result) {
        if (get_err) {
            res.send(get_err);
        } else {
            if (get_result) {
                get_result.auth_token = "";
                get_result.save(function(updt_err, updt_result) {
                    if (updt_err) {
                        res.send(updt_err);
                    } else {
                        result.status = "success";
                        result.message = "Logged out successfully!";
                        res.json(result);
                    }
                })
            } else {
                result.status = "error";
                result.message = "User not exists";
                res.json(result);
            }

        }
    })
});

//--------------------------- Function to get the profile details ----------------------------//
router.post('/getProfile', function(req, res, next) {
    //res.send(req.headers);
    var auth_token = req.body.auth_token;
    user.findOne({ 'auth_token': auth_token }, function(get_err, get_result) {
        if (get_err) {
            res.send(get_err);
        } else {
            var usr_array = [];
            var result = {};
            if (get_result) {
                var usr_obj = {};
                usr_obj.username = get_result.name;
                usr_obj.email = get_result.email;
                if (get_result.image) {
                    if (url_regexp.test(get_result.image)) {
                        usr_obj.image = get_result.image;
                    } else {
                        usr_obj.image = live_url + 'uploads/' + get_result.image;
                    }
                } else {
                    usr_obj.image = live_url + 'uploads/no-user.png';
                }
                usr_array.push(usr_obj);
                result.status = "success";
                result.message = "Profile details fetch successfully";
                result.result = usr_array;
            } else {
                result.status = "error";
                result.message = "User does not find";
                result.result = usr_array;
            }
            res.json(result);
        }
    })
});
//--------------------------- Function to update the profile details ---------------------------------//
router.post('/updateProfile', function(req, res, next) {
    var auth_token = req.body.auth_token;
    var username = req.body.username;
    var email = req.body.email;
    var password = req.body.password;
    var img = req.body.profileImage;
    var result = {};

    var return_user = {};
    if (auth_token != '') {
        if (username != '') {
            user.findOne({ 'name': username, 'auth_token': { $ne: auth_token } }, function(exist_err, exist_result) {
                if (exist_err) {
                    res.send(exist_err);
                } else {
                    //res.send(exist_result);
                    if (exist_result) {
                        result.status = "error";
                        result.message = "This username allready exists";
                        res.json(result);
                    } else {
                        user.findOne({ 'auth_token': auth_token }, function(usr_err, usr_result) {
                            if (usr_err) {
                                res.send(usr_err);
                            } else {
                                if (usr_result) {
                                    if (username != '') {
                                        usr_result.name = username;
                                        return_user.username = username;
                                    }
                                    if (email != '') {
                                        usr_result.email = email;
                                        return_user.email = email;
                                    }
                                    if (password != '') {
                                        usr_result.password = usr_result.encryptPassword(password);
                                    }
                                    usr_result.save(function(updt_err, updt_result) {
                                        if (updt_err) {
                                            res.send(updt_err);
                                        } else {
                                            // result.status="success";
                                            // result.message="profile updated successfully!";
                                            // result.auth_token = auth_token;
                                            // result.data = return_user;
                                            // res.json(result);
                                            user.findOne({ 'auth_token': auth_token }, function(get_error, get_usr) {
                                                if (get_error) {
                                                    res.send(get_error);
                                                } else {
                                                    if (get_usr.image) {
                                                        if (url_regexp.test(get_usr.image)) {
                                                            return_user.image = get_usr.image;
                                                        } else {
                                                            return_user.image = profile_image_url + get_usr.image;
                                                        }
                                                    } else {
                                                        return_user.image = live_url + 'uploads/no-user.png';
                                                    }
                                                    result.status = "success";
                                                    result.message = "profile updated successfully!";
                                                    result.auth_token = auth_token;
                                                    result.data = return_user;
                                                    res.json(result);
                                                }
                                            });
                                        }
                                    });
                                } else {
                                    result.status = "error";
                                    result.message = "User does not exists";
                                    res.json(result);
                                }
                            }
                        })
                    }
                }
            });
        } else {
            user.findOne({ 'auth_token': auth_token }, function(usr_err, usr_result) {
                if (usr_err) {
                    res.send(usr_err);
                } else {
                    if (usr_result) {
                        if (email != '') {
                            usr_result.email = email;
                            return_user.email = email;
                        }
                        if (password != '') {
                            usr_result.password = usr_result.encryptPassword(password);
                        }
                        usr_result.save(function(updt_err, updt_result) {
                            if (updt_err) {
                                res.send(updt_err);
                            } else {
                                // result.status="success";
                                // result.message="profile updated successfully!";
                                // result.auth_token = auth_token;
                                // result.data = return_user;
                                // res.json(result);
                                user.findOne({ 'auth_token': auth_token }, function(get_error, get_usr) {
                                    if (get_error) {
                                        res.send(get_error);
                                    } else {
                                        if (get_usr.image) {
                                            if (url_regexp.test(get_usr.image)) {
                                                return_user.image = get_usr.image;
                                            } else {
                                                return_user.image = profile_image_url + get_usr.image;
                                            }
                                        } else {
                                            return_user.image = live_url + 'uploads/no-user.png';
                                        }
                                        result.status = "success";
                                        result.message = "profile updated successfully!";
                                        result.auth_token = auth_token;
                                        result.data = return_user;
                                        res.json(result);
                                    }
                                })

                            }
                        })
                    } else {
                        result.status = "error";
                        result.message = "User does not exists";
                        res.json(result);
                    }
                }
            })
        }


    } else {
        result.status = "error";
        result.message = "Authorize token is required.";
        res.json(result);
    }

});
//-------------------------- Function to update the user's profile image ----------------------------------//
router.post('/updtprofileimage', function(req, res, next) {
    var auth_token = req.body.auth_token;
    var profileImage = req.body.uploaded_image;
    console.log(profileImage);
    user.findOne({ 'auth_token': auth_token }, function(exist_err, exist_result) {
        if (exist_err) {
            res.send(exist_err);
        } else {
            console.log(exist_result);
            exist_result.image = profileImage;
            exist_result.save(function(save_err, save_result) {
                if (save_err) {
                    res.send(save_err);
                } else {

                    var result = {};
                    result.status = "success";
                    result.message = "Profile image uploaded successfully";
                    result.profileImage = profile_image_url + profileImage;
                    res.json(result);
                }
            })
        }
    });
})
//--------------------------- Function to send the Email for forgot password -----------------------------//
router.post('/forgotPasswordEmail', function(req, res, next) {
    var email = req.body.email;
    var random_code = randomString(10, '#aA');
    user.findOne({ 'email': email }, function(get_err, get_result) {
        if (get_err) {
            res.send(get_err);
        } else {
            var result = {};
            if (get_result) {
                if (get_result.email != '') {
                    get_result.verification_code = random_code;
                    get_result.save(function(updt_err, updt_result) {
                        if (updt_err) {
                            res.send(updt_err);
                        } else {
                            var email_address = get_result.email;
                            var pwd_reset_url = live_url + 'password_reset/' + get_result._id;
                            var htmltemplate = '<p>Hello ' + get_result.name + '</p><p>You have successfully verified your email address. Your verification code is given below:</p><p>Verifcation Code : <b>' + random_code + '</b></p>';
                            var mailOptions = {
                                from: 'testdevloper007@gmail.com',
                                to: email_address,
                                subject: 'Password recovery email',
                                html: htmltemplate
                            };

                            transporter.sendMail(mailOptions, function(error, info) {
                                if (error) {
                                    result.status = "error";
                                    result.message = "Email does not send due to some problem, Please try again after sometime.";
                                    res.send(result);
                                } else {
                                    result.status = "success";
                                    result.message = "A verification email has been sent to your email address. Please check it.";
                                    res.send(result);
                                }
                            });
                        }
                    })
                }

            } else {
                result.status = "error";
                result.message = "Email does not exists!";
                res.send(result);
            }

        }
    })
});
//-------------------------- Function to check the verification code ---------------------------------//
router.post('/checkVerificationCode', function(req, res, next) {
    var result = {};
    var verification_code = req.body.verification_code;
    user.findOne({ 'verification_code': verification_code }, function(get_err, get_result) {
        if (get_err) {
            res.send(get_err);
        } else {
            if (get_result) {
                var user_id = get_result._id;
                get_result.verification_code = "";
                get_result.save(function(updt_err, updt_result) {
                    if (updt_err) {
                        res.send(updt_err);
                    } else {
                        result.status = "message";
                        result.message = "Your verification code has been successfully verified. Now please reset your password.";
                        result.user_id = user_id;
                        res.json(result);
                    }
                })
            } else {
                result.status = "error";
                result.message = "You have entered wrong verification code.";
                res.json(result);
            }

        }
    })
});
//---------------------- Function to reset the password -----------------------------//
router.post('/resetPassword', function(req, res, next) {
    var result = {};
    var password = req.body.password;
    var user_id = req.body.user_id;
    user.findOne({ '_id': user_id }, function(get_err, get_result) {
        if (get_err) {
            res.send(get_err);
        } else {
            if (get_result) {
                get_result.password = get_result.encryptPassword(password);
                get_result.save(function(updt_err, updt_result) {
                    if (updt_err) {
                        res.send(updt_err);
                    } else {
                        result.status = "success";
                        result.message = "Password update successfully";
                        res.json(result);
                    }
                })
            } else {
                result.status = "error";
                result.message = "User not found with this id";
                res.json(result);
            }
        }
    });
});
//---------------------- Function to get the random words ----------------------------------//
router.post('/gameWord', function(req, res, next) {
    var language_name = req.body.language_name;
    game_master.findOne({}, function(get_err, get_result) {
        if (get_err) {
            res.send(get_err);
        } else {
            //res.send(get_result);
            var response = {};
            var language_code = get_result.language_code;
            var total_charecters = get_result.total_characters;
            var language_id = language_code.indexOf(language_name);
            if (language_id < 0) {
                response.status = "error";
                response.message = "Invalid language code";
            } else {
                var get_language_array = total_charecters[language_id];
                get_language_array = shuffle(get_language_array);
                var new_arr = [];
                for (var i = 0; i < 7; i++) {
                    new_arr.push(get_language_array[i]);
                }
                response.status = "success";
                response.message = "Successfully get the words";
                response.words = new_arr;
            }

            res.json(response);
        }
    })
});
router.post('/checkWord', function(req, res, next) {
    var language_code = req.body.language_code;
    var word = req.body.word;
    //res.send("TEST");
    dictionary.findOne({ 'language_code': language_code }, function(get_err, get_result) {

        if (get_err) {
            res.send(get_err);
        } else {
            //console.log(get_result);
            var result = {};
            var checkWord = get_result.dictionary.indexOf(word);
            if (checkWord < 0) {
                result.status = "error";
                result.message = "Word does not match with dictionary";
            } else {
                result.status = "success";
                result.message = "Successfully match with dictionary";
            }
            res.send(result);
        }
    })
});
//----------------------- Function to send the challenge by push notification --------------------------//
router.post('/send_challenge', function(req, res, next) {
    var FCM = require('fcm-node');
    var fcm = new FCM("AAAAVQ4bC4A:APA91bGprg3V-T-Qfbf_SfosJSyzGv4hH1UqrOpAZz6fr_onDEsoIaLBkCOKTz231ziXVmZRMJnE5le7T_-izX7c5o8SnHatF2hppfZUTcfkeohAk9WGIlxQtRFOj1bJ3YS3cxkoyfPs")

    var message = { //this may vary according to the message type (single recipient, multicast, topic, et cetera) 
        to: 'dklxQ2ZWOW8:APA91bHGbNxICU9-f2sLKkhuZWJ31mDa-FdsIzsznapV0s2WlWjYGyu5gk_qSSqmrXIUU7RccmM29iXp_ZfPISiwes1g7qOSXc4YVCwdOshetryGi6poPMB3LDpipYFO_XeOCQiVUxPJ',
        // collapse_key: 'your_collapse_key',

        notification: {
            title: 'Smart Feud',
            body: 'Test Message'
        },

        data: { //you can send only notification or only data(or include both) 
            message: 'Message - 3'
        }
    }

    fcm.send(message, function(err, response) {
        if (err) {
            console.log("Something has gone wrong!");
            var result = {};
            result.status = "error";
            result.message = "Device token is required to send message";
            res.send(result);
        } else {
            console.log("Successfully sent with response: ", response);
            var result = {};
            result.status = "success";
            result.message = "Push notification send successfully";
            res.send(result);
        }
    })


    // var push_message = {};
    // var deviceIds = [];
    // deviceIds.push("dklxQ2ZWOW8:APA91bHGbNxICU9-f2sLKkhuZWJ31mDa-FdsIzsznapV0s2WlWjYGyu5gk_qSSqmrXIUU7RccmM29iXp_ZfPISiwes1g7qOSXc4YVCwdOshetryGi6poPMB3LDpipYFO_XeOCQiVUxPJ");
    // push_message.fcm_server_key = "AAAAVQ4bC4A:APA91bGprg3V-T-Qfbf_SfosJSyzGv4hH1UqrOpAZz6fr_onDEsoIaLBkCOKTz231ziXVmZRMJnE5le7T_-izX7c5o8SnHatF2hppfZUTcfkeohAk9WGIlxQtRFOj1bJ3YS3cxkoyfPs";
    // push_message.deviceIds = deviceIds;
    // push_message.message = "Sample Message";
    // PushNotification.sendFCM(push_message);
    // var result = {};
    // result.status = "error";
    // result.message = "Device token is required to send message";
    // res.send(result);


    // user.findOne({'_id':req.body.opponent_id},function(usr_err,usr_result){
    //     if(usr_err){
    //         res.send(usr_err);
    //     }else{
    //         if(usr_result){
    //             if(usr_result.device_token){

    //             }else{
    //                 var result = {};
    //                 result.status = "error";
    //                 result.message = "Device token is required to send message";
    //                 res.send(result);
    //             }
    //         }else{
    //             var result = {};
    //             result.status = "error";
    //             result.message = "Sender not exists";
    //             res.send(result);
    //         }
    //     }
    // })
    //res.send("THIS IS SAMPLE");
})
//-------------- check dummy email send ----------------------------//
router.get('/testEmail', function(req, res, next) {
    var testHTML = '<h4>Hello Admin,</h4><br/><p>Your password hes been successfully reset. To reset your password please click on the below link</p><p><a href="http://google.com">Click here</a></p>';
    var mailOptions = {
        from: 'testdevloper007@gmail.com',
        to: 'jayatish@digitalaptech.com',
        subject: 'Sending Email using Node.js',
        html: testHTML
    };

    transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
            console.log(error);
            res.send(error);
        } else {
            console.log('Email sent: ' + info.response);
            res.send("Successfullu send email");
        }
    });
})
router.get('/userList', function(req, res, next) {

    console.log("TEST JAYATISH");
    user.find({}, function(err, result) {
        console.log("GET DETAILS");
        if (err) {
            res.send(err);
        } else {
            res.json(result);
        }
    })
});


module.exports = router;

function randomString(length, chars) {
    var mask = '';
    if (chars.indexOf('a') > -1) mask += 'abcdefghijklmnopqrstuvwxyz';
    if (chars.indexOf('A') > -1) mask += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (chars.indexOf('#') > -1) mask += '0123456789';
    if (chars.indexOf('!') > -1) mask += '~`!@#$%^&*()_+-={}[]:";\'<>?,./|\\';
    var result = '';
    for (var i = length; i > 0; --i) result += mask[Math.round(Math.random() * (mask.length - 1))];
    return result;
}

function shuffle(array) {
    var tmp, current, top = array.length;
    if (top)
        while (--top) {
            current = Math.floor(Math.random() * (top + 1));
            tmp = array[current];
            array[current] = array[top];
            array[top] = tmp;
        }
    return array;
}