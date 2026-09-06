import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ChronoVault } from '../engine';

describe('ChronoVault Temporal Engine', () => {
  it('should store and retrieve current values', () => {
    const vault = new ChronoVault();
    vault.set('config.host', '127.0.0.1');
    vault.set('config.host', '10.0.0.1');

    assert.strictEqual(vault.get('config.host'), '10.0.0.1');
  });

  it('should accurately rewind state using getAt()', async () => {
    const vault = new ChronoVault();
    const t0 = Date.now();
    vault.set('user.status', 'offline');

    await new Promise((r) => setTimeout(r, 20));
    const t1 = Date.now();
    vault.set('user.status', 'online');

    await new Promise((r) => setTimeout(r, 20));
    vault.set('user.status', 'busy');

    assert.strictEqual(vault.getAt('user.status', t0), 'offline');
    assert.strictEqual(vault.getAt('user.status', t1), 'online');
    assert.strictEqual(vault.get('user.status'), 'busy');
  });

  it('should encrypt and decrypt payloads with AES-256-GCM', () => {
    const vault = new ChronoVault({ encryptionKey: 'my-super-secret-32-byte-master' });
    vault.set('auth.token', { token: 'jwt-xyz-123' }, { encrypt: true });

    const decrypted = vault.get<{ token: string }>('auth.token');
    assert.deepStrictEqual(decrypted, { token: 'jwt-xyz-123' });
  });

  it('should verify audit journal integrity via HMAC chaining', () => {
    const vault = new ChronoVault();
    vault.set('k1', 'val1');
    vault.set('k2', 'val2');
    vault.set('k1', 'val1-updated');

    const result = vault.verifyIntegrity();
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.totalRecordsChecked, 3);
  });
});
