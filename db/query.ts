import pg from 'pg';
import jsonToCsv from './export';

import { RECEIVE_FT, SENT_FT } from './queries/ft';
import { RCV_SENT_NEAR } from './queries/received_sent_near';

import Row from './row';

const CONNECTION_STRING = process.env.POSTGRESQL_CONNECTION_STRING;

// TODO: Consider allowing these values to be configurable per environment:
const STATEMENT_TIMEOUT = 30 * 1_000; // 30 seconds in milliseconds. "number of milliseconds before a statement in query will time out" https://node-postgres.com/api/client

export default async function query_all(startDate: string, endDate: string, accountIds: Set<string>) {
  const pgClient = new pg.Client({ connectionString: CONNECTION_STRING, statement_timeout: STATEMENT_TIMEOUT });
  await pgClient.connect();

  const res = [];

  // TODO(pierre): Consider using pg pool instead of pg client. https://node-postgres.com/features/pooling
  const rcv_sent_near_promise = pgClient.query(RCV_SENT_NEAR, [Array.from(accountIds), startDate, endDate]);
  const ft_receive_promise = pgClient.query(RECEIVE_FT, [Array.from(accountIds), startDate, endDate]);
  const ft_sent_promise = pgClient.query(SENT_FT, [Array.from(accountIds), startDate, endDate]);

  const [rcv_sent_near, ft_receive, ft_sent] = await Promise.all([rcv_sent_near_promise, ft_receive_promise, ft_sent_promise]);

  // // TODO(pierre): refactor below
  for (const row of rcv_sent_near.rows) {
    const r = <Row>{
      block_timestamp_utc: row.block_timestamp_utc,
      block_timestamp: row.block_timestamp,
      block_height: row.block_height,
      transaction_hash: row.transaction_hash,
      from_account: row.from_account,
      to_account: row.receiver_owner_account,
      amount_transferred: row.amount_transferred,
      currency_transferred: row.currency_transferred,
    };
    res.push(r);
  }

  // for (const row of ft_receive.rows) {
  //   const r = <Row>{
  //     block_timestamp_utc: row.block_timestamp_utc,
  //     block_timestamp: row.block_timestamp,
  //     block_height: row.block_height,
  //     transaction_hash: row.transaction_hash,
  //     from_account: row.from_account,
  //     to_account: row.receiver_owner_account,
  //     amount_transferred: row.amount_transferred,
  //     currency_transferred: row.get_currency_by_contract,
  //   };
  //   res.push(r);
  // }

  // console.log('ft_sent.rows:', ft_sent.rows);

  // for (const row of ft_sent.rows) {
  //   const r = <Row>{
  //     block_timestamp_utc: row.block_timestamp_utc,
  //     block_timestamp: row.block_timestamp,
  //     block_height: row.block_height,
  //     transaction_hash: row.transaction_hash,
  //     from_account: row.from_account,
  //     to_account: row.receiver_owner_account,
  //     amount_transferred: row.amount_transferred,
  //     currency_transferred: row.get_currency_by_contract,
  //   };
  //   res.push(r);
  // }

  const csv = jsonToCsv(res);
  console.log({ csv });
  await pgClient.end();
  return csv;
}
