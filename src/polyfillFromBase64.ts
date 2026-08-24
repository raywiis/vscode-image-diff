//@ts-nocheck

const { defineProperty } = Object;
const { prototype } = Uint8Array;

const base64 = 'base64';
const toBase64 = 'toBase64';
const fromBase64 = 'fromBase64';

if (!(toBase64 in prototype)) {
  const { fromCharCode } = String;
  const url = c => c === '+' ? '-' : '_';
  const options = { alphabet: base64, omitPadding: false };
  defineProperty(prototype, toBase64, {
    configurable: true,
    writable: true,
    value({
      alphabet = options.alphabet,
      omitPadding = options.omitPadding,
    } = options) {
      let out = '';
      for (let spread = 2000, i = 0; i < this.length; i += spread)
        out += fromCharCode(...this.subarray(i, i + spread));
      out = btoa(out);
      if (omitPadding) out = out.replace(/=+$/, '');
      if (alphabet !== base64) out = out.replace(/[+/]/g, url);
      return out;
    },
  });
}

if (!(fromBase64 in Uint8Array)) {
  const base = c => c === '-' ? '+' : '/';
  const options = { alphabet: base64, lastChunkHandling: 'loose' };
  defineProperty(Uint8Array, fromBase64, {
    configurable: true,
    writable: true,
    value(string, {
      alphabet = options.alphabet,
      lastChunkHandling = options.lastChunkHandling,
    } = options) {
      if (lastChunkHandling !== 'loose') throw new Error('lastChunkHandling not supported');
      if (alphabet !== base64) string = string.replace(/[-_]/g, base);
      let s = atob(string), i = 0, l = s.length, out = new Uint8Array(l);
      while (i < l) out[i] = s.charCodeAt(i++);
      return out;
    },
  });
}