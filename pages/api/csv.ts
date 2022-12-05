/* eslint-disable canonical/filename-match-exported */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { type NextApiRequest, type NextApiResponse } from 'next';

import query from '../../db/query';
import { getFormattedUtcDatetimeNow } from '../../helpers/datetime';

const STATUS_SUCCESS = 200;
const STATUS_ERROR = 500;

function getDefaultFilename(): string {
  return `download_${getFormattedUtcDatetimeNow()}.csv`;
}

function getCleanedAccountIds(accountIds: string): Set<string> {
  return new Set(accountIds.replaceAll('\r', '').split('\n'));
}

export default async function handler(request: NextApiRequest, response: NextApiResponse<string>) {
  const { startDate, endDate, accountIds } = request.body;

  // console.log({ accountIds, endDate, startDate });
  const rowsCsv = await query(startDate as string, endDate as string, getCleanedAccountIds(accountIds as string));

  // https://medium.com/@aitchkhan/downloading-csv-files-from-express-server-7a3beb3ae52c
  response.setHeader('Content-Type', 'text/csv');
  response.setHeader('Content-Disposition', `attachment; filename="${getDefaultFilename()}"`);
  response.setHeader('Cache-Control', 'no-cache');
  response.setHeader('Pragma', 'no-cache');

  try {
    response.status(STATUS_SUCCESS).send(rowsCsv);
  } catch (error) {
    console.error('error:', error);
    response.status(STATUS_ERROR).send(JSON.stringify(error));
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '8mb',
    },
  },
};
