var express = require('express');
var nodemailer = require('nodemailer');
var fs = require('fs');
var csv = require('fast-csv');
var multiparty = require('multiparty');
var path = require('path');
var async_node = require('async');
var user = require('../models/User');
var game_master = require('../models/Game_master');
var dictionary = require('../models/Dictionary');
var challenge = require('../models/Challenge');
var friend = require('../models/Friend');
var block_user = require('../models/Block_user');
var test_game = require('../models/Test_game');
var game_room = require('../models/Game_room');
var user_rank = require('../models/User_rank');
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
                        usr_data.user_id = get_result._id;
                        usr_data.username = get_result.name;
                        usr_data.email = get_result.email;
                        if (get_result.image) {
                            if (url_regexp.test(get_result.image)) {
                                usr_data.image = get_result.image;
                            } else {
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
                    usr_data.user_id = usr_result._id;
                    usr_data.username = usr_result.name;
                    if (usr_result.image) {
                        if (url_regexp.test(usr_result.image)) {
                            usr_data.image = usr_result.image;
                        } else {
                            usr_data.image = profile_image_url + usr_result.image;
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
                                    usr_data.user_id = get_result._id;
                                    usr_data.username = get_result.name;
                                    if (get_result.image) {
                                        if (url_regexp.test(get_result.image)) {
                                            usr_data.image = get_result.image;
                                        } else {
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
                get_result.device_token = "";
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
    //var img = req.body.profileImage;
    var result = {};
    // user.findOne({$or:[{'email':email},{'name':username}]}).exec(function(usr_err,usr_result){
    //     if(usr_err){
    //         res.send(usr_err);
    //     }else{
    //         if(usr_result){
    //             if(usr_result.auth_token!=auth_token){
    //                 result.status="error";
    //                 result.message = "User allready exists";
    //                 res.json(result);
    //             }else{
    //                 usr_result.name = username;
    //                 usr_result.email = email;
    //                 if(password!=''){
    //                     usr_result.password = usr_result.encryptPassword.password;
    //                 }
    //                 usr_result.save(function(updt_err,updt_result){
    //                     if(updt_err){
    //                         res.send(updt_err);
    //                     }else{
    //                         result.status="success";
    //                         result.message="profile updated successfully!";
    //                         res.json(result);
    //                     }
    //                 })
    //             }
    //         }
    //     }
    // });
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
                                    // if(img!=''){
                                    //     var d=new Date().valueOf();
                                    //     var text = "";
                                    //     var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
                                    //     for (var i = 0; i < 5; i++)
                                    //     text += possible.charAt(Math.floor(Math.random() * possible.length));

                                    //     if("jpeg"==img.split(";")[0].split("/")[1])
                                    //     {
                                    //         var imageName = d + '.' + text + '.jpg';
                                    //     }
                                    //     if("gif"==img.split(";")[0].split("/")[1])
                                    //     {
                                    //         var imageName = d + '.' + text + '.gif';
                                    //     }
                                    //     if("x-icon"==img.split(";")[0].split("/")[1])
                                    //     {
                                    //         var imageName = d + '.' + text + '.ico';
                                    //     }
                                    //     if("png"==img.split(";")[0].split("/")[1])
                                    //     {
                                    //         var imageName = d + '.' + text + '.png';
                                    //     }
                                    //     var data =img.replace(/^data:image\/\w+;base64,/, "");
                                    //     var buf = new Buffer(data, 'base64');
                                    //     fs.writeFile('./uploads/'+ imageName, buf);
                                    //     usr_result.image = imageName;
                                    //     return_user.image = live_url+'uploads/'+imageName;
                                    // }
                                    usr_result.save(function(updt_err, updt_result) {
                                        if (updt_err) {
                                            res.send(updt_err);
                                        } else {
                                            result.status = "success";
                                            result.message = "profile updated successfully!";
                                            result.auth_token = auth_token;
                                            result.data = return_user;
                                            res.json(result);
                                            // user.findOne({'auth_token':auth_token},function(get_error,get_usr){
                                            //     if(get_error){
                                            //         res.send(get_error);
                                            //     }else{

                                            //         if(get_usr.image){
                                            //             if(url_regexp.test(get_usr.image)){
                                            //                 return_user.image = get_usr.image;
                                            //             }else{
                                            //                 return_user.image = profile_image_url+get_usr.image;
                                            //             }
                                            //         }else{
                                            //             return_user.image = live_url+'uploads/no-user.png';
                                            //         }
                                            //         result.status="success";
                                            //         result.message="profile updated successfully!";
                                            //         result.auth_token = auth_token;
                                            //         result.data = return_user;
                                            //         res.json(result);
                                            //     }
                                            // });
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
                        //  if(img!=''){
                        //     var d=new Date().valueOf();
                        //     var text = "";
                        //     var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
                        //     for (var i = 0; i < 5; i++)
                        //     text += possible.charAt(Math.floor(Math.random() * possible.length));

                        //     if("jpeg"==img.split(";")[0].split("/")[1])
                        //     {
                        //         var imageName = d + '.' + text + '.jpg';
                        //     }
                        //     if("gif"==img.split(";")[0].split("/")[1])
                        //     {
                        //         var imageName = d + '.' + text + '.gif';
                        //     }
                        //     if("x-icon"==img.split(";")[0].split("/")[1])
                        //     {
                        //         var imageName = d + '.' + text + '.ico';
                        //     }
                        //     if("png"==img.split(";")[0].split("/")[1])
                        //     {
                        //         var imageName = d + '.' + text + '.png';
                        //     }
                        //     var data =img.replace(/^data:image\/\w+;base64,/, "");
                        //     var buf = new Buffer(data, 'base64');
                        //     fs.writeFile('./uploads/'+ imageName, buf);
                        //     usr_result.image = imageName;
                        //     return_user.image = live_url+'uploads/'+imageName;
                        // }
                        usr_result.save(function(updt_err, updt_result) {
                            if (updt_err) {
                                res.send(updt_err);
                            } else {
                                result.status = "success";
                                result.message = "profile updated successfully!";
                                result.auth_token = auth_token;
                                result.data = return_user;
                                res.json(result);
                                // user.findOne({'auth_token':auth_token},function(get_error,get_usr){
                                //     if(get_error){
                                //         res.send(get_error);
                                //     }else{
                                //         if(get_usr.image){
                                //             if(url_regexp.test(get_usr.image)){
                                //                 return_user.image = get_usr.image;
                                //             }else{
                                //                 //usrData.image = live_url+'uploads/'+get_usr.image;
                                //                 return_user.image = profile_image_url+get_usr.image;
                                //             }
                                //         }else{
                                //             return_user.image = live_url+'uploads/no-user.png';
                                //         }
                                //         result.status="success";
                                //         result.message="profile updated successfully!";
                                //         result.auth_token = auth_token;
                                //         result.data = return_user;
                                //         res.json(result);
                                //     }
                                // })

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
    var opponent_id = req.body.opponent_id;
    //var opponentString = opponent_id.replace(/['"]+/g, '')
    //console.log(opponent_id);
    var myArray = opponent_id.split(",");
    var auth_token = req.body.auth_token;
    var language_name = req.body.language_name;
    var board_layout = req.body.board_layout;
    var game_mode = req.body.game_mode;
    var waiting_time = req.body.waiting_time;
    var no_of_players = req.body.no_of_players;
    //res.send(myArray);
    user.findOne({ 'auth_token': auth_token }, function(usr_err, usr_result) {
        if (usr_err) {
            res.send(usr_err);
        } else {
            if (usr_result) {
                //console.log(usr_result);
                var getUsrName = usr_result.name;
                var getUsrId = usr_result._id;
                var finalArray = [];
                var insertArray = [];
                var get_error = [];
                var game_room_entry = new game_room();
                game_room_entry.send_from = getUsrId;
                game_room_entry.language_name = language_name;
                game_room_entry.board_layout = board_layout;
                game_room_entry.game_mode = game_mode;
                game_room_entry.waiting_time = waiting_time;
                game_room_entry.number_of_player = no_of_players;
                game_room_entry.save(function(save_err, save_result) {
                    if (save_err) {
                        res.send(save_err);
                    } else {
                        var game_id = save_result._id;
                        async_node.map(myArray, function(singleId, callback) {
                            //console.log(singleId);
                            user.findOne({ '_id': singleId }, function(opponent_err, opponent_result) {
                                if (opponent_err) {
                                    res.send(opponent_err);
                                } else {
                                    //console.log(opponent_result);
                                    if (opponent_result.device_token) {

                                        var deviceToken = opponent_result.device_token;
                                        //console.log(deviceToken);
                                        var FCM = require('fcm-node');

                                        var fcm = new FCM("AAAAIvf_8fY:APA91bGyIz8sVZUzpT0IGqntP88iIP-z7OGFQ0dHKyMcYDvTfhrz_HFuLJ2TFJL8r8l9L6p0qZWTl-5I3vG7SWwABhm4k-LPokZSHLxcOgnwX4g1fi4kcUN7srub8IoqBh1uFgEQpcSC")
                                        var notification_body = getUsrName + " send you a challenge for SmartFeud. Please accept the challenge.";
                                        var message = {
                                            to: deviceToken,
                                            notification: {
                                                title: 'Smart Feud',
                                                body: notification_body
                                            },
                                            data: { //you can send only notification or only data(or include both) 
                                                message: 'Message - 3',
                                                game_id: game_id,
                                                no_of_players: no_of_players,
                                                board_layout: board_layout,
                                                language_name: language_name,
                                                sender_name: getUsrName,
                                                challenge_type: 'challenge'
                                            }
                                        }

                                        fcm.send(message, function(err, response) {
                                            if (err) {
                                                console.log(err);
                                                //callback();
                                            } else {
                                                console.log("Successfully sent with response: ", response);
                                                finalArray.push(singleId);
                                            }
                                            callback();
                                        })
                                    } else {
                                        var error = {};
                                        error.status = "error";
                                        error.message = "device token is required.";
                                        get_error.push(error);
                                        callback();
                                    }
                                }
                            });
                        }, function() {
                            //console.log(finalArray);
                            if (get_error.length == myArray.length) {
                                var result = {};
                                result.status = "error";
                                result.message = "Device token is required.";
                                res.send(result);
                            } else {
                                if (finalArray.length > 0) {
                                    for (var new_counter = 0; new_counter < finalArray.length; new_counter++) {
                                        var individualArray = {};
                                        individualArray.opponent_id = finalArray[new_counter];
                                        individualArray.status = 0;
                                        insertArray.push(individualArray);
                                    }
                                    game_room.findOne({ '_id': game_id }, function(game_err, game_result) {
                                        if (game_err) {
                                            res.send(game_err);
                                        } else {
                                            game_result.send_to = insertArray;
                                            game_result.save(function(game_save_err, game_save_result) {
                                                if (game_save_err) {
                                                    res.send(game_save_err);
                                                } else {
                                                    var user_rank_entry = new user_rank();
                                                    user_rank_entry.game_id = game_id;
                                                    user_rank_entry.user_id = getUsrId;
                                                    user_rank_entry.rank = 1;
                                                    user_rank_entry.save(function(rank_err, rank_result) {
                                                        if (rank_err) {
                                                            res.send(rank_err);
                                                        } else {
                                                            var result = {};
                                                            result.status = "success";
                                                            result.message = "Invitation send successfully";
                                                            result.game_id = game_id;
                                                            result.board_lauout = {};
                                                            res.send(result);
                                                        }
                                                    })
                                                }
                                            })
                                        }
                                    })
                                } else {
                                    var result = {};
                                    result.status = "error";
                                    result.message = "Invitation not send";
                                    result.game_id = game_id;
                                    result.board_lauout = {};
                                    res.send(result);
                                }
                            }


                        });
                    }
                })

            } else {
                var result = {};
                result.status = "error";
                result.message = "User not exists";
                res.send(result);
            }
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



    //res.send("THIS IS SAMPLE");
});
//----------------------- Function to accept the challenge invitation ----------------------------------//
router.post('/accept_challenge', function(req, res, next) {
    var auth_token = req.body.auth_token;
    var game_id = req.body.game_id;
    var NotifyUser = [];
    var show_error = [];
    user.findOne({ 'auth_token': auth_token }, function(usr_err, usr_data) {
        if (usr_err) {
            res.send(usr_err);
        } else {
            if (usr_data) {
                var usrId = usr_data._id;
                game_room.findOne({ '_id': game_id }).populate('send_from').exec(function(game_err, game_result) {
                    if (game_err) {
                        res.send(game_err);
                    } else {
                        var getUsrName = game_result.send_from.name;
                        var no_of_players = game_result.number_of_player;
                        var board_layout = game_result.board_layout;
                        var language_name = game_result.language_name;
                        //var getUsrName = game_result.send_from.name;
                        NotifyUser.push(game_result.send_from._id);
                        var new_opponent_array = [];
                        var counter_value = 1;
                        for (var counter = 0; counter < game_result.send_to.length; counter++) {
                            var new_opponent_object = {};
                            var opponent_id = game_result.send_to[counter].opponent_id;

                            if (String(opponent_id) == String(usrId)) {
                                new_opponent_object.opponent_id = game_result.send_to[counter].opponent_id;
                                new_opponent_object._id = game_result.send_to[counter]._id;
                                new_opponent_object.status = 1;
                                counter_value++;
                            } else {
                                NotifyUser.push(opponent_id);
                                new_opponent_object = game_result.send_to[counter];
                                if (game_result.send_to[counter].status == 1) {
                                    counter_value++;
                                }
                            }
                            new_opponent_array.push(new_opponent_object);
                        }
                        game_result.send_to = new_opponent_array;
                        if (parseInt(counter) == parseInt(game_result.number_of_player)) {
                            game_result.status = 1;
                        }
                        game_result.save(function(updt_err, updt_result) {
                            if (updt_err) {
                                res.send(updt_err);
                            } else {
                                user_rank.find({ 'game_id': game_id }, function(rank_err, rank_result) {
                                    if (rank_err) {
                                        res.send(rank_err);
                                    } else {
                                        var new_rank = parseInt(rank_result.length) + 1;
                                        var user_rank_entry = new user_rank();
                                        user_rank_entry.game_id = game_id;
                                        user_rank_entry.user_id = usrId;
                                        user_rank_entry.rank = new_rank;
                                        user_rank_entry.save(function(save_rank_err, save_rank_result) {
                                            if (save_rank_err) {
                                                res.send(save_rank_err);
                                            } else {
                                                async_node.map(NotifyUser, function(singleId, callbackNext) {
                                                    user.findOne({ '_id': singleId }, function(notify_err, notify_result) {
                                                        if (notify_err) {
                                                            var error_msg = notify_err;
                                                            show_error.push(error_msg);
                                                        } else {
                                                            if (notify_result) {
                                                                if (notify_result.device_token) {
                                                                    var deviceToken = notify_result.device_token;
                                                                    var FCM = require('fcm-node');
                                                                    var fcm = new FCM("AAAAIvf_8fY:APA91bGyIz8sVZUzpT0IGqntP88iIP-z7OGFQ0dHKyMcYDvTfhrz_HFuLJ2TFJL8r8l9L6p0qZWTl-5I3vG7SWwABhm4k-LPokZSHLxcOgnwX4g1fi4kcUN7srub8IoqBh1uFgEQpcSC")
                                                                    var notification_body = getUsrName + " accept this challenge.";
                                                                    var message = {
                                                                        to: deviceToken,
                                                                        notification: {
                                                                            title: 'Smart Feud',
                                                                            body: notification_body
                                                                        },
                                                                        data: { //you can send only notification or only data(or include both) 
                                                                            message: 'Message - 3',
                                                                            game_id: game_id,
                                                                            no_of_players: no_of_players,
                                                                            board_layout: board_layout,
                                                                            language_name: language_name,
                                                                            sender_name: getUsrName,
                                                                            challenge_type: 'accept'
                                                                        }
                                                                    }
                                                                    fcm.send(message, function(err, response) {
                                                                        if (err) {
                                                                            console.log(err);
                                                                            show_error.push(singleId);
                                                                        } else {
                                                                            console.log("Successfully sent with response: ", response);
                                                                        }
                                                                        callback();
                                                                    })
                                                                } else {
                                                                    var error_msg = 'Invalid device token';
                                                                    show_error.push(error_msg);
                                                                    callback();
                                                                }
                                                            }
                                                        }
                                                    })
                                                }, function() {
                                                    if (show_error.length > 0) {
                                                        if (NotifyUser.length == show_error.length) {
                                                            var result = {};
                                                            result.status = "error";
                                                            result.message = "Device token is required.";
                                                            res.json(result);
                                                        } else {
                                                            var result = {};
                                                            result.status = "success";
                                                            result.message = "Invitation accepted successfully";
                                                            res.json(result);
                                                        }
                                                    } else {
                                                        var result = {};
                                                        result.status = "success";
                                                        result.message = "Invitation accepted successfully";
                                                        res.json(result);
                                                    }
                                                });
                                                // var result = {};
                                                // result.status = "success";
                                                // result.message = "Invitation accepted successfully";
                                                // res.json(result);
                                            }
                                        })
                                    }
                                })
                            }
                        })
                    }
                })
            } else {
                var result = {};
                result.status = "error";
                result.message = "User not exists";
                res.json(result);
            }

        }
    })
});
//----------------------- Function to declined the challenge invitation --------------------------------//
router.post('/declined_challenge', function(req, res, next) {
    var auth_token = req.body.auth_token;
    var game_id = req.body.game_id;
    var NotifyUser = [];
    //var NotifyUser = [];
    user.findOne({ '_id': auth_token }, function(usr_err, usr_result) {
        if (usr_err) {
            res.send(usr_err);
        } else {
            var new_opponent_array = [];
            var usrId = usr_result._id;
            var getUsrName = usr_result.name;
            game_room.findOne({ '_id': game_id }, function(game_err, game_result) {
                if (game_err) {
                    res.send(game_err);
                } else {
                    var game_id = game_result._id;
                    var no_of_players = game_result.no_of_players;
                    var board_layout = game_result.board_layout;
                    var language_name = game_result.language_name;
                    NotifyUser.push(game_result.send_from);
                    if (game_result.send_to.length > 0) {
                        for (var counter = 0; counter < game_result.send_to.length; counter++) {
                            var new_opponent_object = {};
                            var opponent_id = game_result.send_to[counter].opponent_id;
                            if (String(opponent_id) == String(usrId)) {
                                new_opponent_object.opponent_id = game_result.send_to[counter].opponent_id;
                                new_opponent_object._id = game_result.send_to[counter]._id;
                                new_opponent_object.status = 2;
                                counter_value++;
                            } else {
                                new_opponent_object = game_result.send_to[counter];

                            }
                            new_opponent_array.push(new_opponent_object);
                            NotifyUser.push(opponent_id);
                        }
                    }
                    game_result.send_to = new_opponent_array;
                    game_result.status = 2;
                    game_result.save(function(updt_err, updt_result) {
                        if (updt_err) {
                            res.send(updt_err);
                        } else {
                            var show_error = [];
                            async_node.map(NotifyUser, function(singleId, callbackNext) {
                                user.findOne({ '_id': singleId }, function(notify_err, notify_result) {
                                    if (notify_err) {
                                        var error_msg = notify_err;
                                        show_error.push(error_msg);
                                    } else {
                                        if (notify_result) {
                                            if (notify_result.device_token) {
                                                var deviceToken = notify_result.device_token;
                                                var FCM = require('fcm-node');
                                                var fcm = new FCM("AAAAIvf_8fY:APA91bGyIz8sVZUzpT0IGqntP88iIP-z7OGFQ0dHKyMcYDvTfhrz_HFuLJ2TFJL8r8l9L6p0qZWTl-5I3vG7SWwABhm4k-LPokZSHLxcOgnwX4g1fi4kcUN7srub8IoqBh1uFgEQpcSC")
                                                var notification_body = getUsrName + " declined this game.";
                                                var message = {
                                                    to: deviceToken,
                                                    notification: {
                                                        title: 'Smart Feud',
                                                        body: notification_body
                                                    },
                                                    data: { //you can send only notification or only data(or include both) 
                                                        message: 'Message - 3',
                                                        game_id: game_id,
                                                        no_of_players: no_of_players,
                                                        board_layout: board_layout,
                                                        language_name: language_name,
                                                        sender_name: getUsrName,
                                                        challenge_type: 'decline'
                                                    }
                                                }
                                                fcm.send(message, function(err, response) {
                                                    if (err) {
                                                        console.log(err);
                                                        show_error.push(singleId);
                                                    } else {
                                                        console.log("Successfully sent with response: ", response);
                                                    }
                                                    callback();
                                                })
                                            } else {
                                                var error_msg = 'Invalid device token';
                                                show_error.push(error_msg);
                                                callback();
                                            }
                                        }
                                    }
                                })
                            }, function() {
                                if (show_error.length > 0) {
                                    if (NotifyUser.length == show_error.length) {
                                        var result = {};
                                        result.status = "error";
                                        result.message = "Device token is required.";
                                        res.json(result);
                                    } else {
                                        var result = {};
                                        result.status = "success";
                                        result.message = "Declined successfully";
                                        res.json(result);
                                    }
                                } else {
                                    var result = {};
                                    result.status = "success";
                                    result.message = "Declined successfully";
                                    res.json(result);
                                }
                            });
                        }
                    })
                }
            })
        }
    })

});
//----------------------- Function to add the friend -----------------------------------//
router.post('/add_friend', function(req, res, next) {
    var auth_token = req.body.auth_token;
    var opponent_id = req.body.opponent_id;
    user.findOne({ 'auth_token': auth_token }, function(usr_err, usr_result) {
        if (usr_err) {
            res.send(usr_err);
        } else {
            if (usr_result) {
                var userId = usr_result._id;
                var friendDetails = new friend();
                friendDetails.user_id = userId;
                friendDetails.friend_id = opponent_id;
                friendDetails.save(function(save_err, save_result) {
                    if (save_err) {
                        res.send(save_err);
                    } else {
                        var result = {};
                        result.status = "success";
                        result.message = "Friend Added Succesfully";
                        res.send(result);
                    }
                })
            } else {
                var result = {};
                result.status = "error";
                result.message = "This user does not exists";
                res.send(result);
            }
        }
    })
});
//---------------------- Function to block the user ----------------------------------//
router.post('/block_friend', function(req, res, next) {
    var auth_token = req.body.auth_token;
    var opponent_id = req.body.opponent_id;
    user.findOne({ 'auth_token': auth_token }, function(usr_err, usr_result) {
        if (usr_err) {
            res.send(usr_err);
        } else {
            if (usr_result) {
                var userId = usr_result._id;
                var blockUserDetails = new block_user();
                blockUserDetails.user_id = userId;
                blockUserDetails.block_id = opponent_id;
                blockUserDetails.save(function(save_err, save_result) {
                    if (save_err) {
                        res.send(save_err);
                    } else {
                        var result = {};
                        result.status = "success";
                        result.message = "User has been blocked succesfully";
                        res.send(result);
                    }
                })
            } else {
                var result = {};
                result.status = "error";
                result.message = "This user does not exists";
                res.send(result);
            }
        }
    })
});
//----------------------- Function to get the block user list -------------------------------//
router.post('/block_list', function(req, res, next) {
    var auth_token = req.body.auth_token;
    user.findOne({ 'auth_token': auth_token }, function(usr_err, usr_result) {
        if (usr_err) {
            res.send(usr_err);
        } else {
            if (usr_result) {
                console.log(usr_result);
                block_user.find({ 'user_id': usr_result._id }).populate('block_id').exec(function(block_err, block_result) {
                    if (block_err) {
                        res.send(block_err);
                    } else {
                        //res.send(block_result);
                        var block_result_arr = [];
                        if (block_result.length > 0) {
                            for (var block_counter in block_result) {
                                var usr_obj = {};
                                var get_result = block_result[block_counter].block_id;
                                usr_obj.user_id = get_result._id;
                                usr_obj.user_name = get_result.name;
                                if (get_result.image) {
                                    if (url_regexp.test(get_result.image)) {
                                        usr_obj.image = get_result.image;
                                    } else {
                                        usr_obj.image = live_url + 'uploads/' + get_result.image;
                                    }
                                } else {
                                    usr_obj.image = live_url + 'uploads/no-user.png';
                                }
                                block_result_arr.push(usr_obj);
                            }
                        }
                        var result = {};
                        result.status = "success";
                        result.message = "Block user list get successfully";
                        result.users = block_result_arr;
                        res.send(result);
                    }
                })
            } else {
                var result = {};
                result.status = "error";
                result.message = "This user does not exists";
                res.send(result);
            }
        }
    })
});
//------------------------ Function to get the unblock user list -----------------------------//
router.post('/unblock_friend', function(req, res, next) {
    var auth_token = req.body.auth_token;
    var blocked_user_id = req.body.blocked_user_id;
    user.findOne({ 'auth_token': auth_token }, function(usr_err, usr_result) {
        if (usr_err) {
            res.send(usr_err);
        } else {
            if (usr_result) {
                var user_id = usr_result._id;
                block_user.findOne({ 'user_id': user_id, 'block_id': blocked_user_id }, function(block_usr_err, block_usr_result) {
                    if (block_usr_err) {
                        res.send(block_usr_err);
                    } else {
                        block_user.remove({ '_id': block_usr_result._id }, function(delete_block_err, delete_block_result) {
                            if (delete_block_err) {
                                res.send(delete_block_err);
                            } else {
                                var result = {};
                                result.status = "success";
                                result.message = "User has been unblcoked succesfully";
                                res.send(result);
                            }
                        })

                    }
                })
            } else {
                var result = {};
                result.status = "error";
                result.message = "This user does not exists";
                res.send(result);
            }
        }
    });
});
//----------------------- Function to get the all friends ----------------------------------//
router.post('/get_all_friend', function(req, res, next) {
    var auth_token = req.body.auth_token;
    var fb_friends = req.body.fb_friends;
    var smartFeudFriend = [];
    var facebookFriend = [];
    var friendId = [];
    var new_array = [];
    user.findOne({ 'auth_token': auth_token }, function(usr_err, usr_result) {
        if (usr_err) {
            res.send(usr_err);
        } else {
            if (usr_result) {
                friend.find({ 'user_id': usr_result._id }).populate('friend_id').exec(function(friend_err, friend_result) {
                    if (friend_err) {
                        res.send(friend_err);
                    } else {
                        //res.send(friend_result);
                        if (friend_result.length > 0) {
                            for (var friend_counter in friend_result) {
                                var smartfeudFrnd = {};
                                var StringFriendId = String(friend_result[friend_counter].friend_id._id);
                                friendId.push(StringFriendId);
                                smartfeudFrnd.user_id = friend_result[friend_counter].friend_id._id;
                                smartfeudFrnd.user_name = friend_result[friend_counter].friend_id.name;
                                if (friend_result[friend_counter].friend_id.image) {
                                    if (url_regexp.test(friend_result[friend_counter].friend_id.image)) {
                                        smartfeudFrnd.user_profilepic = friend_result[friend_counter].friend_id.image;
                                    } else {
                                        smartfeudFrnd.user_profilepic = profile_image_url + friend_result[friend_counter].friend_id.image;
                                    }

                                } else {
                                    smartfeudFrnd.user_profilepic = live_url + 'uploads/no-user.png';
                                }
                                smartfeudFrnd.skill_rating = 10;
                                smartfeudFrnd.last_gameplayed = 10;
                                smartFeudFriend.push(smartfeudFrnd);
                            }
                        }

                    }
                    if (fb_friends) {
                        var fbArray = fb_friends.split(",");
                        user.find({ '_login_type': 3, 'social_id': { $in: fbArray } }, function(fb_err, fb_result) {
                            if (fb_err) {
                                res.send(fb_err);
                            } else {
                                //console.log(fb_result);
                                if (fb_result.length > 0) {
                                    for (var fb_counter in fb_result) {
                                        var StringFBFriendID = String(fb_result[fb_counter]._id);
                                        console.log(StringFBFriendID);
                                        console.log(friendId);
                                        console.log(friendId.indexOf(StringFBFriendID));
                                        var indexValue = friendId.indexOf(StringFBFriendID);

                                        if (indexValue == -1) {
                                            var fb_Object = {};
                                            fb_Object.user_id = fb_result[fb_counter]._id;
                                            fb_Object.user_name = fb_result[fb_counter].name;
                                            if (fb_result[fb_counter].image) {
                                                if (url_regexp.test(fb_result[fb_counter].image)) {
                                                    fb_Object.user_profilepic = fb_result[fb_counter].image;
                                                } else {
                                                    fb_Object.user_profilepic = profile_image_url + fb_result[fb_counter].image;
                                                }

                                            } else {
                                                fb_Object.user_profilepic = live_url + 'uploads/no-user.png';
                                            }
                                            fb_Object.skill_rating = 10;
                                            fb_Object.last_gameplayed = 10;
                                            facebookFriend.push(fb_Object);
                                        }
                                    }
                                }
                                //console.log(facebookFriend);
                                var result = {};
                                result.status = "success";
                                //result.smartfeud_friend = smartFeudFriend;
                                result.facebook_friend = facebookFriend;
                                res.json(result);
                            }
                        })
                    } else {
                        var result = {};
                        result.status = "success";
                        result.smartfeud_friend = smartFeudFriend;
                        //result.facebook_friend = facebookFriend;
                        res.json(result);
                    }

                })
            } else {
                var result = {};
                result.status = "error";
                result.message = "User not exists";
                res.send(result);
            }
        }
    })
});
//------------------------ Function to get the friend details -------------------------------//
router.post('/friend_data', function(req, res, next) {
    var auth_token = req.body.auth_token;
    var friend_id = req.body.friend_id;
    user.findOne({ 'auth_token': auth_token }, function(usr_err, usr_result) {
        if (usr_err) {
            res.send(usr_err);
        } else {
            if (usr_result) {
                var usrId = usr_result._id;
                user.findOne({ '_id': friend_id }, function(friend_err, friend_result) {
                    if (friend_err) {
                        res.send(friend_err);
                    } else {
                        if (friend_result) {
                            block_user.findOne({ 'user_id': usrId, 'block_id': friend_id }, function(block_err, block_result) {
                                if (block_err) {
                                    res.send(block_err);
                                } else {
                                    if (block_result) {
                                        var block_status = true;
                                    } else {
                                        var block_status = false;
                                    }
                                    var user_details = {};
                                    user_details.user_id = friend_result._id;
                                    user_details.user_name = friend_result.name;
                                    if (friend_result.image) {
                                        if (url_regexp.test(friend_result.image)) {
                                            user_details.user_profilepic = friend_result.image;
                                        } else {
                                            user_details.user_profilepic = profile_image_url + friend_result.image;
                                        }

                                    } else {
                                        user_details.user_profilepic = live_url + 'uploads/no-user.png';
                                    }
                                    user_details.skill_rating = 10;
                                    user_details.last_gameplayed = 10;
                                    user_details.wins = 10;
                                    user_details.draw = 10;
                                    user_details.losts = 10;
                                    user_details.friend_type = friend_result._login_type;
                                    user_details.blocked_status = block_status;
                                    var result = {};
                                    result.status = "success";
                                    result.data = user_details;
                                    res.send(result);
                                }
                            })

                        } else {
                            var result = {};
                            result.status = "error";
                            result.message = "invalid friend ID";
                            res.send(result);
                        }

                    }
                })


            } else {
                var result = {};
                result.status = "error";
                result.message = "User not exists";
                res.send(result);
            }
        }
    })
});
router.get('/uploadTSV', function(req, res, next) {


    res.render('uploadTSV', { title: 'Express' });

});
router.post('/uploadTSV', function(req, res, next) {
    // var tsv = req.body.number;
    // var lines=tsv.split("\n");

    // var result = [];

    // var headers=lines[0].split("\t");

    // for(var i=1;i<lines.length;i++){
    //     console.log("details");
    //     var obj = {};
    //     var currentline=lines[i].split("\t");

    //     for(var j=0;j<headers.length;j++){
    //           obj[headers[j]] = currentline[j];
    //     }

    //     result.push(obj);

    // }
    // res.send(result);
    var form = new multiparty.Form();
    form.parse(req, function(err, fields, files) {
        var tempPath = files.upload_csv[0].path;
        var imageName = new Date().getTime() + path.extname(files.upload_csv[0].originalFilename);
        var targetPath = './uploads/' + imageName;
        var dataArray = [];
        fs.readFile(tempPath, function(err, data) {

            fs.writeFile(targetPath, data, function(err, data) {
                if (err) {
                    console.log(err);
                    res.send(err);
                } else {
                    var stream = fs.createReadStream(targetPath);
                    csv.fromStream(stream, { headers: true })
                        .validate(function(data, next) {
                            console.log(data);
                        })
                        .on("data", function(data) {
                            console.log(data);
                        })
                        .on("end", function() {
                            console.log("done");
                            res.send("TEST");
                            //fs.unlink(targetPath);

                        });
                }
            });
        });
    });
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
router.post('/insertGame', function(req, res, next) {
    var userId = req.body.sender_id;
    var opponentId = req.body.opponent_id;
    var myArray = opponentId.split(",");
    var insertArray = [];
    var finalID = [];
    var response = [];
    async_node.map(myArray, function(singleId, callback) {
        test_game.findOne({ 'sender_id': userId }).elemMatch("receive_id", { "opponent_id": singleId, "status": { $ne: 2 } }).exec(function(get_err, get_result) {
            if (get_err) {
                res.send(get_err);
            } else {
                if (get_result) {
                    var err_response = {};
                    err_response.status = 'error';
                    err_response.message = 'You have allready send the notification to this friend.';
                    response.push(err_response);
                } else {
                    finalID.push(singleId);

                }
                callback();
            }
        });
    }, function() {
        var result = {};
        if (response.length > 0) {
            result.status = 'error';
            result.message = 'You have allready send the notification to this friend.';
            res.send(result);
        } else {
            if (finalID.length > 0) {
                for (var new_counter = 0; new_counter < finalID.length; new_counter++) {
                    var individualArray = {};
                    individualArray.opponent_id = finalID[new_counter];
                    individualArray.status = 0;
                    insertArray.push(individualArray);
                }
                var insert_test_game = new test_game();
                insert_test_game.sender_id = userId;
                insert_test_game.receive_id = insertArray;
                insert_test_game.save(function(err_game, result_game) {
                    if (err_game) {
                        res.send(err_game);
                    } else {
                        result.status = 'success';
                        result.message = 'Game room successfully created.';
                        res.send(result);
                    }
                })
            } else {
                result.status = 'success';
                result.message = 'Game room allready created.';
                res.send(result);
            }
        }
    });
    // test_game.findOne({ 'sender_id': userId }).elemMatch("receive_id", { "opponent_id": opponentId, "status": { $ne: 2 } }).exec(function(get_err, get_result) {
    //     if (get_err) {
    //         res.send(get_err);
    //     } else {
    //         //res.send(get_result);
    //         if (get_result) {
    //             var result = {};
    //             result.status = 'error';
    //             result.message = 'You have allready send the notification to this friend.';
    //             res.send(result);
    //         } else {

    //             var get_receive = get_result.receive_id;
    //             get_receive.push(insertArray);
    //             get_result.receive_id = get_receive;
    //             get_result.save(function(updt_err, updt_result) {
    //                 if (updt_err) {
    //                     res.send(updt_err);
    //                 } else {
    //                     var result = {};
    //                     result.status = 'success';
    //                     result.message = 'Successfully updated';
    //                     res.json(result);
    //                 }
    //             })
    //         }
    //     }
    // })


    // test_game.findOne({ 'sender_id': userId }, function(get_err, get_result) {
    //     if (get_err) {
    //         res.send(get_err);
    //     } else {
    //         if (get_result) {
    //             var get_receive = get_result.receive_id;
    //             get_receive.push(insertArray);
    //             get_result.receive_id = get_receive;
    //             get_result.save(function(updt_err, updt_result) {
    //                 if (updt_err) {
    //                     res.send(updt_err);
    //                 } else {
    //                     var result = {};
    //                     result.status = 'success';
    //                     result.message = 'Successfully updated';
    //                     res.json(result);
    //                 }
    //             })
    //         } else {
    //             var insert_test_game = new test_game();
    //             insert_test_game.sender_id = userId;
    //             insert_test_game.receive_id = insertArray;
    //             //res.send(insertArray);
    //             insert_test_game.save(function(save_err, save_result) {
    //                 if (save_err) {
    //                     res.send(save_err);
    //                 } else {
    //                     var result = {};
    //                     result.status = 'success';
    //                     result.message = 'Successfully inserted';
    //                     res.json(result);
    //                 }
    //             })
    //         }
    //     }
    // })

})
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
router.post('/getImageDetails', function(req, res, next) {

    // var data = req.body.profileImage;
    // var myBuffer = new Buffer(data.length);
    // for (var i = 0; i < data.length; i++) {
    //       myBuffer[i] = data[i];
    // }
    // //var d=new Date().valueOf();
    // var filename = 'image.jpg';
    // fs.writeFile(filename, myBuffer, function(err) {
    //     if(err) {
    //         console.log(err);
    //         var result = {};
    //         result.status = "error";
    //         result.message = "Not Uploaded yet";

    //     } else {
    //         console.log("The file was saved!");
    //         var result = {};
    //         result.status = "success";
    //         result.message = "Uploaded yet";
    //     }
    //     res.send(result);
    // });

    // console.log(req.headers);
    // var form = multiparty.Form();

    // form.parse(req, function(err, fields, files) {

    //         console.log("=========================>>>",err);


    //     });






    // console.log(err,fields,files);
    //   if (err) {
    //     console.log(err);
    //     // return res.json(Utility.output(err, 'ERROR'));
    //   } else {
    //     var extension = ((/[.]/.exec(files.profileImage[0].originalFilename)) ? /[^.]+$/.exec(files.profileImage[0].originalFilename) : '');
    //   if (extension == "jpg" || extension == "jpeg" || extension == "png" || extension == "gif") {
    //     fs.readFile(files.profileImage[0].path, function(err, data) {
    //       var fileNamex = newContact._id + '.' + extension;
    //       var newPath =  './uploads/' + fileNamex;
    //       contact_image_global = fileNamex;
    //       fs.writeFile(newPath, data, function(err) {
    //         if (err) {
    //             console.log("upload err",err);
    //         } else {
    //         console.log("uploaded-------->",newPath);
    //         }
    //       });
    //     });
    //   } else {
    //     console.log("ext",extension);
    //     res.send('Only image file[*.jpg/*.jpeg/*.png/*.gif] will be accepted');
    //   }

    //   }





    // console.log(req.body);

    //     console.log("=====================>",req.rawBody);
    //     fs.writeFile('abc.wav', req.rawBody, 'binary', function(err){
    //         console.log(err);
    //     if (err) throw err;
    //     });
    //     var result = {};
    //     result.status = "error";
    //     result.message = "Uploaded yet";
    //     res.send(result);


})
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