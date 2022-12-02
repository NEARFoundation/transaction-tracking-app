// https://jestjs.io/docs/getting-started#via-ts-jest

import { divideByPowerOfTen } from './math';

describe('math', () => {
  test('divideByPowerOfTen', () => {
    expect(divideByPowerOfTen(1, 2)).toBe('0.01');
    expect(divideByPowerOfTen(1_500, 3)).toBe('1.5');
  });
});
