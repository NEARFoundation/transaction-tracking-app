SELECT
  to_char(to_timestamp(b.block_timestamp / 1000000000), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') block_timestamp_utc,
  b.block_timestamp,
  b.block_height,
  r.originated_from_transaction_hash transaction_hash,
  'Multisend - Send from app balance' transaction_type,
  r.predecessor_account_id from_account,
  r.receiver_account_id to_account,
  (
    SELECT
      -1 * SUM(cast(re ->> 'amount' AS numeric)) / (10 ^ 24)
    FROM
      jsonb_array_elements(ra.args -> 'args_json' -> 'accounts') AS re) amount_transferred,
  'NEAR' currency_transferred,
  '' get_currency_by_contract,
  convert_from(decode(ra.args ->> 'args_base64', 'base64'), 'UTF8') args_base64
FROM
  receipts r
  INNER JOIN execution_outcomes e ON e.receipt_id = r.receipt_id
  INNER JOIN blocks b ON b.block_hash = r.included_in_block_hash
  INNER JOIN action_receipt_actions ra ON ra.receipt_id = r.receipt_id
WHERE
  r.receiver_account_id = 'multisender.app.near'
  AND r.predecessor_account_id = ANY ($1)
  AND e.status IN ('SUCCESS_VALUE')
  AND ra.action_kind = 'FUNCTION_CALL'
  AND ra.args ->> 'args_json'::text IS NOT NULL
  AND ra.args ->> 'method_name'::text = 'multisend_from_balance_unsafe'
  AND to_char(to_timestamp(b.block_timestamp / 1000000000), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') >= $2
  AND to_char(to_timestamp(b.block_timestamp / 1000000000), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') < $3
  AND EXISTS (
    SELECT
      1
    FROM
      receipts r2
      INNER JOIN execution_outcomes e2 ON e2.receipt_id = r2.receipt_id
    WHERE
      r2.originated_from_transaction_hash = r.originated_from_transaction_hash
      AND e2.status = 'SUCCESS_VALUE'
      AND r2.predecessor_account_id = r.receiver_account_id
      AND r2.receipt_id <> r.receipt_id)
  AND NOT EXISTS (
    SELECT
      1
    FROM
      receipts r3
      INNER JOIN execution_outcomes e3 ON e3.receipt_id = r3.receipt_id
    WHERE
      r3.originated_from_transaction_hash = r.originated_from_transaction_hash
      AND e3.status <> 'SUCCESS_VALUE'
      AND r3.predecessor_account_id = r.receiver_account_id
      AND r3.receipt_id <> r.receipt_id);

