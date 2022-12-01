/* eslint-env node */

module.exports = {
  extends: ['near', 'next/core-web-vitals'],
  rules: {
    'func-style': 'off',

    // https://eslint.org/docs/latest/rules/max-len
    'max-len': ['warn', { code: 150, ignoreComments: false, ignoreRegExpLiterals: true, ignoreStrings: true, ignoreTemplateLiterals: true }],

    // https://eslint.org/docs/rules/max-lines
    'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],

    // https://eslint.org/docs/rules/max-lines-per-function
    'max-lines-per-function': ['error', { max: 30, skipBlankLines: true, skipComments: true }],

    'no-console': 'off',
  },
};
