import * as nearAPI from 'near-api-js'; // https://docs.near.org/tools/near-api-js/quick-reference#import
import { InMemoryKeyStore } from 'near-api-js/lib/key_stores/in_memory_key_store';
import { type KeyStore } from 'near-api-js/lib/key_stores/keystore';

// Use archival node because usual nodes only keep data of the last few epochs (less than a week).
// https://docs.near.org/api/rpc/setup#querying-historical-data
export const NEAR_NODE_URL = process.env.NEAR_NODE_URL ?? 'https://archival-rpc.mainnet.near.org';

export function getJsonRpcProvider(nodeUrl: string): nearAPI.providers.JsonRpcProvider {
  return new nearAPI.providers.JsonRpcProvider({ url: nodeUrl });
}

export function getNearApiConnection(nodeUrl: string, keyStore?: KeyStore) {
  const jsonRpcProvider = getJsonRpcProvider(nodeUrl);
  const signer = new nearAPI.InMemorySigner(keyStore ?? new InMemoryKeyStore());
  const connection = new nearAPI.Connection(nodeUrl, jsonRpcProvider, signer);
  // console.log('getNearApiConnection', connection);

  return { connection, jsonRpcProvider };
}
