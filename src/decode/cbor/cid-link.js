// @ts-check

import { decode, parse } from './cid';
import { toBase32 } from '../multibase/base32';
class CIDLinkWrapper {
  $bytes;
  constructor($bytes) {
    this.$bytes = $bytes;
  }
  get $cid() {
    return decode(this.$bytes);
  }
  get $link() {
    return 'b' + toBase32(this.$bytes);
  }
  toJSON() {
    return { $link: this.$link };
  }
}
export const toCIDLink = (value) => {
  return 'b' + toBase32(value.bytes || value);
  if (value instanceof Uint8Array) {
    return 'b' + toBase32(value);
    return new CIDLinkWrapper(value);
  }
  return 'b' + toBase32(value.bytes);
  return new CIDLinkWrapper(value.bytes);
};

export const fromCIDLink = (link) => {
  if (link instanceof CIDLinkWrapper) {
    return link.$cid;
  }
  return parse(link.$link);
};
//# sourceMappingURL=cid-link.js.map