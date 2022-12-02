import { type IndexerRow } from '../db/Row';

const MINIMUM_AMOUNT = 0.000_001;
export const YOCTO_CONVERSION_CONSTANT = 10 ** 24;

/**
 * Dividing by a power of 10 simply moves the decimal to the left the same number of places as the exponent.
 * Fungible token amounts are reported in their smallest undividable amount of native currency (e.g. yoctoNEAR for NEAR).
 * This function allows us to convert to the base unit of the token.
 */
export function divideByPowerOfTen(rawAmount: number, exponent: number): string {
  return String(rawAmount / 10 ** exponent);
}

/**
 * The SQL query gets all transactions, including those that are gas refunds.
 * Gas refunds are already included in the total amount of NEAR transferred, so we filter them out here.
 */
export function convertYoctoToNearAndConsiderSmallAmountsToBeZero(indexerRow: IndexerRow): number {
  let nearAmount = indexerRow.args?.deposit ? indexerRow.args.deposit / YOCTO_CONVERSION_CONSTANT : 0; // converting from yoctonear to near
  nearAmount = Math.abs(nearAmount) >= MINIMUM_AMOUNT ? nearAmount : 0;
  return nearAmount;
}
