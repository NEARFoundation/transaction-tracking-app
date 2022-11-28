/* eslint-disable canonical/sort-keys */

import { getArgsAsObjectUsingBase64Fallback, getNearAmountConsideringStaking } from '../helpers/converters';
import { type AccountId, getCurrencyByContractFromNear } from '../helpers/currency';
import { formatDateFromNano } from '../helpers/datetime';

import { type CsvRow, type IndexerRow } from './Row';

const SYSTEM_ACCOUNT_ID = 'system';
const BULKSENDER_ACCOUNT_ID = 'bulksender.near';
const MINIMUM_AMOUNT = 0.000_001;
const MINIMUM_AMOUNT_FOR_SYSTEM_ACCOUNT = 0.5;
const YOCTO_CONVERSION_CONSTANT = 10 ** 24;

function getRow(indexerRow: IndexerRow, accountId: AccountId, nearAmount: number, ftAmountIn: string, ftCurrencyIn: string, ftAmountOut = '', ftCurrencyOut = ''): CsvRow {
  return {
    account_id: accountId,
    block_timestamp_utc: formatDateFromNano(indexerRow.block_timestamp),
    block_timestamp: indexerRow.block_timestamp,
    block_height: indexerRow.block_height,
    transaction_hash: indexerRow.transaction_hash,
    from_account: indexerRow.receipt_predecessor_account_id,
    to_account: indexerRow.receipt_receiver_account_id,
    amount_transferred_in_near: nearAmount,
    // Fungible Token
    ft_amount_in: ftAmountIn,
    ft_currency_in: ftCurrencyIn,
    ft_amount_out: ftAmountOut,
    ft_currency_out: ftCurrencyOut,
    method_name: String(indexerRow.action_kind === 'TRANSFER' ? 'transfer' : indexerRow.args?.method_name),
    amount_staked: getNearAmountConsideringStaking(indexerRow, nearAmount),
    args: JSON.stringify(getArgsAsObjectUsingBase64Fallback(indexerRow.args)),
  };
}

function divide(rawAmount: number, decimals: number): string {
  // TODO: Document what is happening and why (and improve the function name).
  return String(rawAmount / 10 ** decimals);
}

function convertYoctoToNearAndConsiderSmallAmountsToBeZero(indexerRow: IndexerRow): number {
  let nearAmount = indexerRow.args?.deposit ? indexerRow.args.deposit / YOCTO_CONVERSION_CONSTANT : 0; // converting from yoctonear to near
  // Round very small transfers down to 0. TODO: Document why this is a good idea or a requirement. Consider improving the name of the constant.
  nearAmount = Math.abs(nearAmount) >= MINIMUM_AMOUNT ? nearAmount : 0;
  return nearAmount;
}

// TODO: Improve the name. Continue reducing duplication with handleOutgoing.
export async function handleIncoming(accountId: AccountId, indexerRow: IndexerRow): Promise<CsvRow> {
  let nearAmount = convertYoctoToNearAndConsiderSmallAmountsToBeZero(indexerRow);
  // Gas refund are already accounted in other transactions.
  if (indexerRow.receipt_predecessor_account_id === SYSTEM_ACCOUNT_ID) {
    nearAmount = Math.abs(nearAmount) >= MINIMUM_AMOUNT_FOR_SYSTEM_ACCOUNT ? nearAmount : 0;
  }

  let inAmount = '';
  let inCurrency = '';
  if (indexerRow.args?.method_name === 'ft_transfer' && indexerRow.args?.args_json?.amount && indexerRow.receipt_receiver_account_id) {
    const { symbol, decimals } = await getCurrencyByContractFromNear(indexerRow.receipt_receiver_account_id);
    inCurrency = symbol;

    const rawAmount = indexerRow.args?.args_json?.amount;
    inAmount = divide(rawAmount, decimals);
  }

  const result: CsvRow = getRow(indexerRow, accountId, nearAmount, inAmount, inCurrency);

  return result;
}

// TODO: Improve the name.  Document what is happening and why. Split into smaller functions.
// eslint-disable-next-line max-lines-per-function
export async function handleOutgoing(accountId: AccountId, indexerRow: IndexerRow): Promise<CsvRow> {
  const nearAmount = convertYoctoToNearAndConsiderSmallAmountsToBeZero(indexerRow);

  let ftAmountIn = '';
  let ftCurrencyIn = '';

  let ftAmountOut = '';
  let ftCurrencyOut = '';

  if (indexerRow.args?.method_name === 'ft_transfer') {
    if (indexerRow.args?.args_json?.amount && indexerRow.receipt_receiver_account_id) {
      const { symbol, decimals } = await getCurrencyByContractFromNear(indexerRow.receipt_receiver_account_id);
      const rawAmount = indexerRow.args?.args_json?.amount;

      ftCurrencyOut = symbol;
      ftAmountOut = divide(-1 * rawAmount, decimals);
    }
    // TODO Is the lack of `else` here intentional?
  } else if (indexerRow.args?.method_name === 'swap') {
    const tokenIn = await getCurrencyByContractFromNear(indexerRow.args?.args_json.actions[0].token_in);

    const rawAmountOut = indexerRow.args?.args_json?.actions[0].min_amount_out;
    ftCurrencyOut = tokenIn.symbol;
    ftAmountOut = divide(-1 * rawAmountOut, tokenIn.decimals);

    const tokenOut = await getCurrencyByContractFromNear(indexerRow.args?.args_json.actions[0].token_out);

    const rawAmountIn = indexerRow.args?.args_json?.actions[0].amount_in;
    ftCurrencyIn = tokenOut.symbol;
    ftAmountIn = divide(rawAmountIn, tokenOut.decimals);
  } else if (indexerRow.args?.method_name === 'ft_transfer_call') {
    // Gets arguments for function, converts from base64 if necessary
    const argsJson = getArgsAsObjectUsingBase64Fallback(indexerRow.args);

    if (argsJson.receiver_id?.includes(BULKSENDER_ACCOUNT_ID)) {
      const rawAmountOut = argsJson.amount;
      const { symbol, decimals } = await getCurrencyByContractFromNear(indexerRow.receipt_receiver_account_id);
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
      const { symbol, decimals } = await getCurrencyByContractFromNear(indexerRow.receipt_receiver_account_id);
      ftCurrencyOut = symbol;
      ftAmountOut = divide(-1 * rawAmount, decimals);
    }
  }

  const result: CsvRow = getRow(indexerRow, accountId, nearAmount, ftAmountIn, ftCurrencyIn, ftAmountOut, ftCurrencyOut);

  return result;
}
