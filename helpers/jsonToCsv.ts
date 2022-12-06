// eslint-disable-next-line canonical/id-match, @typescript-eslint/ban-ts-comment
// @ts-expect-error
// eslint-disable-next-line canonical/id-match
import json2csv from 'csvjson-json2csv'; // https://www.npmjs.com/package/csvjson-json2csv

import { type CsvRow } from '..';

export default function jsonToCsv(row: CsvRow[]): string {
  const csv = json2csv(row, { flatten: false, output_csvjson_variant: false, separator: ',' });
  // console.log(csv);
  return csv;
}
