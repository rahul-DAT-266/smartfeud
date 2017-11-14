var GameModel = require('../../models/Game_room');
var user = require('../../models/User');
var user_rank = require('../../models/User_rank');
var dictionary = require('../../models/Dictionary');
var async_node = require('async');
var live_url = 'http://182.75.72.148:3001/';
var profile_image_url = 'http://182.75.72.148/smartfeud_image/uploads/smartfued_image/';
var url_regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;

module.exports = function(io) {
    io.on('connection', function(socket) {
        // socket.on('start game', function(data) {

        // })
        socket.on('game_list', function(data) {
            var auth_token = data.auth_token;
            user.findOne({ 'auth_token': auth_token }, function(usr_err, usr_result) {
                if (usr_err) {
                    callback(usr_err, null);
                } else {
                    if (usr_result) {
                        user_rank.find({ 'user_id': usr_result._id }).populate('game_id').exec(function(current_game_err, current_game_result) {
                            if (current_game_err) {
                                res.send(current_game_err);
                            } else {
                                if (current_game_result.length > 0) {
                                    var usrId = usr_result._id;
                                    var current_games = [];
                                    async_node.map(current_game_result, function(singleGameId, callbackGame) {
                                        var user_details = [];
                                        var current_games_obj = {};
                                        user_rank.find({ 'game_id': singleGameId.game_id._id }).populate('user_id').exec(function(usr_details_err, usr_details_result) {
                                            if (usr_details_err) {
                                                //console.log(usr_details_err);
                                                callbackGame();
                                            } else {
                                                //console.log(usr_details_result);
                                                if (singleGameId.game_id.game_status == 0) {
                                                    current_games_obj.gameStatus = "Pending";
                                                }
                                                if (singleGameId.game_id.game_status == 1) {
                                                    current_games_obj.gameStatus = "Active";
                                                }
                                                if (singleGameId.game_id.game_status == 3) {
                                                    current_games_obj.gameStatus = "Finished";
                                                }
                                                current_games_obj.gameId = singleGameId.game_id._id;
                                                current_games_obj.board_layout = singleGameId.game_id.board_layout;
                                                current_games_obj.game_language = singleGameId.game_id.language_name;
                                                current_games_obj.nextturn = singleGameId.game_id.current_turn;
                                                current_games_obj.number_of_players = singleGameId.game_id.number_of_player;
                                                for (var usr_counter = 0; usr_counter < usr_details_result.length; usr_counter++) {
                                                    var usr_details_obj = {};
                                                    usr_details_obj.user_id = usr_details_result[usr_counter].user_id._id;
                                                    usr_details_obj.user_name = usr_details_result[usr_counter].user_id.name;
                                                    if (usr_details_result[usr_counter].user_id.image) {
                                                        if (url_regexp.test(usr_details_result[usr_counter].user_id.image)) {
                                                            usr_details_obj.user_profilepic = usr_details_result[usr_counter].user_id.image;
                                                        } else {
                                                            usr_details_obj.user_profilepic = live_url + 'uploads/' + usr_details_result[usr_counter].user_id.image;
                                                        }
                                                    } else {
                                                        usr_details_obj.user_profilepic = live_url + 'uploads/no-user.png';
                                                    }
                                                    usr_details_obj.skill_rating = usr_details_result[usr_counter].score;
                                                    usr_details_obj.last_gameplayed = 10;
                                                    usr_details_obj.wins = 10;
                                                    usr_details_obj.draws = 10;
                                                    usr_details_obj.losts = 10;
                                                    usr_details_obj.current_letters = usr_details_result[usr_counter].current_letter;
                                                    user_details.push(usr_details_obj);
                                                }
                                                current_games_obj.users = user_details;
                                                current_games_obj.boardlayout_position = singleGameId.game_id.boardlayout_position;
                                                current_games_obj.board_letters = singleGameId.game_id.board_letters;
                                                current_games.push(current_games_obj);
                                            }
                                            callbackGame();
                                        })
                                    }, function() {
                                        var result = {};
                                        result.status = "success";
                                        result.user_id = usrId;
                                        result.current_games = current_games;
                                        //res.json(result);
                                        socket.to(socket.id).emit('game_response', result);
                                    });
                                } else {
                                    var result = {};
                                    result.status = "success";
                                    result.user_id = usrId;
                                    result.current_games = [];
                                    //res.json(result);
                                    socket.to(socket.id).emit('game_response', result);
                                }
                            }
                        })
                    } else {
                        var result = {};
                        result.status = 'error';
                        result.message = 'User does not exists';
                        //callback(null, result);
                        socket.to(socket.id).emit('game_response', result);
                    }
                }
            });
        });
        socket.on('user_turn', function(data) {
            var auth_token = data.auth_token;
            var gameId = data.gameid;
            var played_words = data.played_words;
            var board_letters = data.board_letters;
            var unplayed_letters = data.unplayed_letters;
            var words_value = data.words_value;
            var language = data.language;
            //console.log(data);
            if ((language == 'English (United States)') || (language == 'English (United Kingdom)')) {
                var language_code = 'ENG';
            } else {
                var language_code = 'DUT';
            }
            var language_code = 'ENG';
            var checkWordExist = [];
            user.findOne({ 'auth_token': auth_token }, function(usr_err, usr_result) {
                if (usr_err) {
                    socket.emit('turn_response', usr_err);
                } else {
                    if (usr_result) {
                        var userId = usr_result._id;
                        async_node.map(played_words, function(singleId, callbackNext) {
                            dictionary.findOne({ 'language_code': language_code }, function(get_err, get_result) {
                                if (get_err) {
                                    //res.send(get_err);
                                    callbackNext();
                                } else {
                                    var checkWord = get_result.dictionary.indexOf(singleId);
                                    if (checkWord < 0) {
                                        var message = "word does not match";
                                        checkWordExist.push(message);
                                    }
                                    callbackNext();
                                }
                            })
                        }, function() {
                            //console.log(unplayed_letters);
                            if (checkWordExist.length > 0) {
                                var result = {};
                                result.status = "error";
                                result.message = "Words does not match with dictionary.";
                                //socket.emit('turn_response', result);
                                socket.to(gameId).emit('turn_response', result);
                            } else {
                                var unused_letter_array = [];
                                var total_letter_array = [];
                                //console.log(unplayed_letters.length);
                                for (var unused_letter_counter = 0; unused_letter_counter < unplayed_letters.length; unused_letter_counter++) {
                                    var unused_letter_obj = {};
                                    unused_letter_obj.charecter = unplayed_letters[unused_letter_counter].letter;
                                    unused_letter_obj.value = unplayed_letters[unused_letter_counter].val;
                                    unused_letter_array.push(unused_letter_obj);
                                    total_letter_array.push(unused_letter_obj)
                                }
                                GameModel.findOne({ '_id': gameId }, function(exist_err, exist_result) {
                                    if (exist_err) {
                                        //socket.emit('turn_response', exist_err);
                                        socket.to(gameId).emit('turn_response', exist_err);
                                    } else {
                                        //console.log(exist_result);
                                        if (String(exist_result.current_turn) == String(userId)) {
                                            for (var available_letter_counter = 0; available_letter_counter < exist_result.letter.length; available_letter_counter++) {
                                                var total_letter_obj = {};
                                                total_letter_obj.charecter = exist_result.letter[available_letter_counter].charecter;
                                                total_letter_obj.value = exist_result.letter[available_letter_counter].value;
                                                total_letter_array.push(total_letter_obj);
                                            }
                                            var shuffle_array = shuffle(total_letter_array);
                                            var new_users_letter = [];
                                            var rest_array = [];
                                            for (var new_counter = 0; new_counter < 7; new_counter++) {
                                                new_users_letter.push(shuffle_array[new_counter]);
                                            }
                                            for (var rest_counter = 0; rest_counter < shuffle_array.length; rest_counter++) {
                                                if (new_users_letter.indexOf(shuffle_array[rest_counter]) == -1) {
                                                    rest_array.push(shuffle_array[rest_counter]);
                                                }
                                            }
                                            var current_turn = exist_result.next_turn[0].next_turn_id;
                                            var next_turn_array = [];
                                            var next_turn_final_array = [];
                                            for (var next_turn_counter = 0; next_turn_counter < exist_result.next_turn.length; next_turn_counter++) {
                                                var next_turn_obj = {};
                                                next_turn_obj.next_turn_id = exist_result.next_turn[next_turn_counter];
                                                next_turn_array.push(next_turn_obj);
                                            }
                                            var new_turn = {};
                                            new_turn.next_turn_id = exist_result.current_turn;
                                            next_turn_array.push(new_turn);
                                            for (var final_next_turn = 1; final_next_turn < next_turn_array.length; final_next_turn++) {
                                                next_turn_final_array.push(next_turn_array[final_next_turn]);
                                            }
                                            for (var board_letters_count = 0; board_letters_count < board_letters.length; board_letters_count++) {
                                                var position_number = objectPropInArray(exist_result.board_letters, "index", board_letters[board_letters_count].index);
                                                console.log(position_number);
                                                if (position_number != -1) {
                                                    exist_result.board_letters[position_number].letter = board_letters[board_letters_count].letter;
                                                } else {
                                                    var new_board_layout_obj = {};
                                                    new_board_layout_obj.letter = board_letters[board_letters_count].letter;
                                                    new_board_layout_obj.val = board_letters[board_letters_count].val;
                                                    new_board_layout_obj.index = board_letters[board_letters_count].index;
                                                    exist_result.board_letters.push(new_board_layout_obj);
                                                }
                                            }
                                            var total_board_letter = exist_result.board_letters;
                                            exist_result.letter = rest_array;
                                            exist_result.current_turn = current_turn;
                                            exist_result.next_turn = next_turn_final_array;
                                            exist_result.save(function(updt_game_err, updt_game_result) {
                                                if (updt_game_err) {
                                                    //socket.emit('turn_response', updt_game_err);
                                                    socket.to(gameId).emit('turn_response', updt_game_err);
                                                } else {
                                                    user_rank.findOne({ 'game_id': gameId, 'user_id': userId }, function(rank_err, rank_result) {
                                                        if (rank_err) {
                                                            //socket.emit('turn_response', rank_err);
                                                            socket.to(gameId).emit('turn_response', rank_err);
                                                        } else {
                                                            rank_result.current_letter = new_users_letter;
                                                            rank_result.score = parseInt(rank_result.score) + parseInt(words_value);
                                                            rank_result.save(function(updt_rank_err, updt_rank_result) {
                                                                if (updt_rank_err) {
                                                                    //socket.emit('turn_response', updt_rank_err);
                                                                    socket.to(gameId).emit('turn_response', updt_rank_err);
                                                                } else {
                                                                    var result = {};
                                                                    result.status = "success";
                                                                    result.user_id = userId;
                                                                    if (rest_array.length > 7) {
                                                                        result.gameStatus = "active";
                                                                    } else {
                                                                        result.gameStatus = "completed";
                                                                    }
                                                                    result.status = "success";
                                                                    result.gameId = gameId;
                                                                    result.nextturn = current_turn;
                                                                    result.user_letters = new_users_letter;
                                                                    result.board_letters = total_board_letter;
                                                                    console.log(result);
                                                                    //socket.emit('turn_response', result);
                                                                    socket.to(gameId).emit('turn_response', result);
                                                                }
                                                            })
                                                        }
                                                    })
                                                }
                                            })
                                        } else {
                                            var result = {};
                                            result.status = "error";
                                            result.message = "This is not your turn.";
                                            //socket.emit('turn_response', result);
                                            socket.to(gameId).emit('turn_response', result);
                                        }

                                    }
                                })
                            }
                        })

                    } else {
                        var result = {};
                        result.status = "error";
                        result.message = "User does not exist";
                        //socket.emit('turn_response', result);
                        socket.to(gameId).emit('turn_response', result);
                    }
                }
            })


        });
        socket.on('join_game', function(data) {
            var user_id = data.userId;
            var gameId = data.gameId;
            socket.join(gameId);
        })
        socket.on('updt_game', function(data) {
            console.log(data);
            socket.emit('updt_complete', data);
        })
    })

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

    function objectPropInArray(list, prop, val) {
        if (list.length > 0) {
            for (i in list) {
                if (list[i][prop] === val) {
                    return i;
                }
            }
        }
        return -1;
    }
}