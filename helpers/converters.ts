const STAKING_ACCOUNT_SUFFIX = '.poolv1.near';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getArgsAsString(args: any): string {
  let pretty = {};
  if (args?.args_json) {
    pretty = args.args_json;
  } else if (args?.args_base64) {
    // TODO: What is this attempting to do? We need to update it to avoid using deprecated code.
    pretty = JSON.parse(atob(args.args_base64));
  }

  return JSON.stringify(pretty);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getNearAmountConsideringStaking(row: any, nearAmount: number): number {
  let adjustedNearAmount = 0;
  // It's a transfer out of the account but for staking.
  if (row.receipt_receiver_account_id.endsWith(STAKING_ACCOUNT_SUFFIX) && (row.args.method_name === 'deposit' || row.args.method_name === 'deposit_and_stake')) {
    adjustedNearAmount = -1 * nearAmount;
  }

  if (row.receipt_predecessor_account_id.endsWith(STAKING_ACCOUNT_SUFFIX)) {
    adjustedNearAmount = -1 * nearAmount;
  }

  return adjustedNearAmount;
}
