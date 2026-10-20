Developer notes (you can ignore this folder; it is not needed on GitHub).
assets/app.js is built from these files with esbuild + three.js r160:
  esbuild src/main.js --bundle --minify --format=iife --loader:.json=json --outfile=../assets/app.js
(three is imported as 'three' and 'three/addons/...'). Scene code: src/scene.js. Page logic: src/main.js.
