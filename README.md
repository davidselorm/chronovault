# ChronoVault ⏳🔒
> High-throughput temporal snapshot and cryptographic time-series key-value engine.

ChronoVault provides zero-dependency, tamper-evident state storage with point-in-time recovery (PITR), time-series delta tracking, and cryptographic auditability.

## Features
- **Temporal Key-Value Engine**: Query the exact state of any key at any microsecond in history.
- **Envelope Encryption**: AES-256-GCM payload encryption with HMAC integrity verification.
- **Append-Only Write Journal**: Crash-resilient write-ahead logging (WAL).
- **Automated TTL & Compaction**: Automatic reclamation of expired temporal slices.
