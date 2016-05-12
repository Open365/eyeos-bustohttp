/*
    Copyright (c) 2016 eyeOS

    This file is part of Open365.

    Open365 is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of the
    License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program. If not, see <http://www.gnu.org/licenses/>.
*/

var AmqpConnection = require('httptobusserver').AmqpConnection;
var HTTPClient = require("./HTTPClient");
var HTTPRequest = require('httptobusserver').HTTPRequest;
var AmqpMessage = require('httptobusserver').AmqpMessage;
var settings = require('./settings');
var logger = require('log2out');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var Controller = function(amqpConnection, httpClient) {
	this.amqpConnection = amqpConnection || new AmqpConnection();
	this.HTTPClient = httpClient || new HTTPClient();
	this.logger = logger.getLogger("BusToHttp.Controller");
};

util.inherits(Controller, EventEmitter);

Controller.prototype.start = function(connectInfo, host, port, prefetchCount) {
	if(prefetchCount === undefined) {
		prefetchCount = settings.prefetchCount;
	}
	var unusedCallback = function() {};
	this.amqpConnection.start(connectInfo.queueName, connectInfo.busHost, connectInfo.busPort, unusedCallback, true, prefetchCount);
	var self = this;
	this.amqpConnection.on("message", function(msg){
		var httpRequest = new HTTPRequest(msg.getBody(), msg.getId());
		self.HTTPClient.send(host, port, httpRequest, function(err, httpResponse) {
			if(err || httpResponse.getStatusCode() >= 500) {
				setTimeout(function() {
					msg.reject(true);
				}, settings.rejectDelay);
				return;
			}

			if (msg.getReplyTo() && httpResponse.getId()) {
				var amqpMessage = new AmqpMessage(msg.getReplyTo(), httpResponse.getResponse(), httpResponse.getId(), connectInfo.queueName);
				self.amqpConnection.send(amqpMessage);
			}
			msg.acknow();
		});
	});
	this.amqpConnection.on("error", function(err) {
		self.logger.error(err);
		self.emit("error", err);
	});
};

Controller.prototype.stop = function () {
	this.amqpConnection.stop();
};

module.exports = Controller;
