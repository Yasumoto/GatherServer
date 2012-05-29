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

function find_polls_to_update(username, userId, polls) {
  for (var i = 0; i < polls.length; i++) {
    if (polls[i].members && polls[i].members.indexOf(username) != -1) {
      var access = polls[i].ACL;
      console.log(JSON.stringify(access));
      console.log(userId);
      access[userId] = {'read': true, 'write': true};
      save_new_poll_acl(polls[i].objectId, {'ACL': access});
    }
  }
}

function save_new_poll_acl(objectId, updatedAccess) {
  var options = {
    host: 'api.parse.com',
    path: '/1/classes/Poll/'+objectId,
    method: 'PUT',
    headers: {
      'X-Parse-Application-Id': process.env.PARSE_APP_ID,
      'X-Parse-Master-Key':   process.env.PARSE_MASTER_KEY
    }
  };

  var req = https.request(options, function(response) {
    console.log('STATUS: ' + response.statusCode);
    var data = '';
    response.on('data', function(chunk) {
      data += chunk;
    });
    response.on('error', function(er) {
      console.log('problem with request: ' + er.message);
    });
    response.on('end', function() {
      console.log(data);
    });
  });

   req.write(JSON.stringify(updatedAccess));
   req.end();
}

function update_account_sharing(req, res) {
  var userId = url.parse(req.url, true).query.userId;
  var username = url.parse(req.url, true).query.username;

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
      polls += data;
    });
    response.on('end', function() {
      var poll_objects = JSON.parse(polls).results;
      find_polls_to_update(username, userId, poll_objects);
    });
  }).on('error', function(e) {
    console.log('problem with request: ' + e.message);
  });
}

app.get('/', update_account_sharing);
