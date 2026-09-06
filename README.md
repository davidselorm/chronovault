# ChronoVault ⏳🔒
> High-throughput temporal snapshot and cryptographic time-series key-value engine.

![Status](https://img.shields.io/badge/ChronoVault-Active-10b981?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript_5.5-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Zero_Dependencies](https://img.shields.io/badge/Dependencies-Zero-blue?style=for-the-badge)

ChronoVault provides microsecond-precise temporal state travel with point-in-time recovery (PITR), AES-256-GCM envelope encryption, and SHA-256 HMAC cryptographic tamper verification.

---

## ⚡ Key Highlights

- **Microsecond Temporal Travel**: Query `getAt(key, timestamp)` to query exact states at any epoch millisecond.
- **Envelope Encryption**: End-to-end AES-256-GCM authenticated payload encryption.
- **Immutable HMAC Journal Chaining**: Blockchain-like write-ahead log hash integrity validation (`verifyIntegrity()`).
- **Temporal State Diffing**: Compare any key across time with `diff(key, t1, t2)`.

---

## 🚀 Quickstart

```typescript
import { ChronoVault } from 'chronovault';

const vault = new ChronoVault({
  encryptionKey: 'your-32-byte-master-encryption-key',
});

// Set temporal values
vault.set('user.session', { tier: 'free' });
const t1 = Date.now();

vault.set('user.session', { tier: 'pro' });

// Current value
console.log(vault.get('user.session')); // { tier: 'pro' }

// Rewind to timestamp t1
console.log(vault.getAt('user.session', t1)); // { tier: 'free' }

// Cryptographic audit check
const audit = vault.verifyIntegrity();
console.log(audit.valid); // true
```

---

## 📄 License
MIT © 2026 [davidselorm](https://github.com/davidselorm)
