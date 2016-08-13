var express = require('express');
var bodyParser = require("body-parser");
var fs = require('fs');
var telegram = require('telegram-bot-api');
var _ = require('underscore');

var Datastore = require('nedb');

var db = new Datastore({
    filename: 'pokemon.users',
    autoload: true
});
var ignore = new Datastore({
    filename: 'pokemon.ignore',
    autoload: true
});

var api = new telegram({
    token: '',
    updates: {
        enabled: true
    }
});


api.getMe().then(function(data) {
        console.log('telegram bot connected');
    })
    .catch(function(err) {
        console.log(err);
    });

api.on('message', function(message) {

    if (message.text == '/start') {
        console.log(message.text, message.chat.username);
        api.sendMessage({
            chat_id: message.chat.id,
            text: 'notifications started. you can do /help for more info \n\n We only display Ultra Rare, Very Rare and Rare pokemons.'
        });
        db.remove(message.chat);
        db.insert(message.chat);
    }

    if (message.text == '/stop') {
        console.log(message.text, message.chat.username);
        api.sendMessage({
            chat_id: message.chat.id,
            text: 'notifications stopped'
        });
        db.remove(message.chat);
    }


    if (message.text.substring(0, 7) == '/ignore') {
        console.log(message.text, message.chat.username);
        api.sendMessage({
            chat_id: message.chat.id,
            text: 'ignored ' + message.text.split(" ")[1]
        });
        ignore.insert({
            id: message.chat.id,
            ignore: message.text.split(" ")[1]
        });
    }

    if (message.text.substring(0, 9) == '/unignore') {
        console.log(message.text, message.chat.username);
        api.sendMessage({
            chat_id: message.chat.id,
            text: 'unignored ' + message.text.split(" ")[1]
        });
        ignore.remove({
            id: message.chat.id,
            ignore: message.text.split(" ")[1]
        });
    }


    if (message.text.substring(0, 5) == '/list') {
        console.log(message.text, message.chat.username);

        ignore.find({
            id: message.chat.id
        }, function(err, ig) {
            var tosend = '';

            _.each(ig, function(items) {
                tosend = tosend + ' ' + items.ignore;
            });

            api.sendMessage({
                chat_id: message.chat.id,
                text: 'ignore list: ' + tosend
            });
        });
    }

    if (message.text.substring(0, 10) == '/clearlist') {
        console.log(message.text, message.chat.username);
        api.sendMessage({
            chat_id: message.chat.id,
            text: 'ignore list cleared'
        });
        ignore.remove({
            id: message.chat.id
        }, {
            multi: true
        });
    }


    if (message.text.substring(0, 5) == '/help') {
        console.log(message.text, message.chat.username);
        api.sendMessage({
            chat_id: message.chat.id,
            text: 'commands: \n /start (start notifications) \n /stop (stop notifications) \n /ignore Pidgey (ignore a pokemon) \n /unignore Pidgey (remove pokemon from ignore list) \n /list (list all pokemons ignored) \n /clearlist (clear ignore list) \n /help'
        });
    }

});


var pokemon = JSON.parse(fs.readFileSync('pokemon.json', 'utf8'));
var app = express();

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

var server = require('http').Server(app);
var port = process.env.PORT || 9876;

server.listen(port, function(err) {
    console.log('Running server on port ' + port);
});

app.post('/', function(req, res) {
    var id = req.body.message.pokemon_id;
    var time=(req.body.message.time_until_hidden_ms/1000).toFixed(0);
    var minutes = Math.floor(time / 60);
    var seconds = time - minutes * 60;
    var url='http://www.google.com/maps/place/'+req.body.message.latitude+','+req.body.message.longitude;
    var text=pokemon[id].rarity + ': '+ pokemon[id].name+' '+minutes+':'+seconds+' seconds left. Find @ '+url;

    console.log(text);

    db.find({}, function(err, docs) {

        _.each(docs, function(data) {

            var array = [];

            ignore.find({
                id: data.id
            }, function(err, ig) {
                _.each(ig, function(items) {
                    array.push(items.ignore);
                });


                if (pokemon[id].rarity === "Rare" || pokemon[id].rarity === "Ultra Rare" || pokemon[id].rarity === "Very Rare") {

                    if (array.indexOf(pokemon[id].name) < 0) {

                        api.sendMessage({
                            chat_id: data.id,
                            text: text
                        });

                        // api.sendLocation({
                        //   chat_id: data.id,
                        //    latitude: req.body.message.latitude,
                        //    longitude: req.body.message.longitude
                        // }); 

                    }

                }

            });

        });

    });

});
