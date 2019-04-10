var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mysql = require('mysql');
var util = require('util');
var Memcached = require('memcached');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'password',
  database : 'hw7'
});
// node native promisify
var memcached = new Memcached('127.0.0.1:11211');
const query = util.promisify(connection.query).bind(connection);
const memcachedGet = util.promisify(memcached.get).bind(memcached)
const memcachedSet = util.promisify(memcached.set).bind(memcached)
const memcachedTouch = util.promisify(memcached.touch).bind(memcached)
//connection.connect();

app.get('/hw7', async function(req, res, next) {
  var club = req.query.club;
  var pos = req.query.pos;
  var key = club + "_" + pos;
  var memgetres = await memcachedGet(key);
  if(memgetres){
    console.log(memgetres.player);
    if(memgetres.player === "VÃ­ctor BernÃ¡rdez")
      memgetres.player = "Víctor Bernárdez";
    else if(memgetres.player === "Marcos UreÃ±a")
      memgetres.player = "Marcos Ureña";
    else if(memgetres.player === "NicolÃ¡s Lodeiro")
      memgetres.player = "Nicolás Lodeiro";
    else if(memgetres.player === "Gonzalo VerÃ³n")
      memgetres.player = "Gonzalo Verón";
    return res.send({ club: memgetres.club, pos: memgetres.pos, max_assists: memgetres.max_assists, player: memgetres.player, avg_assists: memgetres.avg_assists });
  }
  else{
  //var astQuery = "SELECT MAX(A) as maxAst, GS, Player FROM assists WHERE Club=? AND POS=? ORDER BY GS DESC";
  var astQuery = "SELECT MAX(A) as maxAst FROM assists WHERE Club=? AND POS=?";
  var avgQuery = "SELECT AVG(A) as avgAst FROM assists WHERE Club=? AND POS=?";
  //var astQuery = "SELECT * FROM assists";
  var topAst = await query(astQuery, [club, pos]);
  //if(topAst[1].maxAst){
    //var tempQuery = "SELECT MAX(A) as maxAst, MAX(GS) as goals, Player FROM assists WHERE Club=? AND POS=?";
    //topAst = await query(tempQuery, [club, pos]);
  //}
  var avgAst = await query(avgQuery, [club, pos]);
  console.log(topAst);
  console.log(avgAst);
  console.log(avgAst[0].avgAst);
  var maxAst = topAst[0].maxAst;
  var maxTempQuery = "SELECT Player, GS, A FROM assists WHERE Club=? AND POS=? AND A=? ORDER BY GS DESC";
  var maxTempAst = await query(maxTempQuery, [club, pos, maxAst]);
  var player = maxTempAst[0].Player;
  var average = avgAst[0].avgAst;
  var obj = {
    club: club,
    pos: pos,
    max_assists: maxAst,
    player: player, 
    avg_assists: average
  }
  await memcachedSet(key, obj, 1000);
  console.log(player);
  if(player === "VÃ­ctor BernÃ¡rdez")
    player = "Víctor Bernárdez";
  else if(player === "Marcos UreÃ±a")
    player = "Marcos Ureña";
  else if(player === "NicolÃ¡s Lodeiro")
    player = "Nicolás Lodeiro";
  else if(player === "Gonzalo VerÃ³n")
    player = "Gonzalo Verón";
  return res.send({ club: club, pos: pos, max_assists: maxAst, player: player, avg_assists: average });
  //return res.send("done");
  }
});

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
