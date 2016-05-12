#!/bin/bash
set -e
set -u
mocha -u tdd -R nyan src/test/
