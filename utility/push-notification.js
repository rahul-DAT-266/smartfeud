'use strict';

/**
 * This function is responsible of rpush notification
 * @constructor
 */
function PushNotification() {}
var async = require('async');
//var config = require('../config/constants');
PushNotification.prototype.initApnConnection = function(config, cb) {

  console.log('The config is', config)
  var apnagent = require('apnagent'),
    //cert = require('path').join(__dirname, '../credentials/pushpem.pem'),
    pfx = require('path').join(__dirname, config.p12File);
  console.log(pfx);
  this.agent = new apnagent.Agent();

  // set our credentials
  //this.agent.set('cert file', cert).enable(config.environment);
  this.agent.set('pfx file', pfx).enable(config.environment);
  this.agent.set('passphrase', config.passPhrase);
  this.agent
    .set('expires', '1d')
    .set('reconnect delay', '1s')
    .set('cache ttl', '1m');
  // this.agent.enable();

  this.agent.connect(function(err) {
    if (err && err.name === 'GatewayAuthorizationError') {
      console.log('Authentication Error: %s', err.message);
      process.exit(1);
    }

    // handle any other err (not likely)
    else if (err) {
      throw err;
    }

    // it worked!
    var env = agent.enabled('sandbox') ? 'sandbox' : 'production';

    console.log('apnagent [%s] gateway connected', env);
    cb();
  });
  this.agent.on('message:error', function(err, msg) {
    console.log('err', err);
  });


};

/**
 * This function send a message to the apn users
 * @this {PushNotification}
 * @param {object} config                      config object
 * @param {Array}  config.devices              array of the devices
 * @param {String} config.p12File              path of the p12 File
 * @param {String} config.passPhrase           pass phrase of the key
 * @param {Object} config.message              message that needs to be send
 * @param {Object} config.message.sender       sender information
 * @param {String} config.message.sender.name  name of the sender
 * @param {String} config.message.message      actual message
 * @param {String} config.environment          set the environment as sandbox or production
 * @param {String} [config.sound]              sound when the notification receive
 * @param {String} [config.badge]              display badge when the notification receive
 */
PushNotification.prototype.sendAPN = function(config) {

  var alert = {
      body: null
    },
    me = this;

  if (config.message.alert) {
    alert.body = config.message.alert;
  } else {
    alert.body = config.message.sender.name ? (config.message.sender.name + ': ' + config.message.message) : (config.message.sender.firstName + ' ' + config.message.sender.lastName + ': ' + config.message.message);
  }

  delete config.message.alert;
  delete config.message.sender;

  function send() {
    config.devices.forEach(function(eachDevice) {
      me.agent.createMessage()
        .device(eachDevice)
        .alert(alert)
        .set('data', config.message.body)
        .badge(config.badge)
        .sound(config.sound)
        //.expires(0)
        .send(console.log('send ' + JSON.stringify(config)));
    });
  }

  if (!me.agent) {
    me.initApnConnection(config, send);
  } else {
    send();
  }

};

/**
 * This function send a message to the gcm users
 * @this {PushNotification}
 * @param {object} config                     config object
 * @param {String} config.devices             device Id of the gcm user
 * @param {String} config.serverKey           server key of the app
 * @param {String} config.message             message that needs to be send
 * @param {String} [config.retries]           sound when the notification receive
 * @param {String} [config.collapseKey]       display badge when the notification receive
 * @param {String} [config.delayWhileIdle]    sound when the notification receive
 * @param {String} [config.timeToLive]        display badge when the notification receive
 */
PushNotification.prototype.sendGCM = function(config) {
  var gcm = require('push-notify').gcm({
    apiKey: config.serverKey, // server api key
    retries: config.retries
  });

  // Send a notification.
  gcm.send({
    registrationId: config.devices, // device id
    collapseKey: config.collapseKey,
    delayWhileIdle: config.delayWhileIdle,
    timeToLive: config.timeToLive,
    data: config.message
  });
  gcm.on('transmissionError', console.log);
};


PushNotification.prototype.sendFCM = function(config) {
  var FCM = require('fcm-node'),
    apiKey = config.fcm_server_key,
    fcm = new FCM(apiKey);
  var message = {};
  message.data = {};
  message.to = config.deviceIds;
  message.data.message = config.message;
  /*fcm.send(message, function(err, message) {
      if (err) {
          console.log(err);
      } else {
          console.log(message)
      }
  });*/
  async.map(config.deviceIds, function(deviceId, callback_inner) {

    message.to = deviceId;
    message.data.message = config.message;
    //console.log(message);
    fcm.send(message, function(err, message) {
      //console.log(message);
      if (err) {
        console.log(err);
      } else {
        console.log(message);
      }
    });
    message.data = {};
    callback_inner();
  }, function(err, done) {
    console.log('Push send');
  })
}

module.exports = new PushNotification();