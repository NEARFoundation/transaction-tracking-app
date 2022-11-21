import fs from 'node:fs';

// @ts-ignore
import json2csv from 'csvjson-json2csv'; // https://www.npmjs.com/package/csvjson-json2csv

export default function jsonToCsv(object: any): string {
  const csv = json2csv(object, { output_csvjson_variant: false, flatten: false, separator: ',' });
  // console.log(csv);
  return csv;
}
