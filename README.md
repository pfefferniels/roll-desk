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

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### `npm test`

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.
