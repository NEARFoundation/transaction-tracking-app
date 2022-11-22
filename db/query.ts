import pg, { QueryResult } from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import jsonToCsv from './export';
import { ALL_OUTGOING, ALL_INCOMING } from './queries/all';
import Row from './row';

const CONNECTION_STRING = process.env.POSTGRESQL_CONNECTION_STRING;

// TODO: Consider allowing these values to be configurable per environment:
const STATEMENT_TIMEOUT = 30 * 1_000; // 30 seconds in milliseconds. "number of milliseconds before a statement in query will time out" https://node-postgres.com/api/client

const sqlFolder = path.join(path.join(process.cwd(), 'db'), 'queries');
const DOT_SQL = '.sql';

function getTransactionTypeSql(file: string): string {
  const sql = fs.readFileSync(file, 'utf8');
  return sql;
}

function getFiles() {
  const filesUnfiltered = fs.readdirSync(sqlFolder);
  console.log({ filesUnfiltered });
  return filesUnfiltered.filter((file) => file.endsWith(DOT_SQL)).map((file) => path.join(sqlFolder, file));
}

function sortByBlockTimestamp(rows: Row[]): Row[] {
  return rows.sort((a, b) => a.block_timestamp - b.block_timestamp);
}

export default async function query_all(startDate: string, endDate: string, accountIds: Set<string>) {
  console.log(__dirname, __filename);
  const pgClient = new pg.Client({ connectionString: CONNECTION_STRING, statement_timeout: STATEMENT_TIMEOUT });
  await pgClient.connect();

  const all_outgoing_txs_promise = pgClient.query(ALL_OUTGOING, [Array.from(accountIds), startDate, endDate]);
  const all_incoming_txs_promise = pgClient.query(ALL_INCOMING, [Array.from(accountIds), startDate, endDate]);
  const [all_outgoing_txs, all_incoming_txs] = await Promise.all([all_outgoing_txs_promise, all_incoming_txs_promise]);

  const rows = [];
  for (const row of all_outgoing_txs.rows) {
    const r = <Row>{
      block_timestamp: row.block_timestamp,
      block_height: row.block_height,
      transaction_hash: row.transaction_hash,
      from_account: row.receipt_predecessor_account_id,
      to_account: row.receipt_receiver_account_id,
      amount_transferred: String(-1 * (row.args.deposit / 10 ** 24)),
      currency_transferred: 'NEAR',
      action_kind: row.action_kind,
      method_name: row.args.method_name,
      args: JSON.stringify(row.args.args_json),
    };
    rows.push(r);
  }

  for (const row of all_incoming_txs.rows) {
    const r = <Row>{
      block_timestamp: row.block_timestamp,
      block_height: row.block_height,
      transaction_hash: row.transaction_hash,
      from_account: row.receipt_predecessor_account_id,
      to_account: row.receipt_receiver_account_id,
      amount_transferred: String(row.args.deposit / 10 ** 24),
      currency_transferred: 'NEAR',
      action_kind: row.action_kind,
      method_name: row.args.method_name,
      args: JSON.stringify(row.args.args_json),
    };
    rows.push(r);
  }
  const sortedRows = sortByBlockTimestamp(rows);
  const csv = jsonToCsv(sortedRows);
  console.log({ csv });
  await pgClient.end();
  return csv;
}
