// @ts-check

import { createUint8Reader } from './utilities/byte-reader';
import { createCarReader } from './utilities/sync-car-reader';

/** @param {Uint8Array} buffer */
export const readCar = (buffer) => {
  const reader = createUint8Reader(buffer);
  return createCarReader(reader);
};
