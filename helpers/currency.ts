import * as nearAPI from 'near-api-js'; // https://docs.near.org/tools/near-api-js/quick-reference#import
import { getNearApiConnection } from './nearConnection';

export type AccountId = string;

const NEAR_NODE_URL = process.env.NEAR_NODE_URL ?? 'https://rpc.mainnet.near.org';
const connection = getNearApiConnection(NEAR_NODE_URL);

export async function getCurrencyByContractFromNear(fungibleTokenContractAccountId: AccountId): Promise<{ decimals: any; name: string; symbol: string }> {
  // from https://github.com/NEARFoundation/tx-tracking-app/blob/1922c5f6059bb38583bc524a525d976731854284/backend/src/helpers/getCurrency.ts#L73
  const ftMetadataResult = await new nearAPI.Account(connection, '').viewFunction(fungibleTokenContractAccountId, 'ft_metadata', {});
  const { symbol, name, decimals } = ftMetadataResult;
  return { symbol, name, decimals };
}
