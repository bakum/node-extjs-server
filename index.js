
const express = require('express');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const certPath = path.join(__dirname, 'certs');
//const ENV = process.env.NODE_ENV;
const app = express();
const bodyParser = require('body-parser');
const api = require('./api');
const config = require('./utils/config');
const ports = {
    http: config.direct.portHttp,
    https: config.direct.portHttps
};

const yargs = require('yargs')
    .option('client-path', {
        describe: 'Path to the client app (absolute or relative to the server directory)'
    })
    .option('client-environment', {
        describe: "Client app build environment, either 'development', 'testing' or 'production'",
        choice: ['development', 'testing', 'production'],
        default: 'development'
    })
    .help()
    .argv;

if (yargs['client-path']) {
    config.client.path = yargs['client-path'];
}

let httpsServer;
let httpServer;
let router = express.Router();

try {
    httpServer = http.createServer(app);
    httpServer.on('error', onError);
} catch (e) {}

try {
    const crt = fs.readFileSync(path.join(certPath, 'server.crt'));
    const key = fs.readFileSync(path.join(certPath, 'server.key'));

    httpsServer = https.createServer({
        cert: crt,
        key: key
    }, app);
    httpsServer.on('error', onError);
} catch (e) {}

let clientPath = path.join(__dirname, config.client.path);

if (/^prod/i.test(yargs['client-environment'])) {
    clientPath = path.join(clientPath, 'build', yargs['client-environment'], config.client.clientName);
} else if (/^test/i.test(yargs['client-environment'])) {
    clientPath = path.join(clientPath, 'build',yargs['client-environment'],config.client.clientName);
}

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, config.direct.classPath)));
app.use(express.static(clientPath));

console.log(`Client app will be loaded from ${clientPath}`);

router.use(function(req, res, next) {
    // do logging
    console.log('Something is happening.');
    next(); // make sure we go to the next routes and don't stop here
});

router.get('/', api.index);
router.route('/checkcredentials').post(api.credentials);

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use(config.direct.apiUrl, router);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
  });
  
  // error handler
  // no stacktraces leaked to user unless in development environment
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: (yargs['client-environment'] === 'development') ? err : {}
    });
  });

if (httpServer) {
    httpServer.listen(ports.http, () => {
        console.log(`Non-Secure Server listening on port ${ports.http}`);
    });
}
//app.listen(ports.http, (err) => {
//    console.log(`Non-Secure Server listening on port ${ports.http}`);
    //app.on('error', onError);
//});


if (httpsServer) {
    httpsServer.listen(ports.https, () => {
        console.log(`Secure Server listening on port ${ports.https}`);
    });
}

function onError(error) {
    if (error.syscall !== 'listen') {
      throw error;
    }
  
    var bind = typeof error.port === 'string' ? 'Pipe ' + error.port : 'Port ' + error.port;
  
    // handle specific listen errors with friendly messages
    switch (error.code) {
      case 'EACCES':
        console.error(bind + ' requires elevated privileges');
        process.exit(1);
        break;
      case 'EADDRINUSE':
        console.error(bind + ' is already in use');
        process.exit(1);
        break;
      default:
        throw error;
    }
  }
