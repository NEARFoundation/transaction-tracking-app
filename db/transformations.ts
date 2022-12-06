/* eslint-disable unicorn/no-abusive-eslint-disable */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint no-use-before-define: "error"*/
/* eslint-disable canonical/sort-keys */
import * as nearAPI from 'near-api-js';

import { type CsvRow, type IndexerRow } from '..'; // https://docs.near.org/tools/near-api-js/quick-reference#yoctonear--near
import { formatDateFromNano } from '../external/datetime';
import { divideByPowerOfTen } from '../external/fungibleTokenTools';
import { type AccountId, getCurrencyByContractFromNear } from '../helpers/currency';

const { utils } = nearAPI;
const SYSTEM_ACCOUNT_ID = 'system';
const BULKSENDER_ACCOUNT_ID = 'bulksender.near';
const MINIMUM_AMOUNT_FOR_SYSTEM_ACCOUNT = 0.5;
/* This number is a fudge factor that was determined by trial and error to make transaction reconciliation work easier. 
We need to figure out why this is necessary and document this better. */
const MINIMUM_AMOUNT = 0.000_001;

const STAKING_ACCOUNT_SUFFIX = '.poolv1.near';

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

/**
 * The SQL query gets all transactions, including those that are gas refunds.
 * Gas refunds are already included in the total amount of NEAR transferred, so we filter them out here.
 * Warning: this function contains a conversion of a NEAR amount from string to `number`, which can cause precision loss!
 */
export function convertYoctoToNearAndConsiderSmallAmountsToBeZero(deposit: string): number {
  const depositInNear = utils.format.formatNearAmount(deposit); // converting from yoctonear to near
  const depositInNearAsNumber = Number(depositInNear); // Warning: precision loss!
  return Math.abs(depositInNearAsNumber) >= MINIMUM_AMOUNT ? depositInNearAsNumber : 0;
}

export function getFinalCsvRow(
  indexerRow: IndexerRow,
  accountId: AccountId,
  nearAmount: number,
  ftAmountIn: string,
  ftCurrencyIn: string,
  ftAmountOut = '',
  ftCurrencyOut = '',
): CsvRow {
  return {
    // Disabling the automatic key sorting since the order of the CSV columns is important.
    datetime_utc: formatDateFromNano(indexerRow.block_timestamp),
    account_id: accountId,
    method_name: String(indexerRow.action_kind === 'TRANSFER' ? 'transfer' : indexerRow.args?.method_name),
    block_timestamp: indexerRow.block_timestamp,
    from_account: indexerRow.receipt_predecessor_account_id,
    block_height: indexerRow.block_height,
    args_json: JSON.stringify(indexerRow.args.args_json) ?? '',
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

/**
 * Handles the transactions that are incoming to the account
 */
export async function convertIncomingTransactionsFromIndexerToCsvRow(accountId: AccountId, indexerRow: IndexerRow): Promise<CsvRow> {
  let nearAmount = convertYoctoToNearAndConsiderSmallAmountsToBeZero(indexerRow.args.deposit);
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
    inAmount = divideByPowerOfTen(rawAmount, decimals);
  }

  const result: CsvRow = getFinalCsvRow(indexerRow, accountId, nearAmount, inAmount, inCurrency);

  return result;
}

async function getOutgoingFungibleTokenDetailsFromIndexerRow(indexerRow: IndexerRow): Promise<{ ftAmountOut: string; ftCurrencyOut: string }> {
  let ftAmountOut = '';
  let ftCurrencyOut = '';

  if (indexerRow.args?.args_json?.amount && indexerRow.receipt_receiver_account_id) {
    const { symbol, decimals } = await getCurrencyByContractFromNear(indexerRow.receipt_receiver_account_id);
    const rawAmount = indexerRow.args?.args_json?.amount;

    ftCurrencyOut = symbol;
    ftAmountOut = divideByPowerOfTen(-1 * rawAmount, decimals);
  }

  return { ftAmountOut, ftCurrencyOut };
}

// eslint-disable-next-line max-lines-per-function
export async function convertOutgoingTransactionsFromIndexerToCsvRow(accountId: AccountId, indexerRow: IndexerRow): Promise<CsvRow> {
  const nearAmount = -1 * convertYoctoToNearAndConsiderSmallAmountsToBeZero(indexerRow.args.deposit);

  let ftAmountIn = '';
  let ftCurrencyIn = '';

  let ftAmountOut = '';
  let ftCurrencyOut = '';

  if (indexerRow.args?.method_name === 'ft_transfer') {
    ({ ftAmountOut, ftCurrencyOut } = await getOutgoingFungibleTokenDetailsFromIndexerRow(indexerRow));
  } else if (indexerRow.args?.method_name === 'swap') {
    const tokenIn = await getCurrencyByContractFromNear(indexerRow.args?.args_json?.actions[0].token_in);
    const rawAmountOut = indexerRow.args?.args_json?.actions[0].min_amount_out;
    ftCurrencyOut = tokenIn.symbol;
    ftAmountOut = divideByPowerOfTen(-1 * rawAmountOut, tokenIn.decimals);
    const tokenOut = await getCurrencyByContractFromNear(indexerRow.args?.args_json?.actions[0].token_out);

    const rawAmountIn = indexerRow.args?.args_json?.actions[0].amount_in;
    ftCurrencyIn = tokenOut.symbol;
    ftAmountIn = divideByPowerOfTen(rawAmountIn, tokenOut.decimals);
  } else if (indexerRow.args?.method_name === 'ft_transfer_call') {
    // Gets arguments for function, converts from base64 if necessary
    const argsJson = indexerRow.args?.args_json;

    if (argsJson.receiver_id?.includes(BULKSENDER_ACCOUNT_ID)) {
      const rawAmountOut = argsJson.amount;
      const { symbol, decimals } = await getCurrencyByContractFromNear(indexerRow.receipt_receiver_account_id);
      ftCurrencyOut = symbol;
      ftAmountOut = divideByPowerOfTen(-1 * rawAmountOut, decimals);
    } else if (argsJson.msg?.includes('force')) {
      const message = JSON.parse(argsJson.msg?.replaceAll('\\', ''));
      const rawAmountOut = argsJson.amount;
      const tokenIn = await getCurrencyByContractFromNear(message.actions[0].token_in);
      ftCurrencyOut = tokenIn.symbol;
      ftAmountOut = divideByPowerOfTen(-1 * rawAmountOut, tokenIn.decimals);
      const tokenOut = await getCurrencyByContractFromNear(message.actions[0].token_out);
      const rawAmountIn = message.actions[0].min_amount_out;
      ftCurrencyIn = tokenOut.symbol;
      ftAmountIn = divideByPowerOfTen(rawAmountIn, tokenOut.decimals);
    } else {
      const rawAmount = argsJson.amount;
      const { symbol, decimals } = await getCurrencyByContractFromNear(indexerRow.receipt_receiver_account_id);
      ftCurrencyOut = symbol;
      ftAmountOut = divideByPowerOfTen(-1 * rawAmount, decimals);
    }
  }

  const result: CsvRow = getFinalCsvRow(indexerRow, accountId, nearAmount, ftAmountIn, ftCurrencyIn, ftAmountOut, ftCurrencyOut);

  return result;
}

/**
 * Fungible tokens
 */

// eslint-disable-next-line max-lines-per-function
export async function convertIncomingFungibleTokenTransactionsFromIndexerToCsvRow(accountId: AccountId, row: IndexerRow): Promise<CsvRow> {
  const toAccount = row.receiver_account_id;
  let nearAmount = convertYoctoToNearAndConsiderSmallAmountsToBeZero(row.args.deposit);
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
    // TODO: Reduce duplication with `getFinalCsvRow`.
    datetime_utc: formatDateFromNano(row.block_timestamp),
    account_id: accountId,
    method_name: String(row.action_kind === 'TRANSFER' ? 'transfer' : row.args?.method_name),
    block_timestamp: row.block_timestamp,
    from_account: row.receipt_predecessor_account_id,
    block_height: row.block_height,
    args_json: JSON.stringify(row.args?.args_json),
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
