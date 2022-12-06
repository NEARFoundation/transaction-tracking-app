// Run via `yarn test db/Row.test.ts`

import { CsvRow } from '..';
import { getFinalCsvRow } from './transformations';

// eslint-disable-next-line max-lines-per-function
describe('Row', () => {
  // eslint-disable-next-line max-lines-per-function
  test('getFinalCsvRow', () => {
    const accountId = 'a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.factory.bridge.near';
    const nearAmount = 33;
    const ftAmountIn = '10000000000';
    const ftCurrencyIn = 'USDC';
    const args = {
      args_base64: 'eyJhbW91bnQiOiIxMDAwMDAwMDAwMCIsInJlY2VpdmVyX2lkIjoiZGV2M2lzLm5lYXIifQ==',
      args_json: '{"amount":"10000000000","receiver_id":"dev3is.near"}',
      deposit: 1,
      gas: 1,
      method_name: 'ft_transfer',
    };
    const indexerRow = {
      account_id: accountId,
      action_kind: 'FUNCTION_CALL',
      args,
      block_height: 1,
      // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
      block_timestamp: 1_659_973_934_799_291_015,
      receipt_predecessor_account_id: 'nf-payments2.near',
      receipt_receiver_account_id: accountId,
      receiver_account_id: accountId,
      transaction_hash: '6xnB3tApHAhRjStzhfRHRz5Z2dAWZZnkVgCZoWLypcsT',
    };
    const expectedResult: CsvRow = {
      /* eslint-disable canonical/sort-keys */
      date: '2022-08-08',
      account_id: accountId,
      method_name: 'ft_transfer',
      block_timestamp: indexerRow.block_timestamp,
      from_account: indexerRow.receipt_predecessor_account_id,
      block_height: indexerRow.block_height,
      args_json: '{"amount":"10000000000","receiver_id":"dev3is.near"}',
      transaction_hash: indexerRow.transaction_hash,
      amount_transferred: nearAmount,
      // Fungible Token
      ft_amount_out: '',
      ft_currency_out: '',
      ft_amount_in: ftAmountIn,
      ft_currency_in: ftCurrencyIn,
      to_account: indexerRow.receipt_receiver_account_id,
      amount_staked: 0,
      /* eslint-enable canonical/sort-keys */
    };
    expect(getFinalCsvRow(indexerRow, accountId, nearAmount, ftAmountIn, ftCurrencyIn)).toEqual(expectedResult);
  });
});
