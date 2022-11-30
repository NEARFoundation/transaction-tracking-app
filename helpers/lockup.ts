const { createHash } = require('crypto');

export function getLockup(masterAccountId: string, accountId: string): string {
  return `${sha256(accountId).slice(0, 40)}.lockup.${masterAccountId}`;
}

function sha256(value: any) {
  return createHash('sha256').update(value).digest('hex');
}
