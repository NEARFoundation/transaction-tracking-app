SELECT
    *
FROM
    TRANSACTIONS t
    LEFT JOIN RECEIPTS r ON (t.CONVERTED_INTO_RECEIPT_ID = r.RECEIPT_ID
            OR t.TRANSACTION_HASH = r.ORIGINATED_FROM_TRANSACTION_HASH)
        INNER JOIN execution_outcomes eo ON eo.receipt_id = r.receipt_id
        INNER JOIN blocks b ON b.block_hash = r.included_in_block_hash
        INNER JOIN action_receipt_actions ara ON ara.receipt_id = r.receipt_id
    WHERE
        eo.status IN ('SUCCESS_RECEIPT_ID', 'SUCCESS_VALUE')
        AND (r.receiver_account_id = '6b175474e89094c44da98b954eedeac495271d0f.factory.bridge.near' -- DAI
            OR r.receiver_account_id = 'a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.factory.bridge.near' -- USDC
            OR r.receiver_account_id = 'dac17f958d2ee523a2206206994597c13d831ec7.factory.bridge.near' -- USDT.e
            OR r.receiver_account_id = 'usdn') -- USN
        AND ARA.action_kind = 'FUNCTION_CALL'
        AND (ARA.args -> 'args_json' ->> 'receiver_id' = ANY ($1)
            OR ARA.args -> 'args_json' ->> 'account_id' = ANY ($1))
        AND to_char(to_timestamp(b.block_timestamp / 1000000000), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') >= $2
        AND to_char(to_timestamp(b.block_timestamp / 1000000000), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') < $3;

