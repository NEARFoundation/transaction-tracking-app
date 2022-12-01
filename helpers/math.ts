import { type IndexerRow } from '../db/Row';

const MINIMUM_AMOUNT = 0.000_001;
export const YOCTO_CONVERSION_CONSTANT = 10 ** 24;

export function divide(rawAmount: number, decimals: number): string {
  // TODO: Document what is happening and why (and improve the function name).
  return String(rawAmount / 10 ** decimals);
}

export function convertYoctoToNearAndConsiderSmallAmountsToBeZero(indexerRow: IndexerRow): number {
  let nearAmount = indexerRow.args?.deposit ? indexerRow.args.deposit / YOCTO_CONVERSION_CONSTANT : 0; // converting from yoctonear to near
  // Round very small transfers down to 0. TODO: Document why this is a good idea or a requirement. Consider improving the name of the constant.
  nearAmount = Math.abs(nearAmount) >= MINIMUM_AMOUNT ? nearAmount : 0;
  return nearAmount;
}
