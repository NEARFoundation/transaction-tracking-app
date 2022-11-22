/* eslint-disable canonical/filename-match-exported */
import fs from 'node:fs';
import path from 'node:path';

import pg, { type QueryResult } from 'pg';

import { getSymbol } from '../helpers/currency';

import jsonToCsv from './jsonToCsv';
import type Row from './row';

const CONNECTION_STRING = process.env.POSTGRESQL_CONNECTION_STRING;

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

export default async function query(startDate: string, endDate: string, accountIds: Set<string>) {
  console.log(__dirname, __filename);
  const pgClient = new pg.Client({ connectionString: CONNECTION_STRING, statement_timeout: STATEMENT_TIMEOUT });
  await pgClient.connect();

  const files = getFiles();
  const promises: Array<Promise<QueryResult<Row>>> = [];

  // TODO (Pierre): Consider using pg pool instead of pg client. https://node-postgres.com/features/pooling
  for (const file of files) {
    const sql = getTransactionTypeSql(file);
    console.log({ file, sql });
    const promise = pgClient.query(sql, [Array.from(accountIds), startDate, endDate]);
    promises.push(promise);
  }

  const queryResults = await Promise.all(promises);
  const rows = queryResults.flatMap((queryResult) => queryResult.rows);
  const sortedRows = sortByBlockTimestamp(rows);
  const sortedRowsWithCurrencySymbols = [];
  for (const row of sortedRows) {
    const updatedRow = { ...row };
    if (row.get_currency_by_contract) {
      // eslint-disable-next-line canonical/id-match
      updatedRow.currency_transferred = await getSymbol(row.get_currency_by_contract);
    }

    sortedRowsWithCurrencySymbols.push(updatedRow);
  }

  const csv = jsonToCsv(sortedRowsWithCurrencySymbols);

  console.log({ csv });
  await pgClient.end();
  return csv;
}
