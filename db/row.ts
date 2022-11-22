/* eslint-disable canonical/filename-match-exported */
/* eslint-disable typescript-sort-keys/interface */
type Row = {
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
};
export default Row;
