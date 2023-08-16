# Measuring Early Records
This is the main repository for the project Measuring Early Records,
which is one of the outcomes of my dissertation ("Interpretationsnetzwerke").
It allows to collaboratively annotate and discuss piano
rolls, to align them to a MEI score, to create a [MPM](https://axelberndt.github.io/MPM)
representation of based on such alignment and to view different 
interpretations just like any other traditional digital edition.

## Preparation

In order to enable MIDI generation through meico, make sure to run:

```
cd tools
python3 generate-midi.py
```

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.

Please note that in order to save things to your POD, the application
must be run via HTTPS.

Open [https://localhost:3000](https://localhost:3000) to view it in the browser and
ignore the browser's certificate warning.

### `npm test`

### `npm run build`

Builds the app for production to the `build` folder.\
It bundles React in production mode and optimizes the build for the best performance.
