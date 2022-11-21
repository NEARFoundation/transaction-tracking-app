import pg from 'pg';
import jsonToCsv from './jsonToCsv';

const CONNECTION_STRING = process.env.POSTGRESQL_CONNECTION_STRING;

// TODO: Consider allowing these values to be configurable per environment:
const STATEMENT_TIMEOUT = 30 * 1_000; // 30 seconds in milliseconds. "number of milliseconds before a statement in query will time out" https://node-postgres.com/api/client

const SQL = `select
	to_char(to_timestamp(b.block_timestamp / 1000000000), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') block_timestamp_utc,
	b.block_timestamp,
	a.transaction_hash,
	r.predecessor_account_id from_account,
	r.receiver_account_id receiver_owner_account,	
	CONCAT('-', a.args ->> 'deposit') amount_transferred,
	'yoctoNEAR' currency_transferred	
from
	receipts r
inner join execution_outcomes e on
	e.receipt_id = r.receipt_id
inner join blocks b on
	b.block_hash = r.included_in_block_hash
inner join transaction_actions a on
	a.transaction_hash = r.originated_from_transaction_hash
where
	r.predecessor_account_id in ($1)
	and r.receiver_account_id not like '%.sputnik-dao.near'
	and e.status = 'SUCCESS_VALUE'
	and a.action_kind = 'TRANSFER'
	and to_char(to_timestamp(b.block_timestamp / 1000000000), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') >= $2
	and to_char(to_timestamp(b.block_timestamp / 1000000000), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') < $3
union
select
	to_char(to_timestamp(b.block_timestamp / 1000000000), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') block_timestamp_utc,
	b.block_timestamp,	
	r.originated_from_transaction_hash transaction_hash,
	r.predecessor_account_id from_account,
	r.receiver_account_id receiver_owner_account,
	ra.args ->> 'deposit' amount_transferred,
	'yoctoNEAR' currency_transferred	
from
	receipts r
inner join execution_outcomes e on
	e.receipt_id = r.receipt_id
inner join blocks b on
	b.block_hash = r.included_in_block_hash
inner join action_receipt_actions ra on
	ra.receipt_id = r.receipt_id
where
	r.receiver_account_id in ($1)
	and e.status = 'SUCCESS_VALUE'
	and ra.action_kind = 'TRANSFER'
	and r.predecessor_account_id != 'system'
	and to_char(to_timestamp(b.block_timestamp / 1000000000), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') >= $2
	and to_char(to_timestamp(b.block_timestamp / 1000000000), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') < $3`;

function getAccountIdsAsQuotedCsv(accountIds: Set<string>): string {
  return Array.from(accountIds)
    .map((accountId) => `'${accountId}'`)
    .join(',');
}

export async function getCsvData(startDate: string, endDate: string, accountIds: Set<string>): Promise<string> {
  console.log({ startDate, endDate, accountIds });
  const pgClient = new pg.Client({ connectionString: CONNECTION_STRING, statement_timeout: STATEMENT_TIMEOUT });
  await pgClient.connect();
  const accountIdsAsQuotedCsv = getAccountIdsAsQuotedCsv(accountIds);
  console.log({ accountIdsAsQuotedCsv });
  const result = await pgClient.query(SQL, [accountIdsAsQuotedCsv, startDate, endDate]);
  console.log({ result });
  const csv = jsonToCsv(result.rows);
  console.log({ csv });
  await pgClient.end();
  return csv;
}
