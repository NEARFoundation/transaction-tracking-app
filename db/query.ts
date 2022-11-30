import { Pool, QueryResult } from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import jsonToCsv from './export';
import { ALL_OUTGOING, ALL_INCOMING, FT_INCOMING } from './queries/all';
import Row from './row';
import { AccountId, FTBalance, getCurrencyByContractFromNear, getFTBalance } from '../helpers/currency';
import { getLockup } from '../helpers/lockup';
const CONNECTION_STRING = process.env.POSTGRESQL_CONNECTION_STRING;

const SQL_STATEMENT_TIMEOUT = 3600 * 1_000; // 1 hour in milliseconds.

export default async function query_all(startDate: string, endDate: string, accountIds: Set<string>) {
  const pool = new Pool({ connectionString: CONNECTION_STRING, statement_timeout: SQL_STATEMENT_TIMEOUT });
  let rows_promises = [];

  console.log('query_all', startDate, endDate, accountIds);

  for (const accountId of accountIds) {
    const lockupAccountId = getLockup('near', accountId);

    const all_outgoing_txs_promise = pool.query(ALL_OUTGOING, [[accountId, lockupAccountId], startDate, endDate]);
    const all_incoming_txs_promise = pool.query(ALL_INCOMING, [[accountId, lockupAccountId], startDate, endDate]);
    const ft_incoming_txs_promise = pool.query(FT_INCOMING, [[accountId, lockupAccountId], startDate, endDate]);
    const [all_outgoing_txs, all_incoming_txs, ft_incoming_txs] = await Promise.all([all_outgoing_txs_promise, all_incoming_txs_promise, ft_incoming_txs_promise]);

    // TODO(pierre): consider using async to parallelize this
    for (const row of all_outgoing_txs.rows) {
      rows_promises.push(handleOutgoing(accountId, row));
    }

    for (const row of all_incoming_txs.rows) {
      rows_promises.push(handleIncoming(accountId, row));
    }

    for (const row of ft_incoming_txs.rows) {
      rows_promises.push(handleFtIncoming(accountId, row));
    }
  }

  let rows = await Promise.all(rows_promises);

  const sortedRows = sortByBlockTimestamp(rows);
  const csv = jsonToCsv(sortedRows);
  return csv;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${day}/${month}/${year}`;
}

async function handleOutgoing(accountId: AccountId, row: any): Promise<Row> {
  let near_amount = row.args?.deposit ? -1 * (row.args.deposit / 10 ** 24) : 0;
  // Remove very small transfers, eg. -1E-24
  near_amount = Math.abs(near_amount) >= 0.000001 ? near_amount : 0;

  let in_amount = '';
  let in_currency = '';

  let out_amount = '';
  let out_currency = '';

  if (row.args.method_name === 'ft_transfer') {
    if (row.args?.args_json?.amount && row.receipt_receiver_account_id) {
      var { symbol, decimals } = await getCurrencyByContractFromNear(row.receipt_receiver_account_id);
      let raw_amount = row.args?.args_json?.amount;

      out_currency = symbol;
      out_amount = String(-1 * (raw_amount / 10 ** decimals));
    }
  } else if (row.args.method_name === 'swap') {
    var { symbol, decimals } = await getCurrencyByContractFromNear(row.args.args_json.actions[0].token_in);

    let raw_amount_out = row.args?.args_json?.actions[0].min_amount_out;
    out_currency = symbol;
    out_amount = String(-1 * (raw_amount_out / 10 ** decimals));

    var { symbol, decimals } = await getCurrencyByContractFromNear(row.args.args_json.actions[0].token_out);

    let raw_amount_in = row.args?.args_json?.actions[0].amount_in;
    in_currency = symbol;
    in_amount = String(raw_amount_in / 10 ** decimals);
  } else if (row.args.method_name === 'ft_transfer_call') {
    // Gets arguments for function, converts from base64 if necessary
    let args_json = row.args?.args_json ? row.args.args_json : JSON.parse(atob(row.args.args_base64));

    if (args_json.receiver_id?.includes('bulksender.near')) {
      let raw_amount_out = args_json.amount;
      var { symbol, decimals } = await getCurrencyByContractFromNear(row.receipt_receiver_account_id);
      out_currency = symbol;
      out_amount = String(-1 * (raw_amount_out / 10 ** decimals));
    } else if (args_json.msg?.includes('force')) {
      let msg = JSON.parse(args_json.msg?.replaceAll('\\', ''));
      let raw_amount_out = args_json.amount;
      var { symbol, decimals } = await getCurrencyByContractFromNear(msg.actions[0].token_in);
      out_currency = symbol;
      out_amount = String(-1 * (raw_amount_out / 10 ** decimals));
      var { symbol, decimals } = await getCurrencyByContractFromNear(msg.actions[0].token_out);
      let raw_amount_in = msg.actions[0].min_amount_out;
      in_currency = symbol;
      in_amount = String(raw_amount_in / 10 ** decimals);
    } else {
      let raw_amount_out = args_json.amount;
      var { symbol, decimals } = await getCurrencyByContractFromNear(row.receipt_receiver_account_id);
      out_currency = symbol;
      out_amount = String(-1 * (raw_amount_out / 10 ** decimals));
    }
  }

  // Removed because it takes too much time.
  // const ft_balances = await getBalances(accountId, row.block_height);
  let r = <Row>{
    date: formatDate(new Date(row.block_timestamp / 1000000)),
    account_id: accountId,
    method_name: row.action_kind == 'TRANSFER' ? 'transfer' : row.args.method_name,
    block_timestamp: row.block_timestamp,
    from_account: row.receipt_predecessor_account_id,
    block_height: row.block_height,
    args: JSON.stringify(getCommandsArgs(row.args)),
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
    // onchain_dai_balance: ft_balances.dai.balance / 10 ** ft_balances.dai.decimals,
    // onchain_usdc_balance: ft_balances.usdc.balance / 10 ** ft_balances.usdc.decimals,
    amount_staked: handle_staking(row, near_amount),
  };

  return r;
}

async function handleIncoming(accountId: AccountId, row: any): Promise<Row> {
  let near_amount = row.args?.deposit ? row.args.deposit / 10 ** 24 : 0;
  near_amount = Math.abs(near_amount) >= 0.000001 ? near_amount : 0;
  // Gas refund are already accounted in other transactions.
  if (row.receipt_predecessor_account_id == 'system') {
    near_amount = Math.abs(near_amount) >= 0.5 ? near_amount : 0;
  }

  let in_amount = '';
  let in_currency = '';
  if (row.args.method_name === 'ft_transfer') {
    if (row.args?.args_json?.amount && row.receipt_receiver_account_id) {
      const { symbol, decimals } = await getCurrencyByContractFromNear(row.receipt_receiver_account_id);
      in_currency = symbol;

      let raw_amount = row.args?.args_json?.amount;
      in_amount = String(raw_amount / 10 ** decimals);
    }
  }

  // Removed because it takes too much time.
  // const ft_balances = await getBalances(accountId, row.block_height);
  let r = <Row>{
    date: formatDate(new Date(row.block_timestamp / 1000000)),
    account_id: accountId,
    method_name: row.action_kind == 'TRANSFER' ? 'transfer' : row.args.method_name,
    block_timestamp: row.block_timestamp,
    from_account: row.receipt_predecessor_account_id,
    block_height: row.block_height,
    args: JSON.stringify(getCommandsArgs(row.args)),
    transaction_hash: row.transaction_hash,
    // NEAR tokens
    amount_transferred: near_amount,
    currency_transferred: 'NEAR',
    // Fugible Token
    ft_amount_in: in_amount,
    ft_currency_in: in_currency,
    to_account: row.receipt_receiver_account_id,
    // onchain_dai_balance: ft_balances.dai.balance / 10 ** ft_balances.dai.decimals,
    // onchain_usdc_balance: ft_balances.usdc.balance / 10 ** ft_balances.usdc.decimals,
    amount_staked: handle_staking(row, near_amount),
  };

  return r;
}

async function handleFtIncoming(accountId: AccountId, row: any): Promise<Row> {
  let to = row.receiver_account_id;
  let near_amount = row.args?.deposit ? row.args.deposit / 10 ** 24 : 0;
  near_amount = Math.abs(near_amount) >= 0.000001 ? near_amount : 0;
  // Gas refund are already accounted in other transactions.
  if (row.receipt_predecessor_account_id == 'system') {
    near_amount = Math.abs(near_amount) >= 0.5 ? near_amount : 0;
  }

  let in_amount = '';
  let in_currency = '';
  if (row.args?.args_json?.amount && row.receipt_receiver_account_id) {
    const { symbol, decimals } = await getCurrencyByContractFromNear(row.receipt_receiver_account_id);
    in_currency = symbol;

    let raw_amount = row.args?.args_json?.amount;
    in_amount = String(raw_amount / 10 ** decimals);
  }

  // Removed because it takes too much time.
  // const ft_balances = await getBalances(accountId, row.block_height);
  let r = <Row>{
    date: formatDate(new Date(row.block_timestamp / 1000000)),
    account_id: accountId,
    method_name: row.action_kind == 'TRANSFER' ? 'transfer' : row.args.method_name,
    block_timestamp: row.block_timestamp,
    from_account: row.receipt_predecessor_account_id,
    block_height: row.block_height,
    args: JSON.stringify(getCommandsArgs(row.args)),
    transaction_hash: row.transaction_hash,
    // NEAR tokens
    amount_transferred: near_amount,
    currency_transferred: 'NEAR',
    // Fugible Token
    ft_amount_in: in_amount,
    ft_currency_in: in_currency,
    to_account: to,
    amount_staked: handle_staking(row, near_amount),
  };

  console.log("Return Incoming FT")
  console.log(r)

  return r;
}


function sortByBlockTimestamp(rows: Row[]): Row[] {
  return rows.sort(function (a, b) {
    return a.account_id.localeCompare(b.account_id) || a.block_timestamp - b.block_timestamp;
  });
}

const seen_balances = new Map();

async function getBalances(accountId: AccountId, block_id: number): Promise<{ usdc: FTBalance; dai: FTBalance }> {
  const key = JSON.stringify({ accId: accountId, b_id: block_id });

  if (seen_balances.has(key)) {
    return seen_balances.get(key);
  }

  // USDC
  const usdc = await getFTBalance('a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.factory.bridge.near', accountId, Number(block_id));

  // DAI
  const dai = await getFTBalance('6b175474e89094c44da98b954eedeac495271d0f.factory.bridge.near', accountId, Number(block_id));
  seen_balances.set(key, { usdc, dai });

  return { usdc, dai };
}

function getCommandsArgs(args: any): any {
  let pretty = {};
  if (args?.args_json) {
    pretty = args.args_json;
  } else if (args?.args_base64) {
    pretty = JSON.parse(atob(args.args_base64));
  }
  return pretty;
}

function handle_staking(row: any, nearAmount: number) {
  let tokens = 0;
  // It's a transfer out of the account but for staking.
  if (row.receipt_receiver_account_id.endsWith('.poolv1.near') && (row.args.method_name === 'deposit' || row.args.method_name === 'deposit_and_stake')) {
    tokens = -1 * nearAmount;
  }
  if (row.receipt_predecessor_account_id.endsWith('.poolv1.near')) {
    tokens = -1 * nearAmount;
  }
  return tokens;
}
