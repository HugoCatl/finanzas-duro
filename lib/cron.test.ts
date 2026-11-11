import { describe, it, expect } from 'vitest';
import { isAuthorizedCron } from './cron';

const req = (auth?: string) => new Request('http://x/api/cron/nightly', { headers: auth ? { authorization: auth } : {} });

describe('isAuthorizedCron', () => {
  it('acepta el Bearer correcto', () => expect(isAuthorizedCron(req('Bearer s3cret'), 's3cret')).toBe(true));
  it('rechaza un secreto incorrecto o ausente', () => {
    expect(isAuthorizedCron(req('Bearer nope'), 's3cret')).toBe(false);
    expect(isAuthorizedCron(req(), 's3cret')).toBe(false);
  });
  it('rechaza todo si no hay secreto configurado', () => {
    expect(isAuthorizedCron(req('Bearer undefined'), undefined)).toBe(false);
  });
});
