export default interface Row {
  block_timestamp_utc: string;
  block_timestamp: number;
  block_height: number;
  transaction_hash: string;
  transaction_type: string;
  from_account: string;
  to_account: string;
  amount_transferred: string;
  currency_transferred: string;
  args_base64: string;
  action_kind: string;
  method_name: string;
  args: string;
}
