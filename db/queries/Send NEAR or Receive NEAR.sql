SELECT
    to_char(to_timestamp(b.block_timestamp / 1000000000), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') block_timestamp_utc,
    b.block_timestamp,
    b.block_height,
    a.transaction_hash,
    'Send NEAR' transaction_type,
    r.predecessor_account_id from_account,
    r.receiver_account_id to_account,
    -1 * CAST(a.args ->> 'deposit' AS numeric) / CAST((10 ^ 24) AS numeric) amount_transferred,
    'NEAR' currency_transferred,
    '' get_currency_by_contract,
    '' args_base64
FROM
    receipts r
    INNER JOIN execution_outcomes e ON e.receipt_id = r.receipt_id
    INNER JOIN blocks b ON b.block_hash = r.included_in_block_hash
    INNER JOIN transaction_actions a ON a.transaction_hash = r.originated_from_transaction_hash
WHERE
    r.predecessor_account_id = ANY ($1)
    AND r.receiver_account_id NOT LIKE '%.sputnik-dao.near'
    AND e.status = 'SUCCESS_VALUE'
    AND a.action_kind = 'TRANSFER'
    AND to_char(to_timestamp(b.block_timestamp / 1000000000), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') >= $2
    AND to_char(to_timestamp(b.block_timestamp / 1000000000), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') < $3
UNION
SELECT
    to_char(to_timestamp(b.block_timestamp / 1000000000), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') block_timestamp_utc,
    b.block_timestamp,
    b.block_height,
    r.originated_from_transaction_hash transaction_hash,
    'Receive NEAR' transaction_type,
    r.predecessor_account_id from_account,
    r.receiver_account_id to_account,
    CAST(ra.args ->> 'deposit' AS numeric) / CAST((10 ^ 24) AS numeric) amount_transferred,
    'NEAR' currency_transferred,
    '' get_currency_by_contract,
    '' args_base64
FROM
    receipts r
    INNER JOIN execution_outcomes e ON e.receipt_id = r.receipt_id
    INNER JOIN blocks b ON b.block_hash = r.included_in_block_hash
    INNER JOIN action_receipt_actions ra ON ra.receipt_id = r.receipt_id
WHERE
    r.receiver_account_id = ANY ($1)
    AND e.status = 'SUCCESS_VALUE'
    AND ra.action_kind = 'TRANSFER'
    AND r.predecessor_account_id != 'system'
    AND to_char(to_timestamp(b.block_timestamp / 1000000000), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') >= $2
    AND to_char(to_timestamp(b.block_timestamp / 1000000000), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') < $3
