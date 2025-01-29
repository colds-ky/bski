// @ts-check

import { fromBase64, toBase64 } from '../multibase/base64';

export class BytesWrapper {
  buf;
  constructor(buf) {
    this.buf = buf;
  }
  get $bytes() {
    return toBase64(this.buf);
  }
  toJSON() {
    return { $bytes: this.$bytes };
  }
}
export const toBytes = (buf) => {
  return new BytesWrapper(buf);
};
export const fromBytes = (bytes) => {
  if (bytes instanceof BytesWrapper) {
    return bytes.buf;
  }
  return fromBase64(bytes.$bytes);
};

