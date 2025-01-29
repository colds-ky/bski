// @ts-check

/**
 * @param {Uint8Array} aa
 * @param {Uint8Array} bb
 */
export function equals (aa, bb) {
  if (aa === bb) return true
  if (aa.byteLength !== bb.byteLength) {
    return false
  }

  for (let ii = 0; ii < aa.byteLength; ii++) {
    if (aa[ii] !== bb[ii]) {
      return false
    }
  }

  return true
}

/**
 * @param {ArrayBufferView | ArrayBuffer | Uint8Array} o
 * @returns {Uint8Array}
 */
export function coerce (o) {
  if (o instanceof Uint8Array && o.constructor.name === 'Uint8Array') return o
  if (o instanceof ArrayBuffer) return new Uint8Array(o)
  if (ArrayBuffer.isView(o)) {
    return new Uint8Array(o.buffer, o.byteOffset, o.byteLength)
  }
  throw new Error('Unknown type, must be binary type')
}
