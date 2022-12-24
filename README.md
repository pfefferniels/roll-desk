# Measuring Early Records

This project measures early Welte piano roll records and exports the results as 
RDF triples.

## Preparation

For testing this package relies on JSDOM. In order to make it work properly, add this to `webpack.config.js`

```
    resolve: {
      fallback: {
        "stream": false,
        "path": false,
        "buffer": false,
        "util": false,
        "http": false,
        "os": false,
        "zlib": false,
        "https": false,
        "url": false,
        "crypto": false,
        "tls": false,
        "fs": false,
        "child_process": false,
        "assert": false,
        "net": false
      },
```

Also, the package `@digitalbazaar/http-client`, which is included by 
the the package `jsonld` doesn't work well with ESM in a testing environment.
To resolve this issue, simple delete the http-client folder in the
local node_modules of jsonld.

In order to enable MIDI generation through meico, make sure to run:

```
cd tools
python3 generate-midi.py
```

## Available Scripts

In the project directory, you can run:

### `HTTPS=true npm start`

Runs the app in the development mode.

Please note that in order to save things to your POD, the application
must be run via HTTPS.

Open [https://localhost:3000](https://localhost:3000) to view it in the browser and
ignore the browser's certificate warning.

### `npm test`

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.
