// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';
import query_all from '../../db/query';
import { getFormattedUtcDatetimeNow } from '../../helpers/datetime';

const STATUS_SUCCESS = 200;
const STATUS_ERROR = 500;

function getFilename(accounts: Set<string>): string {
  if (accounts.size === 1) {
    return `${Array.from(accounts)[0]}_${getFormattedUtcDatetimeNow()}.csv`;
  } else if (accounts.size > 1) {
    const firstAccount = Array.from(accounts)[0];
    return `${firstAccount}+${accounts.size - 1}_more_${getFormattedUtcDatetimeNow()}.csv`;
  }
  return `download_${getFormattedUtcDatetimeNow()}.csv`;
}

function getCleanedAccountIds(accountIds: string): Set<string> {
  return new Set(
    accountIds
      .replaceAll('\r', '')
      .split('\n')
      .filter((id) => id.trim() !== ''),
  );
}

export default async function handler(request: NextApiRequest, res: NextApiResponse<string>) {
  const { startDate, endDate, accountIds } = request.body;

  console.log({ startDate, endDate, accountIds });
  const accounts = getCleanedAccountIds(accountIds as string);
  const rowsCsv = await query_all(startDate as string, endDate as string, accounts);

  // https://medium.com/@aitchkhan/downloading-csv-files-from-express-server-7a3beb3ae52c
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${getFilename(accounts)}"`);
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Pragma', 'no-cache');

  try {
    res.status(STATUS_SUCCESS).send(rowsCsv);
  } catch (error) {
    console.error('error:', error);
    res.status(STATUS_ERROR).send(JSON.stringify(error));
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '8mb',
    },
  },
};
