var unirest = require('unirest');
var express = require('express');
var events = require('events');

var getFromApi = function(endpoint, args) {
    var emitter = new events.EventEmitter();
    unirest.get('https://api.spotify.com/v1/' + endpoint)
           .qs(args)
           .end(function(response) {
                if (response.ok) {
                    emitter.emit('end', response.body);
                }
                else {
                    emitter.emit('error', response.code);
                }
            });
    return emitter;
};

var app = express();
app.use(express.static('public'));

app.get('/search/:name', function(req, res) {
    var searchReq = getFromApi('search', {
        q: req.params.name,
        limit: 1,
        type: 'artist'
    });

    searchReq.on('end', function(item) {
        var artist = item.artists.items[0];
        var id = artist.id
        var completed = 0;
        var relatedArtists = getFromApi('artists/' + id + '/related-artists');
        relatedArtists.on('end', function(item) {
            artist.related = item.artists;
            artist.related.forEach(function(result) {
                var artistId = result.id;
                var topTracks = getFromApi('artists/' + artistId + '/top-tracks', {
                    country: 'AU'
                });
                topTracks.on('end', function(item) {
                    result.tracks = item.tracks;
                    completed++;
                    if (completed === artist.related.length) {
                        console.log('yay');
                        res.json(artist);
                    }                         
                });
                topTracks.on('error', function(code) {
                    console.log('top tracks error code: ',code);
                    // This is bad
                    res.sendStatus(code);
                });
            });
        });
        relatedArtists.on('error', function(code) {
            res.sendStatus(code);
        });


    });

    searchReq.on('error', function(code) {
        res.sendStatus(code);
    });

});

app.listen(8080);