/**
 * Dividing by a power of 10 simply moves the decimal to the left the same number of places as the exponent.
 * Fungible token amounts are reported in their smallest undividable amount of native currency (e.g. yoctoNEAR for NEAR).
 * This function allows us to convert to the base unit of the token.
 */
export function divideByPowerOfTen(rawAmount: number, exponent: number): string {
  return String(rawAmount / 10 ** exponent);
}
