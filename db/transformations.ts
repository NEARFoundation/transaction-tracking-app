/* eslint-disable unicorn/no-abusive-eslint-disable */
/* eslint-disable eslint-comments/no-unlimited-disable */

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
    date: formatDateFromNano(indexerRow.block_timestamp),
    account_id: accountId,
    method_name: String(indexerRow.action_kind === 'TRANSFER' ? 'transfer' : indexerRow.args?.method_name),
    block_timestamp: indexerRow.block_timestamp,
    from_account: indexerRow.receipt_predecessor_account_id,
    block_height: indexerRow.block_height,
    args: JSON.stringify(getArgsAsObjectUsingBase64Fallback(indexerRow.args)),
    transaction_hash: indexerRow.transaction_hash,
    amount_transferred: nearAmount,
    // Fungible Token
    ft_amount_out: ftAmountOut,
    ft_currency_out: ftCurrencyOut,
    ft_amount_in: ftAmountIn,
    ft_currency_in: ftCurrencyIn,
    to_account: indexerRow.receipt_receiver_account_id,
    amount_staked: getNearAmountConsideringStaking(indexerRow, nearAmount),
  };
}

// Fungible tokens are given in their smallest undividable amount of native currency (yoctoNEAR for NEAR)
// This function converts the amount to the correct amount of the currency
function convertToCurrency(rawAmount: number, decimals: number): string {
  return String(rawAmount / 10 ** decimals);
}

function convertYoctoToNearAndConsiderSmallAmountsToBeZero(indexerRow: IndexerRow): number {
  let nearAmount = indexerRow.args?.deposit ? indexerRow.args.deposit / YOCTO_CONVERSION_CONSTANT : 0; // converting from yoctonear to near
  // The SQL query gets all transactions, including those that are gas refund.
  // Gas refunds are already included in the total amount of NEAR transferred, so we filter them out here.
  nearAmount = Math.abs(nearAmount) >= MINIMUM_AMOUNT ? nearAmount : 0;
  return nearAmount;
}

// Handles the transactions that are incoming to the account
export async function handleIncomingTransaction(accountId: AccountId, indexerRow: IndexerRow): Promise<CsvRow> {
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
    inAmount = convertToCurrency(rawAmount, decimals);
  }

  const result: CsvRow = getRow(indexerRow, accountId, nearAmount, inAmount, inCurrency);

  return result;
}

// eslint-disable-next-line max-lines-per-function
export async function handleOutgoingTransaction(accountId: AccountId, indexerRow: IndexerRow): Promise<CsvRow> {
  const nearAmount = convertYoctoToNearAndConsiderSmallAmountsToBeZero(indexerRow);

  let ftAmountIn = '';
  let ftCurrencyIn = '';

  let ftAmountOut = '';
  let ftCurrencyOut = '';

  if (indexerRow.args?.method_name === 'ft_transfer') {
    ({ ftAmountOut, ftCurrencyOut } = await handleFtOutgoing(indexerRow));
  } else if (indexerRow.args?.method_name === 'swap') {
    const tokenIn = await getCurrencyByContractFromNear(indexerRow.args?.args_json.actions[0].token_in);

    const rawAmountOut = indexerRow.args?.args_json?.actions[0].min_amount_out;
    ftCurrencyOut = tokenIn.symbol;
    ftAmountOut = convertToCurrency(-1 * rawAmountOut, tokenIn.decimals);

    const tokenOut = await getCurrencyByContractFromNear(indexerRow.args?.args_json.actions[0].token_out);

    const rawAmountIn = indexerRow.args?.args_json?.actions[0].amount_in;
    ftCurrencyIn = tokenOut.symbol;
    ftAmountIn = convertToCurrency(rawAmountIn, tokenOut.decimals);
  } else if (indexerRow.args?.method_name === 'ft_transfer_call') {
    // Gets arguments for function, converts from base64 if necessary
    const argsJson = getArgsAsObjectUsingBase64Fallback(indexerRow.args);

    if (argsJson.receiver_id?.includes(BULKSENDER_ACCOUNT_ID)) {
      const rawAmountOut = argsJson.amount;
      const { symbol, decimals } = await getCurrencyByContractFromNear(indexerRow.receipt_receiver_account_id);
      ftCurrencyOut = symbol;
      ftAmountOut = convertToCurrency(-1 * rawAmountOut, decimals);
    } else if (argsJson.msg?.includes('force')) {
      const message = JSON.parse(argsJson.msg?.replaceAll('\\', ''));
      const rawAmountOut = argsJson.amount;
      const tokenIn = await getCurrencyByContractFromNear(message.actions[0].token_in);
      ftCurrencyOut = tokenIn.symbol;
      ftAmountOut = convertToCurrency(-1 * rawAmountOut, tokenIn.decimals);
      const tokenOut = await getCurrencyByContractFromNear(message.actions[0].token_out);
      const rawAmountIn = message.actions[0].min_amount_out;
      ftCurrencyIn = tokenOut.symbol;
      ftAmountIn = convertToCurrency(rawAmountIn, tokenOut.decimals);
    } else {
      const rawAmount = argsJson.amount;
      const { symbol, decimals } = await getCurrencyByContractFromNear(indexerRow.receipt_receiver_account_id);
      ftCurrencyOut = symbol;
      ftAmountOut = convertToCurrency(-1 * rawAmount, decimals);
    }
  }

  const result: CsvRow = getRow(indexerRow, accountId, nearAmount, ftAmountIn, ftCurrencyIn, ftAmountOut, ftCurrencyOut);

  return result;
}

/**
 * Fungible tokens
 */

// eslint-disable-next-line max-lines-per-function
export async function handleFtIncoming(accountId: AccountId, row: IndexerRow): Promise<CsvRow> {
  const toAccount = row.receiver_account_id;
  let nearAmount = row.args?.deposit ? row.args.deposit / YOCTO_CONVERSION_CONSTANT : 0;
  nearAmount = Math.abs(nearAmount) >= 0.000_001 ? nearAmount : 0;
  // Gas refund are already accounted in other transactions.
  if (row.receipt_predecessor_account_id === 'system') {
    nearAmount = Math.abs(nearAmount) >= MINIMUM_AMOUNT_FOR_SYSTEM_ACCOUNT ? nearAmount : 0;
  }

  let inAmount = '';
  let inCurrency = '';
  if (row.args?.args_json?.amount && row.receipt_receiver_account_id) {
    const { symbol, decimals } = await getCurrencyByContractFromNear(row.receipt_receiver_account_id);
    inCurrency = symbol;

    const rawAmount = row.args?.args_json?.amount;
    inAmount = String(rawAmount / 10 ** decimals);
  }

  // Removed because it takes too much time.
  // const ft_balances = await getBalances(accountId, row.block_height);

  const csvRow: CsvRow = {
    date: formatDateFromNano(row.block_timestamp),
    account_id: accountId,
    method_name: String(row.action_kind === 'TRANSFER' ? 'transfer' : row.args?.method_name),
    block_timestamp: row.block_timestamp,
    from_account: row.receipt_predecessor_account_id,
    block_height: row.block_height,
    args: JSON.stringify(getArgsAsObjectUsingBase64Fallback(row.args)),
    transaction_hash: row.transaction_hash,
    // NEAR tokens
    amount_transferred: nearAmount,
    // Fugible Token
    ft_amount_out: '',
    ft_currency_out: '',
    ft_amount_in: inAmount,
    ft_currency_in: inCurrency,
    to_account: toAccount,
    amount_staked: getNearAmountConsideringStaking(row, nearAmount),
  };

  return csvRow;
}

async function handleFtOutgoing(indexerRow: IndexerRow): Promise<{ ftAmountOut: string; ftCurrencyOut: string }> {
  let ftAmountOut = '';
  let ftCurrencyOut = '';

  if (indexerRow.args?.args_json?.amount && indexerRow.receipt_receiver_account_id) {
    const { symbol, decimals } = await getCurrencyByContractFromNear(indexerRow.receipt_receiver_account_id);
    const rawAmount = indexerRow.args?.args_json?.amount;

    ftCurrencyOut = symbol;
    ftAmountOut = convertToCurrency(-1 * rawAmount, decimals);
  }

  return { ftAmountOut, ftCurrencyOut };
}
