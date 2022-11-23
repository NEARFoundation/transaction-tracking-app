import pg, { QueryResult } from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import jsonToCsv from './export';
import { ALL_OUTGOING, ALL_INCOMING } from './queries/all';
import Row from './row';
import { getCurrencyByContractFromNear } from '../helpers/currency';

const CONNECTION_STRING = process.env.POSTGRESQL_CONNECTION_STRING;

// TODO: Consider allowing these values to be configurable per environment:
const STATEMENT_TIMEOUT = 600 * 1_000; // 600 seconds in milliseconds. "number of milliseconds before a statement in query will time out" https://node-postgres.com/api/client

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
  const pgClient = new pg.Client({ connectionString: CONNECTION_STRING, statement_timeout: STATEMENT_TIMEOUT });
  await pgClient.connect();
  const rows = [];

  for (const accountId of accountIds) {
    console.log(accountId);

    const all_outgoing_txs_promise = pgClient.query(ALL_OUTGOING, [Array.from([accountId]), startDate, endDate]);
    const all_incoming_txs_promise = pgClient.query(ALL_INCOMING, [Array.from([accountId]), startDate, endDate]);
    const [all_outgoing_txs, all_incoming_txs] = await Promise.all([all_outgoing_txs_promise, all_incoming_txs_promise]);

    for (const row of all_outgoing_txs.rows) {
      let near_amount = row.args.deposit ? String(-1 * (row.args.deposit / 10 ** 24)) : '0';
      let ft_amount = '';
      let ft_currency = '';

      if (row.args.method_name === 'ft_transfer') {
        if (row.args?.args_json?.amount && row.receipt_receiver_account_id) {
          console.log({ row });
          const { symbol, decimals } = await getCurrencyByContractFromNear(row.receipt_receiver_account_id);
          ft_currency = symbol;

          let raw_amount = row.args?.args_json?.amount;
          ft_amount = String(-1 * (raw_amount / 10 ** decimals));
        }
      }

      const r = <Row>{
        date: new Date(row.block_timestamp / 1000000).toISOString(),
        account_id: accountId,
        method_name: row.action_kind == 'TRANSFER' ? 'transfer' : row.args.method_name,
        block_timestamp: row.block_timestamp,
        from_account: row.receipt_predecessor_account_id,
        block_height: row.block_height,
        args: JSON.stringify(row.args.args_json),
        transaction_hash: row.transaction_hash,
        // NEAR tokens
        amount_transferred: near_amount,
        currency_transferred: 'NEAR',
        // Fugible Token
        ft_amount_transferred: ft_amount,
        ft_currency_transferred: ft_currency,
        to_account: row.receipt_receiver_account_id,
      };
      rows.push(r);
    }

    for (const row of all_incoming_txs.rows) {
      let near_amount = row.args.deposit ? String(row.args.deposit / 10 ** 24) : '0';
      let ft_amount = '';
      let ft_currency = '';
      console.log(new Date(row.block_timestamp / 1000000));

      if (row.args.method_name === 'ft_transfer') {
        if (row.args?.args_json?.amount && row.receipt_receiver_account_id) {
          console.log({ row });
          const { symbol, decimals } = await getCurrencyByContractFromNear(row.receipt_receiver_account_id);
          ft_currency = symbol;

          let raw_amount = row.args?.args_json?.amount;
          ft_amount = String(raw_amount / 10 ** decimals);
        }
      }
      const r = <Row>{
        date: new Date(row.block_timestamp / 1000000).toISOString(),
        account_id: accountId,
        method_name: row.action_kind == 'TRANSFER' ? 'transfer' : row.args.method_name,
        block_timestamp: row.block_timestamp,
        from_account: row.receipt_predecessor_account_id,
        block_height: row.block_height,
        args: JSON.stringify(row.args.args_json),
        transaction_hash: row.transaction_hash,
        // NEAR tokens
        amount_transferred: near_amount,
        currency_transferred: 'NEAR',
        // Fugible Token
        ft_amount_transferred: ft_amount,
        ft_currency_transferred: ft_currency,
        to_account: row.receipt_receiver_account_id,
      };
      rows.push(r);
    }
  }

  const sortedRows = sortByBlockTimestamp(rows);
  const csv = jsonToCsv(sortedRows);
  await pgClient.end();
  return csv;
}
