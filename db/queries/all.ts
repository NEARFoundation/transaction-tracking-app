export const ALL_OUTGOING = `
SELECT *
FROM TRANSACTIONS T
         LEFT JOIN RECEIPTS R ON (T.CONVERTED_INTO_RECEIPT_ID = R.RECEIPT_ID OR
                                  t.TRANSACTION_HASH = R.ORIGINATED_FROM_TRANSACTION_HASH)
         LEFT JOIN ACTION_RECEIPT_ACTIONS ARA ON ARA.RECEIPT_ID = R.RECEIPT_ID
         LEFT JOIN BLOCKS B ON B.BLOCK_HASH = R.INCLUDED_IN_BLOCK_HASH
         LEFT JOIN EXECUTION_OUTCOMES EO ON EO.RECEIPT_ID = R.RECEIPT_ID
WHERE eo.status IN ('SUCCESS_RECEIPT_ID', 'SUCCESS_VALUE')
  and receipt_predecessor_account_id = ANY($1)
  and to_char(to_timestamp(b.block_timestamp / 1000000000), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') >= $2
  and to_char(to_timestamp(b.block_timestamp / 1000000000), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') < $3
  AND NOT EXISTS (
    SELECT 1
    FROM RECEIPTS R2
    JOIN EXECUTION_OUTCOMES EO2 ON EO2.RECEIPT_ID = R2.RECEIPT_ID
    WHERE (T.CONVERTED_INTO_RECEIPT_ID = R2.RECEIPT_ID OR T.TRANSACTION_HASH = R2.ORIGINATED_FROM_TRANSACTION_HASH)
    AND EO2.STATUS = 'FAILURE'
);`;

export const ALL_INCOMING = `
SELECT *
FROM TRANSACTIONS T
         LEFT JOIN RECEIPTS R ON (T.CONVERTED_INTO_RECEIPT_ID = R.RECEIPT_ID OR
                                  t.TRANSACTION_HASH = R.ORIGINATED_FROM_TRANSACTION_HASH)
         LEFT JOIN ACTION_RECEIPT_ACTIONS ARA ON ARA.RECEIPT_ID = R.RECEIPT_ID
         LEFT JOIN BLOCKS B ON B.BLOCK_HASH = R.INCLUDED_IN_BLOCK_HASH
         LEFT JOIN EXECUTION_OUTCOMES EO ON EO.RECEIPT_ID = R.RECEIPT_ID
WHERE eo.status IN ('SUCCESS_RECEIPT_ID', 'SUCCESS_VALUE')
  and receipt_receiver_account_id = ANY($1)
  and to_char(to_timestamp(b.block_timestamp / 1000000000), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') >= $2
  and to_char(to_timestamp(b.block_timestamp / 1000000000), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') < $3
  AND NOT EXISTS (
    SELECT 1
    FROM RECEIPTS R2
    JOIN EXECUTION_OUTCOMES EO2 ON EO2.RECEIPT_ID = R2.RECEIPT_ID
    WHERE (T.CONVERTED_INTO_RECEIPT_ID = R2.RECEIPT_ID OR T.TRANSACTION_HASH = R2.ORIGINATED_FROM_TRANSACTION_HASH)
    AND EO2.STATUS = 'FAILURE'
);`;

export const FT_INCOMING = `
  SELECT *
  FROM TRANSACTIONS t
           LEFT JOIN RECEIPTS R ON (T.CONVERTED_INTO_RECEIPT_ID = R.RECEIPT_ID OR
                                    t.TRANSACTION_HASH = R.ORIGINATED_FROM_TRANSACTION_HASH)
           LEFT JOIN ACTION_RECEIPT_ACTIONS ARA ON ARA.RECEIPT_ID = R.RECEIPT_ID
           LEFT JOIN BLOCKS B ON B.BLOCK_HASH = R.INCLUDED_IN_BLOCK_HASH
           LEFT JOIN EXECUTION_OUTCOMES EO ON EO.RECEIPT_ID = R.RECEIPT_ID
  WHERE eo.status IN ('SUCCESS_RECEIPT_ID', 'SUCCESS_VALUE')
    AND (r.receiver_account_id = '6b175474e89094c44da98b954eedeac495271d0f.factory.bridge.near'     -- DAI
    OR r.receiver_account_id = 'a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.factory.bridge.near'       -- USDC
    OR r.receiver_account_id = 'dac17f958d2ee523a2206206994597c13d831ec7.factory.bridge.near'       -- USDT.e
    OR r.receiver_account_id = 'usn'                                                                -- USN
    OR r.receiver_account_id = 'usdn'
    OR r.receiver_account_id = 'usdt.tether-token.near')                                             -- USDT
    AND ARA.action_kind = 'FUNCTION_CALL'
    AND (ARA.args -> 'args_json' ->> 'receiver_id' = ANY($1) OR ARA.args -> 'args_json' ->> 'account_id' = ANY($1))
    and to_char(to_timestamp(b.block_timestamp / 1000000000), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') >= $2
    and to_char(to_timestamp(b.block_timestamp / 1000000000), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') < $3
    AND NOT EXISTS (
      SELECT 1
      FROM RECEIPTS R2
      JOIN EXECUTION_OUTCOMES EO2 ON EO2.RECEIPT_ID = R2.RECEIPT_ID
      WHERE (T.CONVERTED_INTO_RECEIPT_ID = R2.RECEIPT_ID OR T.TRANSACTION_HASH = R2.ORIGINATED_FROM_TRANSACTION_HASH)
      AND EO2.STATUS = 'FAILURE'
  );`;
