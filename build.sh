#!/bin/bash

./node_modules/.bin/rollup --config ./rollup.config.js
cp dist/* example
