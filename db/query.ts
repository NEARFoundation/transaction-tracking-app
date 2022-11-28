/* eslint-disable canonical/sort-keys */
/* eslint no-use-before-define: "error"*/
import { Pool } from 'pg';

import jsonToCsv from '../helpers/jsonToCsv';
import { getLockup } from '../helpers/lockup';

import type Row from './Row';
import { ALL_OUTGOING, ALL_INCOMING } from './queries/all';
import { handleIncoming, handleOutgoing } from './transformations';

const CONNECTION_STRING = process.env.POSTGRESQL_CONNECTION_STRING;

const SQL_STATEMENT_TIMEOUT = 60 * 60 * 1_000; // 1 hour in milliseconds.
const LOCKUP_MASTER_ACCOUNT_ID = 'near';

function sortByBlockTimestamp(rows: Row[]): Row[] {
  return rows.sort((a, b) => {
    return a.account_id.localeCompare(b.account_id) || a.block_timestamp - b.block_timestamp;
  });
}

export default async function query(startDate: string, endDate: string, accountIds: Set<string>) {
  const pool = new Pool({ connectionString: CONNECTION_STRING, statement_timeout: SQL_STATEMENT_TIMEOUT });
  const rowPromises = [];

  console.log('query', startDate, endDate, accountIds);

  for (const accountId of Array.from(accountIds)) {
    const lockupAccountId = getLockup(LOCKUP_MASTER_ACCOUNT_ID, accountId);

    const allOutgoingTransactionsPromise = pool.query(ALL_OUTGOING, [[accountId, lockupAccountId], startDate, endDate]);
    const allIncomingTransactionsPromise = pool.query(ALL_INCOMING, [[accountId, lockupAccountId], startDate, endDate]);
    const [allOutgoingTransactions, allIncomingTransactions] = await Promise.all([allOutgoingTransactionsPromise, allIncomingTransactionsPromise]);

    for (const row of allOutgoingTransactions.rows) {
      rowPromises.push(handleOutgoing(accountId, row));
    }

    for (const row of allIncomingTransactions.rows) {
      rowPromises.push(handleIncoming(accountId, row));
    }
  }

  const rows = await Promise.all(rowPromises);

  const sortedRows = sortByBlockTimestamp(rows);
  const csv = jsonToCsv(sortedRows);
  return csv;
}
