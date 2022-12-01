// https://jestjs.io/docs/getting-started#via-ts-jest

import { divide } from './math';

describe('math', () => {
  test('divide', () => {
    expect(divide(1, 2)).toBe('0.01');
    expect(divide(1_500, 3)).toBe('1.5');
  });
});
