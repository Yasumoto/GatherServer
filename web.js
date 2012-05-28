var async   = require('async');
var express = require('express');
var util    = require('util');
var https   = require('https');
var url     = require('url')

// create an express webserver
var app = express.createServer(
  express.logger(),
  express.static(__dirname + '/public'),
  express.bodyParser(),
  express.cookieParser(),
  // set this to a secret value to encrypt session cookies
  express.session({ secret: process.env.SESSION_SECRET || 'secret123' }),
  require('faceplate').middleware({
    app_id: process.env.FACEBOOK_APP_ID,
    secret: process.env.FACEBOOK_SECRET,
    scope:  'user_likes,user_photos,user_photo_video_tags'
  })
);

// listen to the PORT given to us in the environment
var port = process.env.PORT || 3000;

app.listen(port, function() {
  console.log("Listening on " + port);
});

app.dynamicHelpers({
  'host': function(req, res) {
    return req.headers['host'];
  },
  'scheme': function(req, res) {
    req.headers['x-forwarded-proto'] || 'http'
  },
  'url': function(req, res) {
    return function(path) {
      return app.dynamicViewHelpers.scheme(req, res) + app.dynamicViewHelpers.url_no_scheme(path);
    }
  },
  'url_no_scheme': function(req, res) {
    return function(path) {
      return '://' + app.dynamicViewHelpers.host(req, res) + path;
    }
  },
});

function find_polls_to_update(username, polls) {
  for (var i = 0; i < polls.length; i++) {
    console.log("********" + i);
    console.log(polls[i]);
  }
}

function update_account_sharing(req, res) {
  var username = url.parse(req.url, true).query.username;
  console.log('USERNAME');
  console.log(username);

  var options = {
    host: 'api.parse.com',
    path: '/1/classes/Poll',
    headers: {
      'X-Parse-Application-Id': process.env.PARSE_APP_ID,
      'X-Parse-Master-Key':   process.env.PARSE_MASTER_KEY
    }
  };

  https.get(options, function(response) {
    console.log('STATUS: ' + response.statusCode);
    var polls = '';
    response.on('data', function(data) {
      console.log(data);
      polls += data;
    });
    response.on('end', function() {
      var poll_objects = JSON.parse(polls).results;
      find_polls_to_update(username, poll_objects);
      res.render('gather.ejs', {
        layout:   false,
        req:      req,
        response: response,
        polls:    polls
      });
    });
  }).on('error', function(e) {
    console.log('problem with request: ' + e.message);
  });
}

function render_page(req, res) {
  req.facebook.app(function(app) {
    req.facebook.me(function(user) {
      res.render('index.ejs', {
        layout:    false,
        req:       req,
        app:       app,
        user:      user
      });
    });
  });
}

function handle_facebook_request(req, res) {

  // if the user is logged in
  if (req.facebook.token) {

    async.parallel([
      function(cb) {
        // query 4 friends and send them to the socket for this socket id
        req.facebook.get('/me/friends', { limit: 4 }, function(friends) {
          req.friends = friends;
          cb();
        });
      },
      function(cb) {
        // query 16 photos and send them to the socket for this socket id
        req.facebook.get('/me/photos', { limit: 16 }, function(photos) {
          req.photos = photos;
          cb();
        });
      },
      function(cb) {
        // query 4 likes and send them to the socket for this socket id
        req.facebook.get('/me/likes', { limit: 4 }, function(likes) {
          req.likes = likes;
          cb();
        });
      },
      function(cb) {
        // use fql to get a list of my friends that are using this app
        req.facebook.fql('SELECT uid, name, is_app_user, pic_square FROM user WHERE uid in (SELECT uid2 FROM friend WHERE uid1 = me()) AND is_app_user = 1', function(result) {
          req.friends_using_app = result;
          cb();
        });
      }
    ], function() {
      render_page(req, res);
    });

  } else {
    render_page(req, res);
  }
}


app.get('/fb', handle_facebook_request);
app.post('/fb', handle_facebook_request);

app.get('/', update_account_sharing);
