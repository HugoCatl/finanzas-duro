import { describe, it, expect } from 'vitest';
import { urlBase64ToUint8Array } from './keys';

describe('urlBase64ToUint8Array', () => {
  it('decodifica base64url sin padding', () => {
    // "hola" en base64url = "aG9sYQ"
    expect(Array.from(urlBase64ToUint8Array('aG9sYQ'))).toEqual([104, 111, 108, 97]);
  });
  it('acepta - y _', () => {
    expect(Array.from(urlBase64ToUint8Array('-_8'))).toEqual([251, 255]);
  });
});
