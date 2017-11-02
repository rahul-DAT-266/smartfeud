var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');

var app = express();
//app.io = require('socket.io')();
// var server = require('http').createServer(app);
// var io = require('socket.io').listen(server);

// server.listen(3000);
// console.log(io);



var index = require('./routes/index');
var users = require('./routes/users');
var apiController = require('./controllers/api');
var apiDemoController = require('./controllers/api_demo');
//var test = require('./controllers/test');


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
mongoose.Promise = global.Promise;
var mongooseConnect = mongoose.connect('mongodb://127.0.0.1:27017/SmartFeud');
//var mongooseConnect = mongoose.createConnection('mongodb://127.0.0.1:27017/SmartFeud');
if(mongooseConnect){
  console.log("Mongoose Connect");
}else{
  console.log("Not Connedt");
}
// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));


// io.on( "connection", function( socket )
// {
//     console.log( "A user connected" );
// });
// app.use(logger('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
// app.use(function(req, res, next) {
//   console.log(req.path);
//     var data = new Buffer('');
        
//     req.on('data', function(chunk) {
//     console.log("On data is fire");
//     // if(req.path=='/apidemo/getImageDetails'){
//     data = Buffer.concat([data, chunk]);
//     // }
//     });
//     req.on('end', function() {
//       console.log("End is fire");
//     // if(req.path=='/apidemo/getImageDetails'){
//       req.rawBody = data;
//       next();
//     // }else {
//     //   return next();
//     // }
//     });
//     if(req.path !== '/apidemo/getImageDetails') {
//         next();
//     }

// });


app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads',express.static('uploads'));
app.use('/node_modules',express.static('node_modules'));

app.use('/', index);
app.use('/users', users);
app.use('/api',apiController);
app.use('/apidemo',apiDemoController);
//app.use('/test', test);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  //console.log("errrrr ==============>",err);
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

// io.on('connection', function(socket){ 
//   console.log("Socket is",socket.id) 
//   socket.on('test',function(data){
//     console.log(data);
//   })
//   socket.emit('test',"Hello")
// });


module.exports = app;
