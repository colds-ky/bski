export const decodeErrPrefix = 'CBOR decode error:'

/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} need
 */
export function assertEnoughData(data, pos, need) {
  if (data.length - pos < need) {
    throw new Error(`${decodeErrPrefix} not enough data for type`)
  }
}
