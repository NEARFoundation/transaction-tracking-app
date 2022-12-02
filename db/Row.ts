import { getArgsAsObjectUsingBase64Fallback, getNearAmountConsideringStaking } from '../helpers/converters';
import { type AccountId } from '../helpers/currency';
import { formatDateFromNano } from '../helpers/datetime';

/* eslint-disable typescript-sort-keys/interface */
// Disabling the automatic key sorting since the order of the CSV columns is important.
export type CsvRow = {
  account_id: string;
  date: string;
  block_timestamp: number;
  block_height: number;
  transaction_hash: string;
  from_account: string;
  to_account: string;
  amount_transferred: number;
  ft_amount_in: string;
  ft_currency_in: string;
  ft_amount_out: string;
  ft_currency_out: string;
  method_name: string;
  amount_staked: number;
  args: string;
};
/* eslint-enable typescript-sort-keys/interface */

export type ArgsJson = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actions: any[]; // TODO: Improve the type.
  amount: number;
  msg?: string;
  receiver_id?: string;
};

export type Args = {
  args_base64: string;
  args_json?: ArgsJson;
  deposit: number;
  method_name: string;
};

/* eslint-disable typescript-sort-keys/interface */
export type IndexerRow = {
  account_id: string;
  receiver_account_id: string;
  receipt_predecessor_account_id: string;
  receipt_receiver_account_id: string;
  block_timestamp: number;
  block_height: number;
  transaction_hash: string;
  action_kind: string;
  args?: Args;
};
/* eslint-enable typescript-sort-keys/interface */

export function getFinalCsvRow(
  indexerRow: IndexerRow,
  accountId: AccountId,
  nearAmount: number,
  ftAmountIn: string,
  ftCurrencyIn: string,
  ftAmountOut = '',
  ftCurrencyOut = '',
): CsvRow {
  return {
    /* eslint-disable canonical/sort-keys */
    // Disabling the automatic key sorting since the order of the CSV columns is important.
    date: formatDateFromNano(indexerRow.block_timestamp),
    account_id: accountId,
    method_name: String(indexerRow.action_kind === 'TRANSFER' ? 'transfer' : indexerRow.args?.method_name),
    block_timestamp: indexerRow.block_timestamp,
    from_account: indexerRow.receipt_predecessor_account_id,
    block_height: indexerRow.block_height,
    args: JSON.stringify(getArgsAsObjectUsingBase64Fallback(indexerRow.args)),
    transaction_hash: indexerRow.transaction_hash,
    amount_transferred: nearAmount,
    // Fungible Token
    ft_amount_out: ftAmountOut,
    ft_currency_out: ftCurrencyOut,
    ft_amount_in: ftAmountIn,
    ft_currency_in: ftCurrencyIn,
    to_account: indexerRow.receipt_receiver_account_id,
    amount_staked: getNearAmountConsideringStaking(indexerRow, nearAmount),
    /* eslint-enable canonical/sort-keys */
  };
}
