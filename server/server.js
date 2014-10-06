'use strict';

var http = require('http');
var app = require('./app');
var config = require('./config');

http.createServer(app).listen(config.application.port, function () {
    console.log('Express server listening on port ' + app.get('port'));
});
