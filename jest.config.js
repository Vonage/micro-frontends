module.exports = {
  roots: ['<rootDir>/tests'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  globals: {
    'ts-jest': {
      diagnostics: false
    }
  },
  coverageThreshold: {
    global: {
      lines: 70
    }
  },
  collectCoverage: true,
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  collectCoverageFrom: ['src/**/*.{ts,js,jsx}', '!**/node_modules/**', '!**/vendor/**'],

  // The directory where Jest should output its coverage files
  coverageDirectory: '<rootDir>/coverage'
};
