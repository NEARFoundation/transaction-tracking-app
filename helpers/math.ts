import { type IndexerRow } from '../db/Row';

const MINIMUM_AMOUNT = 0.000_001;
export const YOCTO_CONVERSION_CONSTANT = 10 ** 24;

/**
 * Dividing by a power of 10 simply moves the decimal to the left the same number of places as the exponent.
 * TODO: Document why / when this is useful / necessary.
 */
export function divideByPowerOfTen(rawAmount: number, exponent: number): string {
  return String(rawAmount / 10 ** exponent);
}

export function convertYoctoToNearAndConsiderSmallAmountsToBeZero(indexerRow: IndexerRow): number {
  let nearAmount = indexerRow.args?.deposit ? indexerRow.args.deposit / YOCTO_CONVERSION_CONSTANT : 0; // converting from yoctonear to near
  // Round very small transfers down to 0. TODO: Document why this is a good idea or a requirement. Consider improving the name of the constant.
  nearAmount = Math.abs(nearAmount) >= MINIMUM_AMOUNT ? nearAmount : 0;
  return nearAmount;
}
