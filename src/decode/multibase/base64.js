// @ts-check

import { createRfc4648Decode, createRfc4648Encode } from './utils';

const BASE64_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const HAS_UINT8_BASE64_SUPPORT = 'fromBase64' in Uint8Array;

export const _fromBase64Polyfill = /*#__PURE__*/ createRfc4648Decode(BASE64_CHARSET, 6, false);

export const _toBase64Polyfill = /*#__PURE__*/ createRfc4648Encode(BASE64_CHARSET, 6, false);

const WS_PAD_RE = /[\s=]/;

export const _fromBase64Native = (str) => {
  if (str.length % 4 === 1 || WS_PAD_RE.test(str)) {
    throw new SyntaxError(`invalid base64 string`);
  }
  return /** @type {*} */(Uint8Array).fromBase64(str, { alphabet: 'base64', lastChunkHandling: 'loose' });
};

export const _toBase64Native = (bytes) => {
  return bytes.toBase64({ alphabet: 'base64', omitPadding: true });
};

export const fromBase64 = !HAS_UINT8_BASE64_SUPPORT ? _fromBase64Polyfill : _fromBase64Native;

export const toBase64 = !HAS_UINT8_BASE64_SUPPORT ? _toBase64Polyfill : _toBase64Native;
