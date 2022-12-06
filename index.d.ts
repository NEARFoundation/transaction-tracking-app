/* eslint-disable typescript-sort-keys/interface */
// Disabling the automatic key sorting since the order of the CSV columns is important.
export type CsvRow = {
  account_id: string;
  datetime_utc: string;
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
  args_json: string;
};
/* eslint-enable typescript-sort-keys/interface */

export type ActionReceiptActionArgs = {
  args_base64: string; // Arbitrary function call arguments. An empty string is a totally valid input for a function call.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args_json?: any /* Arbitrary function call arguments. `args_json` is the attempt to 
  decode the args specified in the FunctionCall request via JSON (NEAR Protocol does not 
    require it to be JSON, but most of the contracts actually use JSON for their function 
    arguments).*/;
  // Warning! By treating NEAR amounts as a number instead of a string, there can be precision loss!
  deposit: number; // unsigned 128-bit integer
  // In the future, we may want to import the `Gas` type from near-api-js instead.
  gas: number; // unsigned 64-bit integer, but given that the limit is 1000 TeraGas, the values are <= 10^12
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
  args: ActionReceiptActionArgs;
};
/* eslint-enable typescript-sort-keys/interface */
