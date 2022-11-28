/* eslint-disable typescript-sort-keys/interface */
type Row = {
  account_id: string;
  block_timestamp_utc: string;
  block_timestamp: number;
  block_height: number;
  transaction_hash: string;
  // transaction_type: string;
  from_account: string;
  to_account: string;
  amount_transferred_in_near: number;
  ft_amount_in: string;
  ft_currency_in: string;
  ft_amount_out: string;
  ft_currency_out: string;
  amount_staked: number;
  args: string;
  method_name: string;
};
export default Row;
