/* eslint-env node */

module.exports = {
  extends: ['near', 'next/core-web-vitals'],
  rules: {
    'func-style': 'off',
    // https://eslint.org/docs/rules/max-lines
    'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],

    // https://eslint.org/docs/rules/max-lines-per-function
    'max-lines-per-function': ['error', { max: 30, skipBlankLines: true, skipComments: true }],

    'no-console': 'off',
  },
};