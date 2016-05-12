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

var Net = require("net");
var EventEmitter = require('events').EventEmitter;

var HTTPClient = require('../lib/HTTPClient');
var HTTPRequest = require('httptobusserver').HTTPRequest;

suite('HTTPClient', function () {
	var sut, httpRequest, netConnectStub, clientWriteStub;
	var host = "localhost";
	var port = 2222;
	var client;

	setup(function () {
		httpRequest = new HTTPRequest("test", "testid");
		client = new EventEmitter();
		client.write = function(){
		};
		clientWriteStub = sinon.stub(client, "write");
		netConnectStub = sinon.stub(Net, "connect").returns(client);
		sut = new HTTPClient(Net, client);

	});
	teardown(function (){
		netConnectStub.restore();

	});


	suite('send', function () {
		test('Should create a connection with the correct server and port', function(){
			sut.send(host, port, httpRequest);
			var connection = netConnectStub.args[0][0];
			assert.equal(connection.port, port, "Incorrect port");
			assert.equal(connection.host, host, "Incorrect host");


		});
		test('Should call client.write when the connection is ready', function(){
			sut.send(host, port, httpRequest);
			netConnectStub.callArg(1);
			assert(clientWriteStub.calledWith("test"), "Never call client.write");
		});

		test("Should execute the callback when a full request is recived", function() {
			var callback = sinon.stub();
			sut.send(host, port, httpRequest, callback);
			client.emit("data", "te");
			client.emit("data", "st");
			client.emit("end");
			assert(callback.calledWith(false), "Failed to execute callback with the error");
			var httpResponse = callback.args[0][1];
			assert(httpResponse.getResponse(), "test", "Failed to return the response");
		});

		test('Should execute the callback with error when the connection fails', function(){
			var callback = sinon.stub();
			sut.send(host, port, httpRequest, callback);
			client.emit("error", "test");
			assert(callback.calledWith("test"), "Failed to return the error");
		});
	});
});
