// eslint-disable-next-line canonical/id-match, @typescript-eslint/ban-ts-comment
// @ts-expect-error
// eslint-disable-next-line canonical/id-match
import json2csv from 'csvjson-json2csv'; // https://www.npmjs.com/package/csvjson-json2csv

import type Row from './row';

export default function jsonToCsv(object: Row[]): string {
  const csv = json2csv(object, { flatten: false, output_csvjson_variant: false, separator: ',' });
  // console.log(csv);
  return csv;
}
