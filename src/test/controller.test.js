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

var sinon = require('sinon');
var assert = require('chai').assert;

var AmqpConnection = require('httptobusserver').AmqpConnection;
var AmqpMessage = require('httptobusserver').AmqpMessage;
var HTTPClient = require("../lib/HTTPClient");
var HTTPResponse = require('httptobusserver').HTTPResponse;
var settings = require('../lib/settings');
var Controller = require('../lib/controller');

suite('Controller', function () {
	var sut, connectInfo, host, port, amqpConnection, amqpConnectionStartStub, httpClient,
		amqpMessagetest, httpClientSendStub, amqpConnectionSendStub, httpResponse, amqpMessageAckStub,
		amqpMessageRejectStub, clock;
	connectInfo = {
		busHost: "localhost",
		busPort: 5555,
		queueName: "lol.lol"
	};
	host = "localhost";
	port = 6666;
	setup(function () {
		httpClient = new HTTPClient();
		httpClientSendStub = sinon.stub(httpClient, "send");
		amqpConnection = new AmqpConnection();
		amqpConnectionStartStub = sinon.stub(amqpConnection, "start");
		amqpMessagetest = new AmqpMessage("test-queue", "test", "id", "test-reply-queue");
		amqpMessageAckStub = sinon.stub(amqpMessagetest, "acknow");
		amqpMessageRejectStub = sinon.stub(amqpMessagetest, "reject");
		amqpConnectionSendStub = sinon.stub(amqpConnection, "send");
		httpResponse = new HTTPResponse("HTTP/1.1 200 /", "testid");

		sut = new Controller(amqpConnection, httpClient);
		clock = sinon.useFakeTimers();
	});

	teardown(function() {
		clock.restore();
	});

	suite('start', function () {
		test('Should call to AMQPConnection.start with correct parameters', function(){
			sut.start(connectInfo, host, port);
			assert(amqpConnectionStartStub.calledWith(connectInfo.queueName, connectInfo.busHost, connectInfo.busPort, sinon.match.func, true),
			"Never called amqpConnection.start with correct parameters");

		});

		test("Should send a HTTPRequest to HTTPClient when received a AMQPMessage", function() {
			sut.start(connectInfo, host, port);
			amqpConnection.emit("message", amqpMessagetest);
			var httpRequest = httpClientSendStub.args[0][2];
			assert.equal(httpRequest.getRawRequest(), amqpMessagetest.getBody(), "Invalid RawRequest inside httpRequest");
			assert.equal(httpRequest.getId(), amqpMessagetest.getId(), "Invalid RawRequest inside httpRequest");
			assert(httpClientSendStub.calledWith(host, port), "HttpClient did not receive host and port for the request");
		});

		test('Should call amqpConnection send when receives a response from httpClient', function() {
			sut.start(connectInfo, host, port);
			amqpConnection.emit("message", amqpMessagetest);
			httpClientSendStub.callArgWith(3, false, httpResponse);
			var amqpMessage = amqpConnectionSendStub.args[0][0];
			assert.equal(amqpMessage.getQueueName(), amqpMessagetest.getReplyTo(), "Failed to reply to the replyto queue");
			assert.equal(amqpMessage.getBody(), httpResponse.getResponse(), "Failed to send body to amqp");
			assert.equal(amqpMessage.getId(), httpResponse.getId(), "Invalid id in response");
			assert.equal(amqpMessage.getReplyTo(), connectInfo.queueName, "Invalid reply queue");
		});

		test('Should call amqpMessage.ack when receives a correct response from httpClient', function() {
			sut.start(connectInfo, host, port);
			amqpConnection.emit("message", amqpMessagetest);
			httpClientSendStub.callArgWith(3, false, httpResponse);
			assert(amqpMessageAckStub.calledOnce, "Never called amqpmessage.ack");
		});

		test('Should not call amqpMessage.reject when receives a correct response from httpClient', function() {
			sut.start(connectInfo, host, port);
			amqpConnection.emit("message", amqpMessagetest);
			httpClientSendStub.callArgWith(3, false, httpResponse);
			assert.isFalse(amqpMessageRejectStub.called, "Called amqpmessage.reject when received a correct message");
		});

		test('Should call amqpMessage.reject when receives a incorrect response from httpClient', function() {
			sut.start(connectInfo, host, port);
			amqpConnection.emit("message", amqpMessagetest);
			httpClientSendStub.callArgWith(3, true, httpResponse);
			clock.tick(settings.rejectDelay);
			assert(amqpMessageRejectStub.calledOnce, "Never called amqpmessage.reject");
		});

		test('Should call amqpMessage.reject when receives a correct response with statusCode 500 or more', function() {
			sut.start(connectInfo, host, port);
			amqpConnection.emit("message", amqpMessagetest);
			httpResponse.response = 'HTTP/1.1 500 /';
			httpClientSendStub.callArgWith(3, false, httpResponse);
			clock.tick(settings.rejectDelay);
			assert(amqpMessageRejectStub.calledOnce, "Never called amqpmessage.reject");
		});

		test('Should not call amqpMessage.ack when receives a incorrect response from httpClient', function() {
			sut.start(connectInfo, host, port);
			amqpConnection.emit("message", amqpMessagetest);
			httpClientSendStub.callArgWith(3, true, httpResponse);
			assert.isFalse(amqpMessageAckStub.called, "Called amqpmessage.ack when received a incorrect message");
		});
		test('Should not call amqpConnection.send if msg.getReplyto returns falsy', function () {
			sut.start(connectInfo, host, port);
			amqpConnection.emit("message", amqpMessagetest);
			sinon.assert.neverCalledWith(amqpConnectionSendStub);
		});

		test('Should not call amqpConnection.sendif httpResponse.getId() returns falsy', function () {
			sut.start(connectInfo, host, port);
			amqpConnection.emit("message", amqpMessagetest);
			sinon.assert.neverCalledWith(amqpConnectionSendStub);
		});

	});

	suite('stop', function () {
		test('Should call to amqpConnection.stop', function () {
			var amqpConnectionStopStub = sinon.stub(amqpConnection, "stop");
			sut.stop();
			assert.isTrue(amqpConnectionStopStub.called);
		});
	});
});
