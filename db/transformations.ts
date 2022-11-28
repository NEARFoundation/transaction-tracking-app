/* eslint-disable canonical/sort-keys */

import { getArgsAsString, getNearAmountConsideringStaking } from '../helpers/converters';
import { type AccountId, getCurrencyByContractFromNear } from '../helpers/currency';
import { formatDateFromNano } from '../helpers/datetime';

import type Row from './Row';

const SYSTEM_ACCOUNT_ID = 'system';
const BULKSENDER_ACCOUNT_ID = 'bulksender.near';
const MINIMUM_AMOUNT = 0.000_001;
const MINIMUM_AMOUNT_FOR_SYSTEM_ACCOUNT = 0.5;
const YOCTO_CONVERSION_CONSTANT = 10 ** 24;

// TODO
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawQueryRow = any;

function getRow(rawRow: RawQueryRow, accountId: AccountId, nearAmount: number, ftAmountIn: string, ftCurrencyIn: string, ftAmountOut = '', ftCurrencyOut = ''): Row {
  return {
    account_id: accountId,
    block_timestamp_utc: formatDateFromNano(rawRow.block_timestamp),
    block_timestamp: rawRow.block_timestamp,
    block_height: rawRow.block_height,
    transaction_hash: rawRow.transaction_hash,
    from_account: rawRow.receipt_predecessor_account_id,
    to_account: rawRow.receipt_receiver_account_id,
    amount_transferred_in_near: nearAmount,
    // Fungible Token
    ft_amount_in: ftAmountIn,
    ft_currency_in: ftCurrencyIn,
    ft_amount_out: ftAmountOut,
    ft_currency_out: ftCurrencyOut,
    amount_staked: getNearAmountConsideringStaking(rawRow, nearAmount),
    args: getArgsAsString(rawRow.args),
    method_name: rawRow.action_kind === 'TRANSFER' ? 'transfer' : rawRow.args.method_name,
  };
}

function divide(rawAmount: number, decimals: number): string {
  // TODO: Document what is happening and why (and improve the function name).
  return String(rawAmount / 10 ** decimals);
}

function convertYoctoToNearAndConsiderSmallAmountsToBeZero(rawRow: RawQueryRow): number {
  let nearAmount = rawRow.args?.deposit ? rawRow.args.deposit / YOCTO_CONVERSION_CONSTANT : 0; // converting from yoctonear to near
  // Round very small transfers down to 0. TODO: Document why this is a good idea or a requirement. Consider improving the name of the constant.
  nearAmount = Math.abs(nearAmount) >= MINIMUM_AMOUNT ? nearAmount : 0;
  return nearAmount;
}

// TODO: Improve the name. Continue reducing duplication with handleOutgoing.
export async function handleIncoming(accountId: AccountId, rawRow: RawQueryRow): Promise<Row> {
  let nearAmount = convertYoctoToNearAndConsiderSmallAmountsToBeZero(rawRow);
  // Gas refund are already accounted in other transactions.
  if (rawRow.receipt_predecessor_account_id === SYSTEM_ACCOUNT_ID) {
    nearAmount = Math.abs(nearAmount) >= MINIMUM_AMOUNT_FOR_SYSTEM_ACCOUNT ? nearAmount : 0;
  }

  let inAmount = '';
  let inCurrency = '';
  if (rawRow.args.method_name === 'ft_transfer' && rawRow.args?.args_json?.amount && rawRow.receipt_receiver_account_id) {
    const { symbol, decimals } = await getCurrencyByContractFromNear(rawRow.receipt_receiver_account_id);
    inCurrency = symbol;

    const rawAmount = rawRow.args?.args_json?.amount;
    inAmount = divide(rawAmount, decimals);
  }

  const result: Row = getRow(rawRow, accountId, nearAmount, inAmount, inCurrency);

  return result;
}

// TODO: Improve the name.  Document what is happening and why. Split into smaller functions.
// eslint-disable-next-line max-lines-per-function
export async function handleOutgoing(accountId: AccountId, rawRow: RawQueryRow): Promise<Row> {
  const nearAmount = convertYoctoToNearAndConsiderSmallAmountsToBeZero(rawRow);

  let ftAmountIn = '';
  let ftCurrencyIn = '';

  let ftAmountOut = '';
  let ftCurrencyOut = '';

  if (rawRow.args.method_name === 'ft_transfer') {
    if (rawRow.args?.args_json?.amount && rawRow.receipt_receiver_account_id) {
      const { symbol, decimals } = await getCurrencyByContractFromNear(rawRow.receipt_receiver_account_id);
      const rawAmount = rawRow.args?.args_json?.amount;

      ftCurrencyOut = symbol;
      ftAmountOut = divide(-1 * rawAmount, decimals);
    }
    // TODO Is the lack of `else` here intentional?
  } else if (rawRow.args.method_name === 'swap') {
    const tokenIn = await getCurrencyByContractFromNear(rawRow.args.args_json.actions[0].token_in);

    const rawAmountOut = rawRow.args?.args_json?.actions[0].min_amount_out;
    ftCurrencyOut = tokenIn.symbol;
    ftAmountOut = divide(-1 * rawAmountOut, tokenIn.decimals);

    const tokenOut = await getCurrencyByContractFromNear(rawRow.args.args_json.actions[0].token_out);

    const rawAmountIn = rawRow.args?.args_json?.actions[0].amount_in;
    ftCurrencyIn = tokenOut.symbol;
    ftAmountIn = divide(rawAmountIn, tokenOut.decimals);
  } else if (rawRow.args.method_name === 'ft_transfer_call') {
    // Gets arguments for function, converts from base64 if necessary
    const argsJson = rawRow.args?.args_json ? rawRow.args.args_json : JSON.parse(atob(rawRow.args.args_base64));

    if (argsJson.receiver_id?.includes(BULKSENDER_ACCOUNT_ID)) {
      const rawAmountOut = argsJson.amount;
      const { symbol, decimals } = await getCurrencyByContractFromNear(rawRow.receipt_receiver_account_id);
      ftCurrencyOut = symbol;
      ftAmountOut = divide(-1 * rawAmountOut, decimals);
    } else if (argsJson.msg?.includes('force')) {
      const message = JSON.parse(argsJson.msg?.replaceAll('\\', ''));
      const rawAmountOut = argsJson.amount;
      const tokenIn = await getCurrencyByContractFromNear(message.actions[0].token_in);
      ftCurrencyOut = tokenIn.symbol;
      ftAmountOut = divide(-1 * rawAmountOut, tokenIn.decimals);
      const tokenOut = await getCurrencyByContractFromNear(message.actions[0].token_out);
      const rawAmountIn = message.actions[0].min_amount_out;
      ftCurrencyIn = tokenOut.symbol;
      ftAmountIn = divide(rawAmountIn, tokenOut.decimals);
    } else {
      const rawAmount = argsJson.amount;
      const { symbol, decimals } = await getCurrencyByContractFromNear(rawRow.receipt_receiver_account_id);
      ftCurrencyOut = symbol;
      ftAmountOut = divide(-1 * rawAmount, decimals);
    }
  }

  const result: Row = getRow(rawRow, accountId, nearAmount, ftAmountIn, ftCurrencyIn, ftAmountOut, ftCurrencyOut);

  return result;
}
