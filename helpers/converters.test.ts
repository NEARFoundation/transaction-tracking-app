// Run via `yarn test helpers/converters.test.ts`

import { type Args } from '../db/Row';

import { getArgsAsObjectUsingBase64Fallback } from './converters';

describe('converters', () => {
  test('getArgsAsObjectUsingBase64Fallback undefined', () => {
    expect(getArgsAsObjectUsingBase64Fallback(undefined)).toEqual(undefined);
  });

  test('getArgsAsObjectUsingBase64Fallback json', () => {
    const json = { actions: [], amount: 0 };
    const args: Args = { args_base64: undefined, args_json: json, deposit: 0, method_name: 'deposit' };
    expect(getArgsAsObjectUsingBase64Fallback(args)).toEqual(json);
  });

  test('getArgsAsObjectUsingBase64Fallback base64', () => {
    const args: Args = { args_base64: 'eyJhbW91bnQiOiIxMDAwMDAwMDAwMCIsInJlY2VpdmVyX2lkIjoiZGV2M2lzLm5lYXIifQ==', args_json: undefined, deposit: 0, method_name: 'deposit' };
    expect(getArgsAsObjectUsingBase64Fallback(args)).toEqual({ amount: '10000000000', receiver_id: 'dev3is.near' });
    const cwpuzzlesArgs: Args = {
      args_base64: 'eyJhbW91bnQiOiI1MDAwMDAwMDAwMDAwMDAwMDAwMDAiLCJyZWNlaXZlcl9pZCI6ImN3cHV6emxlcy5uZWFyIn0=',
      args_json: undefined,
      deposit: 0,
      method_name: 'deposit',
    };
    expect(getArgsAsObjectUsingBase64Fallback(cwpuzzlesArgs)).toEqual({
      amount: '500000000000000000000',
      receiver_id: 'cwpuzzles.near',
    });
  });
});
