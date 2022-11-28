import * as nearAPI from 'near-api-js'; // https://docs.near.org/tools/near-api-js/quick-reference#import

import { getJsonRpcProvider, getNearApiConnection, NEAR_NODE_URL } from './nearConnection';

export type AccountId = string;

const { connection } = getNearApiConnection(NEAR_NODE_URL);

type FungibleTokenDetails = {
  decimals: number;
  name: string;
  symbol: string;
};

export type FungibleTokenBalance = FungibleTokenDetails & {
  balance: number;
};

export async function getCurrencyByContractFromNear(fungibleTokenContractAccountId: AccountId): Promise<FungibleTokenDetails> {
  // from https://github.com/NEARFoundation/tx-tracking-app/blob/1922c5f6059bb38583bc524a525d976731854284/backend/src/helpers/getCurrency.ts#L73
  const ftMetadataResult = await new nearAPI.Account(connection, '').viewFunction(fungibleTokenContractAccountId, 'ft_metadata', {});
  const { symbol, name, decimals } = ftMetadataResult;
  return { decimals, name, symbol };
}

type QueryParameters = {
  // Could this type be imported from near-api-js instead of defined here?
  account_id: string;
  args_base64: string;
  block_id: number;
  method_name: string;
  request_type: string;
};

export async function getFungibleTokenBalance(fungibleTokenContractAccountId: AccountId, accountId: AccountId, blockId: number): Promise<FungibleTokenBalance> {
  const jsonRpcProvider = getJsonRpcProvider(NEAR_NODE_URL);

  const queryParameters: QueryParameters = {
    account_id: fungibleTokenContractAccountId,
    args_base64: btoa(JSON.stringify({ account_id: accountId })),
    block_id: Number(blockId),
    method_name: 'ft_balance_of',
    request_type: 'call_function',
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawResult: any = await jsonRpcProvider.query(queryParameters);
  const balance = JSON.parse(Buffer.from(rawResult.result).toString());

  const { symbol, name, decimals } = await getCurrencyByContractFromNear(fungibleTokenContractAccountId);
  return { balance, decimals, name, symbol };
}
