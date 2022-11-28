import { createHash } from 'crypto';

export function getLockup(masterAccountId: string, accountId: string): string {
  return `${sha256(accountId).slice(0, 40)}.lockup.${masterAccountId}`; // TODO: Link to documentation about this since it appears to be following a certain pattern.
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sha256(value: any) {
  return createHash('sha256').update(value).digest('hex');
}
