export default interface Row {
  date: string;
  account_id: string;
  block_timestamp_utc: string;
  block_timestamp: number;
  block_height: number;
  transaction_hash: string;
  transaction_type: string;
  from_account: string;
  to_account: string;
  amount_transferred: number;
  currency_transferred: string;
  ft_currency_in: string;
  ft_amount_in: string;
  ft_currency_out: string;
  ft_amount_out: string;
  args_base64: string;
  action_kind: string;
  method_name: string;
  args: string;
  onchain_usdc_balance: number;
  onchain_dai_balance: number;
}
