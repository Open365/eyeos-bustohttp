Eyeos BusToHttp Library
=======================

## Overview


## How to use it

Example to create server using eyeos-BusToHttp

var express = require("express");
var BusToHttp = require("eyeos-BusToHttp")

var app = express();

app.get('/lol/lol/hello', function (req, res) {
	res.send('Hello World!');
})

var server = app.listen(3000, function () {
	var host = server.address().address;
	var port = server.address().port;
	console.log('Example app listening at http://%s:%s', host, port);
})

var connectInfo = {
	busHost: "localhost",
	busPort: 5672,
	queueName: "lol.lol"
};
var busToHttp = new BusToHttp();

busToHttp.start(connectInfo, "localhost", 3000,  function () {
	console.log('Example app listening');
})

## Quick help

* Install modules

```bash
	$ npm install
```

* Check tests

```bash
    $ ./tests.sh
```