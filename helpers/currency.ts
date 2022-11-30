import * as nearAPI from 'near-api-js'; // https://docs.near.org/tools/near-api-js/quick-reference#import
import { getNearApiConnection } from './nearConnection';

export type AccountId = string;

const NEAR_NODE_URL = process.env.NEAR_NODE_URL ?? 'https://rpc.mainnet.near.org';
const { provider, connection } = getNearApiConnection(NEAR_NODE_URL);

export async function getCurrencyByContractFromNear(fungibleTokenContractAccountId: AccountId): Promise<{ decimals: any; name: string; symbol: string }> {
  // from https://github.com/NEARFoundation/tx-tracking-app/blob/1922c5f6059bb38583bc524a525d976731854284/backend/src/helpers/getCurrency.ts#L73
  const ftMetadataResult = await new nearAPI.Account(connection, '').viewFunction(fungibleTokenContractAccountId, 'ft_metadata', {});
  const { symbol, name, decimals } = ftMetadataResult;
  return { symbol, name, decimals };
}

type query = {
  request_type: string;
  block_id: number;
  account_id: string;
  method_name: string;
  args_base64: string;
};
export type FTBalance = {
  balance: number;
  symbol: string;
  name: string;
  decimals: number;
};
export async function getFTBalance(ftContractAccountId: AccountId, accountId: AccountId, blockId: number): Promise<FTBalance> {
  const provider = new nearAPI.providers.JsonRpcProvider({ url: 'https://archival-rpc.mainnet.near.org' });

  const rawResult: any = await provider.query({
    request_type: 'call_function',
    account_id: ftContractAccountId,
    method_name: 'ft_balance_of',
    args_base64: btoa(JSON.stringify({ account_id: accountId })),
    block_id: Number(blockId),
  });
  const balance = JSON.parse(Buffer.from(rawResult.result).toString());

  const { symbol, name, decimals } = await getCurrencyByContractFromNear(ftContractAccountId);
  return { balance, symbol, name, decimals };
}
