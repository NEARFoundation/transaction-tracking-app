import { createHash } from 'crypto';

// LockUp account IDs are created by:
// - hashing (sha256) the owner account ID.
// - taking the first 40 characters of the hash.
// - appending ".lockup.near" to the end.
// See https://github.com/near/core-contracts/blob/f1467366930480f066ecb244881e8836db14e04e/lockup-factory/src/lib.rs#L118
export function getLockup(masterAccountId: string, accountId: string): string {
  return `${sha256(accountId).slice(0, 40)}.lockup.${masterAccountId}`;
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}
