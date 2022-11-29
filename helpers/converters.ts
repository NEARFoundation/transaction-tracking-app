import { type Args, type ArgsJson, type IndexerRow } from '../db/Row';

const STAKING_ACCOUNT_SUFFIX = '.poolv1.near';

// eslint-disable-next-line canonical/id-match
export function getArgsAsObjectUsingBase64Fallback(args: Args | undefined): ArgsJson {
  let argsJson;
  if (args?.args_json) {
    argsJson = args.args_json;
  } else if (args?.args_base64) {
    argsJson = JSON.parse(Buffer.from(args.args_base64, 'base64').toString('utf8'));
  }

  return argsJson;
}

export function getNearAmountConsideringStaking(row: IndexerRow, nearAmount: number): number {
  let adjustedNearAmount = 0;
  // It's a transfer out of the account but for staking.
  if (row.receipt_receiver_account_id.endsWith(STAKING_ACCOUNT_SUFFIX) && (row.args?.method_name === 'deposit' || row.args?.method_name === 'deposit_and_stake')) {
    adjustedNearAmount = -1 * nearAmount;
  }

  if (row.receipt_predecessor_account_id.endsWith(STAKING_ACCOUNT_SUFFIX)) {
    adjustedNearAmount = -1 * nearAmount;
  }

  return adjustedNearAmount;
}
