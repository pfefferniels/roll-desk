import type JestConfigWithTsJest from 'ts-jest'

const jestConfig: any = {
  testEnvironment: 'node',
  preset: 'ts-jest/presets/default-esm', // or other ESM presets
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  globals: {
    "ts-jest": {
      useESM: true,
    },
  },
  testRegex: "tests/.*\\.ts$"
}

export default jestConfig
