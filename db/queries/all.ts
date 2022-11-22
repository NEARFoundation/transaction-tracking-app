export const ALL_OUTGOING = `
SELECT *
FROM TRANSACTIONS T
         LEFT JOIN RECEIPTS R ON (T.CONVERTED_INTO_RECEIPT_ID = R.RECEIPT_ID OR
                                  t.TRANSACTION_HASH = R.ORIGINATED_FROM_TRANSACTION_HASH)
         LEFT JOIN TRANSACTION_ACTIONS TA ON T.TRANSACTION_HASH = TA.TRANSACTION_HASH
         LEFT JOIN ACTION_RECEIPT_ACTIONS ARA ON ARA.RECEIPT_ID = R.RECEIPT_ID
         LEFT JOIN BLOCKS B ON B.BLOCK_HASH = R.INCLUDED_IN_BLOCK_HASH
WHERE receipt_predecessor_account_id = ANY($1)
  and to_char(to_timestamp(b.block_timestamp / 1000000000), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') >= $2
  and to_char(to_timestamp(b.block_timestamp / 1000000000), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') < $3
ORDER BY block_height
`;

export const ALL_INCOMING = `
SELECT *
FROM TRANSACTIONS T
         LEFT JOIN RECEIPTS R ON (T.CONVERTED_INTO_RECEIPT_ID = R.RECEIPT_ID OR
                                  t.TRANSACTION_HASH = R.ORIGINATED_FROM_TRANSACTION_HASH)
         LEFT JOIN TRANSACTION_ACTIONS TA ON T.TRANSACTION_HASH = TA.TRANSACTION_HASH
         LEFT JOIN ACTION_RECEIPT_ACTIONS ARA ON ARA.RECEIPT_ID = R.RECEIPT_ID
         LEFT JOIN BLOCKS B ON B.BLOCK_HASH = R.INCLUDED_IN_BLOCK_HASH
WHERE (receipt_predecessor_account_id != 'system' AND receipt_receiver_account_id = ANY($1))
  and to_char(to_timestamp(b.block_timestamp / 1000000000), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') >= $2
  and to_char(to_timestamp(b.block_timestamp / 1000000000), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') < $3
ORDER BY block_height
`;