import pg, { QueryResult } from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import jsonToCsv from './export';
import { ALL_OUTGOING, ALL_INCOMING } from './queries/all';
import Row from './row';
import { getCurrencyByContractFromNear } from '../helpers/currency';

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
  return rows.sort(function (a, b) {
    return a.account_id.localeCompare(b.account_id) || a.block_timestamp - b.block_timestamp;
  });
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
      let near_amount = row.args?.deposit ? -1 * (row.args.deposit / 10 ** 24) : 0;
      near_amount = Math.abs(near_amount) > 0.01 ? near_amount : 0;

      let in_amount = '';
      let in_currency = '';

      let out_amount = '';
      let out_currency = '';


      if (row.args.method_name === 'ft_transfer') {
        if (row.args?.args_json?.amount && row.receipt_receiver_account_id) {
          console.log({ row });
          var { symbol, decimals } = await getCurrencyByContractFromNear(row.receipt_receiver_account_id);
          let raw_amount = row.args?.args_json?.amount;

          out_currency = symbol;
          out_amount = String(-1 * (raw_amount / 10 ** decimals));
        }
      }

      else if (row.args.method_name === 'swap') {
        console.log({ row });
        var { symbol, decimals } = await getCurrencyByContractFromNear(row.args.args_json.actions[0].token_in);

        let raw_amount_out = row.args?.args_json?.actions[0].min_amount_out;
        out_currency = symbol;
        out_amount = String(-1 * (raw_amount_out / 10 ** decimals));

        var { symbol, decimals } = await getCurrencyByContractFromNear(row.args.args_json.actions[0].token_out);

        let raw_amount_in = row.args?.args_json?.actions[0].amount_in;
        in_currency = symbol;
        in_amount = String((raw_amount_in / 10 ** decimals));

      }

      else if (row.args.method_name === 'ft_transfer_call') {

        // Gets arguments for function, converts from base64 if necessary 
        let args_json = row.args?.args_json ? row.args.args_json : JSON.parse(atob(row.args.args_base64));

        if (args_json.receiver_id?.includes("bulksender.near")) {
          let raw_amount_out = args_json.amount;
          var { symbol, decimals } = await getCurrencyByContractFromNear(row.receipt_receiver_account_id);
          out_currency = symbol;
          out_amount = String(-1 * (raw_amount_out / 10 ** decimals));
        }

        else if (args_json.msg?.includes("force")) {
          let msg = JSON.parse(args_json.msg?.replaceAll('\\', ""));
          let raw_amount_out = args_json.amount;
          var { symbol, decimals } = await getCurrencyByContractFromNear(msg.actions[0].token_in);
          out_currency = symbol;
          out_amount = String(-1 * (raw_amount_out / 10 ** decimals));
          var { symbol, decimals } = await getCurrencyByContractFromNear(msg.actions[0].token_out);
          let raw_amount_in = msg.actions[0].min_amount_out;
          in_currency = symbol;
          in_amount = String((raw_amount_in / 10 ** decimals));
        }

        else {
          let raw_amount_out = args_json.amount;
          var { symbol, decimals } = await getCurrencyByContractFromNear(row.receipt_receiver_account_id);
          out_currency = symbol;
          out_amount = String(-1 * (raw_amount_out / 10 ** decimals));
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
        ft_amount_out: out_amount,
        ft_currency_out: out_currency,
        ft_amount_in: in_amount,
        ft_currency_in: in_currency,
        to_account: row.receipt_receiver_account_id,
      };
      rows.push(r);
    }

    for (const row of all_incoming_txs.rows) {
      let near_amount = row.args?.deposit ? row.args.deposit / 10 ** 24 : 0;
      near_amount = near_amount > 0.01 ? near_amount : 0;
      
      let in_amount = '';
      let in_currency = '';

      if (row.args.method_name === 'ft_transfer') {
        if (row.args?.args_json?.amount && row.receipt_receiver_account_id) {
          console.log({ row });
          const { symbol, decimals } = await getCurrencyByContractFromNear(row.receipt_receiver_account_id);
          in_currency = symbol;

          let raw_amount = row.args?.args_json?.amount;
          in_amount = String(raw_amount / 10 ** decimals);
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
        ft_amount_in: in_amount,
        ft_currency_in: in_currency,
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
