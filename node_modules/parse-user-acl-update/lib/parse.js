var https       = require('https');
var url         = require('url');
var querystring = require('querystring');

var parse = exports;

function find_objects_to_update(username, userId, object_class_name, objects) {
  for (var i = 0; i < objects.length; i++) {
    if (objects[i].members && objects[i].members.indexOf(username) != -1) {
      var access = objects[i].ACL;
      access[userId] = {'read': true, 'write': true};
      save_new_object_acl(objects[i].objectId, object_class_name, {'ACL': access});
    }
  }
}

function save_new_object_acl(objectId, object_class_name, updatedAccess) {
  var options = {
    host: 'api.parse.com',
    path: '/1/classes/' + object_class_name + '/' + objectId,
    method: 'PUT',
    headers: {
      'X-Parse-Application-Id': process.env.PARSE_APP_ID,
      'X-Parse-Master-Key':   process.env.PARSE_MASTER_KEY
    }
  };

  var req = https.request(options, function(response) {
    var data = '';
    response.on('data', function(chunk) {
      data += chunk;
    });
    response.on('error', function(error) {
      console.log('problem with request: ' + error.message);
    });
    response.on('end', function() {
      console.log("Wrote " + objectId + " to Parse");
    });
  });

   req.write(JSON.stringify(updatedAccess));
   req.end();
}

function retrieve_all_objects(username, userId, object_class_name) {
  var options = {
    host: 'api.parse.com',
    path: '/1/classes/' + object_class_name,
    headers: {
      'X-Parse-Application-Id': process.env.PARSE_APP_ID,
      'X-Parse-Master-Key':   process.env.PARSE_MASTER_KEY
    }
  };

  https.get(options, function(response) {
    var objectData = '';
    response.on('data', function(data) {
      objectData += data;
    });
    response.on('end', function() {
      var objects = JSON.parse(objectData).results;
      find_objects_to_update(username, userId, object_class_name, objects);
    });
  }).on('error', function(e) {
    console.log('problem with request: ' + e.message);
  });
}

parse.update_account_sharing = function (req, res, object_class_name) {
  //TODO(yasumoto): need to add better reporting back to client.
  res.end();

  var username = url.parse(req.url, true).query.username;


  var emailAddress = querystring.stringify({ where: JSON.stringify({ email: username })});

  var options = {
    host: 'api.parse.com',
    path: '/1/users/?' + emailAddress,
    headers: {
      'X-Parse-Application-Id': process.env.PARSE_APP_ID,
      'X-Parse-Master-Key':   process.env.PARSE_MASTER_KEY
    }
  };
  https.get(options, function(response) {
    var userData = '';
    response.on('data', function(data) {
      userData += data;
    });
    response.on('end', function() {
      var user = JSON.parse(userData).results;
      var userId = user.objectId;
      retrieve_all_objects(username, userId, object_class_name);
    });
  }).on('error', function(e) {
    console.log('problem with request: ' + e.message);
  });
}
