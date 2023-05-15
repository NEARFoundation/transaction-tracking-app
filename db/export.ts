// @ts-ignore
import json2csv from 'csvjson-json2csv'; // https://www.npmjs.com/package/csvjson-json2csv
import Row from './row';

export default function jsonToCsv(object: Row[]): string {
  const csv = json2csv(object, { output_csvjson_variant: false, flatten: false, separator: ',' });
  return csv;
}
