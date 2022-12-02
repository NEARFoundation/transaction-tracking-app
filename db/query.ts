/* eslint-disable canonical/sort-keys */
/* eslint no-use-before-define: "error"*/
import fs from 'node:fs';
import path from 'node:path';

import { Pool } from 'pg';

import jsonToCsv from '../helpers/jsonToCsv';
import { getLockup } from '../helpers/lockup';

import { type CsvRow } from './Row';
import {
  convertIncomingFungibleTokenTransactionsFromIndexerToCsvRow,
  convertIncomingTransactionsFromIndexerToCsvRow,
  convertOutgoingTransactionsFromIndexerToCsvRow,
} from './transformations';

const CONNECTION_STRING = process.env.POSTGRESQL_CONNECTION_STRING;

const SQL_STATEMENT_TIMEOUT = 60 * 60 * 1_000; // 1 hour in milliseconds.
const LOCKUP_MASTER_ACCOUNT_ID = 'near';
const sqlFolder = path.join(path.join(process.cwd(), 'db'), 'queries');
const OUTGOING = `${sqlFolder}/outgoing.sql`;
const INCOMING = `${sqlFolder}/incoming.sql`;
const FT_INCOMING = `${sqlFolder}/fungibleTokensIncoming.sql`;

function sortByBlockTimestamp(rows: CsvRow[]): CsvRow[] {
  return rows.sort((a, b) => {
    return a.account_id.localeCompare(b.account_id) || a.block_timestamp - b.block_timestamp;
  });
}

function getSql(file: string): string {
  const sql = fs.readFileSync(file, 'utf8');
  return sql;
}

export default async function query(startDate: string, endDate: string, accountIds: Set<string>) {
  const pool = new Pool({ connectionString: CONNECTION_STRING, statement_timeout: SQL_STATEMENT_TIMEOUT });
  const rowPromises = [];

  // console.log('query', startDate, endDate, accountIds);

  for (const accountId of Array.from(accountIds)) {
    const lockupAccountId = getLockup(LOCKUP_MASTER_ACCOUNT_ID, accountId);

    const outgoingTransactionsPromise = pool.query(getSql(OUTGOING), [[accountId, lockupAccountId], startDate, endDate]);
    const incomingTransactionsPromise = pool.query(getSql(INCOMING), [[accountId, lockupAccountId], startDate, endDate]);
    const ftIncomingTransactionsPromise = pool.query(getSql(FT_INCOMING), [[accountId, lockupAccountId], startDate, endDate]);
    const [outgoingTransactions, incomingTransactions, ftIncomingTransactions] = await Promise.all([
      outgoingTransactionsPromise,
      incomingTransactionsPromise,
      ftIncomingTransactionsPromise,
    ]);

    for (const indexerRow of outgoingTransactions.rows) {
      rowPromises.push(convertOutgoingTransactionsFromIndexerToCsvRow(accountId, indexerRow));
    }

    for (const indexerRow of incomingTransactions.rows) {
      rowPromises.push(convertIncomingTransactionsFromIndexerToCsvRow(accountId, indexerRow));
    }

    for (const indexerRow of ftIncomingTransactions.rows) {
      rowPromises.push(convertIncomingFungibleTokenTransactionsFromIndexerToCsvRow(accountId, indexerRow));
    }
  }

  const rows = await Promise.all(rowPromises);

  const sortedRows = sortByBlockTimestamp(rows);
  const csv = jsonToCsv(sortedRows);
  return csv;
}
