// @ts-check

export const allocUnsafe = (size) => {
  return new Uint8Array(size);
};

export const createRfc4648Encode = (alphabet, bitsPerChar, pad) => {
  return (bytes) => {
    const mask = (1 << bitsPerChar) - 1;
    let str = '';
    let bits = 0; // Number of bits currently in the buffer
    let buffer = 0; // Bits waiting to be written out, MSB first
    for (let i = 0; i < bytes.length; ++i) {
      // Slurp data into the buffer:
      buffer = (buffer << 8) | bytes[i];
      bits += 8;
      // Write out as much as we can:
      while (bits > bitsPerChar) {
        bits -= bitsPerChar;
        str += alphabet[mask & (buffer >> bits)];
      }
    }
    // Partial character:
    if (bits !== 0) {
      str += alphabet[mask & (buffer << (bitsPerChar - bits))];
    }
    // Add padding characters until we hit a byte boundary:
    if (pad) {
      while (((str.length * bitsPerChar) & 7) !== 0) {
        str += '=';
      }
    }
    return str;
  };
};

export const createRfc4648Decode = (alphabet, bitsPerChar, pad) => {
  // Build the character lookup table:
  const codes = {};
  for (let i = 0; i < alphabet.length; ++i) {
    codes[alphabet[i]] = i;
  }
  return (str) => {
    // Count the padding bytes:
    let end = str.length;
    while (pad && str[end - 1] === '=') {
      --end;
    }
    // Allocate the output:
    const bytes = allocUnsafe(((end * bitsPerChar) / 8) | 0);
    // Parse the data:
    let bits = 0; // Number of bits currently in the buffer
    let buffer = 0; // Bits waiting to be written out, MSB first
    let written = 0; // Next byte to write
    for (let i = 0; i < end; ++i) {
      // Read one character from the string:
      const value = codes[str[i]];
      if (value === undefined) {
        throw new SyntaxError(`invalid base string`);
      }
      // Append the bits to the buffer:
      buffer = (buffer << bitsPerChar) | value;
      bits += bitsPerChar;
      // Write out some bits if the buffer has a byte's worth:
      if (bits >= 8) {
        bits -= 8;
        bytes[written++] = 0xff & (buffer >> bits);
      }
    }
    // Verify that we have received just enough bits:
    if (bits >= bitsPerChar || (0xff & (buffer << (8 - bits))) !== 0) {
      throw new SyntaxError('unexpected end of data');
    }
    return bytes;
  };
};