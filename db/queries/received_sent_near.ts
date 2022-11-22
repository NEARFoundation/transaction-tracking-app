export const RCV_SENT_NEAR = `select
	to_char(to_timestamp(b.block_timestamp / 1000000000), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') block_timestamp_utc,
	b.block_timestamp,
    b.block_height,
	a.transaction_hash,
	r.predecessor_account_id from_account,
	r.receiver_account_id receiver_owner_account,
	-1 * CAST(a.args ->> 'deposit' AS NUMERIC) / CAST((10 ^ 24) AS NUMERIC)   amount_transferred,
	'NEAR' currency_transferred
from
	receipts r
inner join execution_outcomes e on
	e.receipt_id = r.receipt_id
inner join blocks b on
	b.block_hash = r.included_in_block_hash
inner join transaction_actions a on
	a.transaction_hash = r.originated_from_transaction_hash
where
	r.predecessor_account_id = ANY($1)
	and r.receiver_account_id not like '%.sputnik-dao.near'
	and e.status = 'SUCCESS_VALUE'
	and a.action_kind = 'TRANSFER'
	and to_char(to_timestamp(b.block_timestamp / 1000000000), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') >= $2
	and to_char(to_timestamp(b.block_timestamp / 1000000000), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') < $3
union
select
	to_char(to_timestamp(b.block_timestamp / 1000000000), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') block_timestamp_utc,
	b.block_timestamp,	
    b.block_height,
	r.originated_from_transaction_hash transaction_hash,
	r.predecessor_account_id from_account,
	r.receiver_account_id receiver_owner_account,
    CAST(ra.args ->> 'deposit' as NUMERIC) / CAST((10 ^ 24) AS NUMERIC) amount_transferred,
	'NEAR' currency_transferred	
from
	receipts r
inner join execution_outcomes e on
	e.receipt_id = r.receipt_id
inner join blocks b on
	b.block_hash = r.included_in_block_hash
inner join action_receipt_actions ra on
	ra.receipt_id = r.receipt_id
where
	r.receiver_account_id = ANY($1)
	and e.status = 'SUCCESS_VALUE'
	and ra.action_kind = 'TRANSFER'
	and r.predecessor_account_id != 'system'
	and to_char(to_timestamp(b.block_timestamp / 1000000000), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') >= $2
	and to_char(to_timestamp(b.block_timestamp / 1000000000), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') < $3`;