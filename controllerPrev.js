//var models = require('../model/model.js');
// var UserModel= require('../model/users.js');
// var onlines = require('../model/onlines.js');
// var MessageModel = require('../model/messages.js');
// var path = require('path');
var bodyParser = require('body-parser');
var currentTime = new Date().getTime();

module.exports = function (app,io){
    app.use( bodyParser.json() );
    app.use(bodyParser.urlencoded({     
        extended: true
    }));
    
    // app.get('/',function(req,res){
    //     res.sendFile(path.resolve(__dirname+"/../views/index.html"));
    // });
    
    
    
    
    var handle=null;
    var private=null;
    var users={};
    var keys={};
    
   
    
    io.on('connection',function(socket){
        console.log("Connection :User is connected  "+handle);
        console.log("Connection : " +socket.id);
        io.to(socket.id).emit('handle', handle);
        users[handle]=socket.id;
        keys[socket.id]=handle;
        console.log("Users list : "+users);
        console.log("keys list : "+keys);
        
    });
 
    
};