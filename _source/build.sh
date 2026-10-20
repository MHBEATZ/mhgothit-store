#!/bin/sh
/opt/npm-tools/node_modules/.bin/esbuild src/main.js --bundle --minify --format=iife --target=es2020 --loader:.json=json --outfile=/home/claude/site/assets/app.js --legal-comments=none
