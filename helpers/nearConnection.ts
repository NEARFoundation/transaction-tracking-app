import * as nearAPI from 'near-api-js'; // https://docs.near.org/tools/near-api-js/quick-reference#import
import { InMemoryKeyStore } from 'near-api-js/lib/key_stores/in_memory_key_store';
import { type KeyStore } from 'near-api-js/lib/key_stores/keystore';

// TODO: If we really do need to use the Archival RPC URL instead of 'https://rpc.mainnet.near.org', document here why.
export const NEAR_NODE_URL = process.env.NEAR_NODE_URL ?? 'https://archival-rpc.mainnet.near.org'; // https://docs.near.org/api/rpc/setup#querying-historical-data

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
