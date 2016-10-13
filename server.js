//
// # SimpleServer
//
// A simple chat server using Socket.IO, Express, and Async.
//
var http = require('http');
var path = require('path');
var socketio = require('socket.io');
var express = require('express');
var request = require("request");
var mongoose = require('mongoose');

//
// ## SimpleServer `SimpleServer(obj)`
//
// Creates a new instance of SimpleServer with the following options:
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
//
var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);
var populationDb = mongoose.connect("mongodb://root:root@ds023480.mlab.com:23480/population");
var countriesSchema = mongoose.Schema({
    name: String
},{collection:"countries"});
var countriesCollection = populationDb.model('countries',countriesSchema);

router.use(express.static(path.resolve(__dirname, 'client')));

io.on('connection', function (socket) {
  
    getCountryList(function(countriesObj){
      socket.emit('country', countriesObj);
    });

    socket.on ('setSelectedCountry', function (msg) {
      if(msg){
        var populationApiUrl = "http://api.population.io:80/1.0/population/";
        var selectedCountry = msg.selectedCountry;
        populationApiUrl = populationApiUrl + selectedCountry + "/today-and-tomorrow/";
        getTodayAndTomorrow(populationApiUrl, function(todayAndTomorrow, err){
        if(err) console.log(err);
        todayAndTomorrow.total_population.splice(1,1);
        todayAndTomorrow.total_population[0]['country'] = selectedCountry;
        console.log(todayAndTomorrow);
        socket.emit('todayAndTomorrowData', todayAndTomorrow);
      });
    }
  });

  socket.on('disconnect', function () {

  });

});

function getTodayAndTomorrow(populationApiUrl, callback){
  request(populationApiUrl, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      callback(JSON.parse(body));
      //body = JSON.parse(body);
      //insertCountries(body);  //mongodb'ye ülkeleri kaydeden fonksiyon
      //socket.emit('country', body);
    }
  });
}

function getCountryList(callback){
  var countriesArray = [];
  var countriesObj = {};
  countriesCollection.find({}, null, {sort: {name: 1}}, function(err, countries) {
    if(err) console.log(err);
    for (var i = 0, len = countries.length; i < len; i++) {
      countriesArray.push(countries[i].name);
    }
    countriesObj['countries'] = countriesArray;
    callback(countriesObj);
  });
}






function insertCountries(body){
  for (var i = 0, len = body.countries.length; i < len; i++) {
    var newCountry = new countriesCollection({name : body.countries[i]});
    newCountry.save(function(err){
      if (err) return console.log(err);
      console.log(body.countries[i] + " adında ülke kaydedildi.");
    });
  }
}

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});