// @ts-check

export const reader = {
    decode,
    bytes: 0
  };

  /**
   * @param {{ [i: number]: number, length: number }} buf
   * @param {number} [offset]
   */
function decode(buf, offset) {
  let res = 0;
  offset = offset || 0;
  let shift = 0;
  let counter = offset;
  let b;
  let l = buf.length

  do {
    if (counter >= l || shift > 49) {
      reader.bytes = 0
      throw new RangeError('Could not decode varint')
    }

    b = buf[counter++]
    res += shift < 28
      ? (b & 0x7F /* REST */) << shift
      : (b & 0x7F /* REST */) * Math.pow(2, shift)
    shift += 7
  } while (b >= 0x80 /* MSB */)

  reader.bytes = counter - offset

  return res
}