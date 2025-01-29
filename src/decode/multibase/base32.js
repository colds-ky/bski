// @ts-check

import { createRfc4648Decode, createRfc4648Encode } from './utils';

const BASE32_CHARSET = 'abcdefghijklmnopqrstuvwxyz234567';
export const fromBase32 = /*#__PURE__*/ createRfc4648Decode(BASE32_CHARSET, 5, false);
export const toBase32 = /*#__PURE__*/ createRfc4648Encode(BASE32_CHARSET, 5, false);
