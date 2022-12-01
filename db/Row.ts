/* eslint-disable typescript-sort-keys/interface */
export type CsvRow = {
  account_id: string;
  date: string;
  block_timestamp: number;
  block_height: number;
  transaction_hash: string;
  // transaction_type: string;
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

export type ArgsJson = {
  amount: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actions: any[]; // TODO: Improve the type.
  receiver_id?: string;
  msg?: string;
};

export type Args = {
  method_name: string;
  deposit: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args_base64: any; // TODO: Improve the type.
  args_json: ArgsJson;
};

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
