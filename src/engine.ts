import { randomUUID } from 'node:crypto';
import {
  TemporalRecord,
  SetOptions,
  TemporalConfig,
  TemporalDiff,
  AuditVerificationResult
} from './types';
import { VaultCrypto } from './crypto';
import { TemporalIndex } from './index_engine';
import { VaultCompactor, CompactionReport } from './compactor';

export class ChronoVault {
  private records: Map<string, TemporalRecord[]> = new Map();
  private auditJournal: TemporalRecord[] = [];
  private recordMap: Map<string, TemporalRecord> = new Map();
  private timeIndex: TemporalIndex = new TemporalIndex();
  private crypto: VaultCrypto;
  private config: TemporalConfig;
  private lastHmac: string = '0000000000000000000000000000000000000000000000000000000000000000';

  constructor(config: TemporalConfig = {}) {
    this.config = config;
    this.crypto = new VaultCrypto(config.encryptionKey, config.hmacSecret);
  }

  public set<T>(key: string, value: T, options?: SetOptions): TemporalRecord<T> {
    const timestamp = Date.now();
    const shouldEncrypt = options?.encrypt ?? false;
    const history = this.records.get(key) || [];
    const version = history.length + 1;

    let storedValue: any = value;
    let iv: string | undefined;
    let authTag: string | undefined;

    if (shouldEncrypt) {
      const serialized = JSON.stringify(value);
      const encrypted = this.crypto.encrypt(serialized);
      storedValue = encrypted.ciphertext;
      iv = encrypted.iv;
      authTag = encrypted.authTag;
    }

    const payloadForHmac = `${key}:${version}:${timestamp}:${shouldEncrypt ? storedValue : JSON.stringify(storedValue)}`;
    const currentHmac = this.crypto.computeHmac(payloadForHmac, this.lastHmac);
    const previousHmac = this.lastHmac;
    this.lastHmac = currentHmac;

    const id = randomUUID();
    const record: TemporalRecord<any> = {
      id,
      key,
      value: storedValue,
      timestamp,
      version,
      encrypted: shouldEncrypt,
      iv,
      authTag,
      previousHmac,
      currentHmac
    };

    history.push(record);
    this.records.set(key, history);
    this.auditJournal.push(record);
    this.recordMap.set(id, record);
    this.timeIndex.insert(timestamp, id);

    return {
      ...record,
      value
    };
  }

  public get<T>(key: string): T | null {
    const history = this.records.get(key);
    if (!history || history.length === 0) return null;
    const latest = history[history.length - 1];
    return this.resolveValue<T>(latest);
  }

  public getAt<T>(key: string, timestamp: number): T | null {
    const history = this.records.get(key);
    if (!history || history.length === 0) return null;

    let matched: TemporalRecord | null = null;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].timestamp <= timestamp) {
        matched = history[i];
        break;
      }
    }

    if (!matched) return null;
    return this.resolveValue<T>(matched);
  }

  public timeline(key: string): Array<{ version: number; timestamp: number; encrypted: boolean }> {
    const history = this.records.get(key) || [];
    return history.map((r) => ({
      version: r.version,
      timestamp: r.timestamp,
      encrypted: r.encrypted
    }));
  }

  public findBetween(startTime: number, endTime: number): Array<{ key: string; timestamp: number; version: number }> {
    const ids = this.timeIndex.findRange(startTime, endTime);
    return ids.map((id) => {
      const rec = this.recordMap.get(id)!;
      return {
        key: rec.key,
        timestamp: rec.timestamp,
        version: rec.version
      };
    });
  }

  public diff<T>(key: string, t1: number, t2: number): TemporalDiff<T> {
    const [earlyTime, lateTime] = t1 <= t2 ? [t1, t2] : [t2, t1];
    const valEarly = this.getAt<T>(key, earlyTime);
    const valLate = this.getAt<T>(key, lateTime);

    const history = this.records.get(key) || [];
    const vEarly = history.find((r) => r.timestamp <= earlyTime)?.version ?? 0;
    const vLate = history.filter((r) => r.timestamp <= lateTime).slice(-1)[0]?.version ?? 0;

    return {
      key,
      fromTime: earlyTime,
      toTime: lateTime,
      oldValue: valEarly,
      newValue: valLate,
      versionDelta: Math.max(0, vLate - vEarly)
    };
  }

  public compact(maxAgeMs?: number, minSnapshotsRetained: number = 1): CompactionReport {
    return VaultCompactor.compact(this.records, maxAgeMs, minSnapshotsRetained);
  }

  public verifyIntegrity(): AuditVerificationResult {
    let prevHmac = '0000000000000000000000000000000000000000000000000000000000000000';

    for (let i = 0; i < this.auditJournal.length; i++) {
      const rec = this.auditJournal[i];
      if (rec.previousHmac !== prevHmac) {
        return {
          valid: false,
          totalRecordsChecked: i,
          tamperedRecordId: rec.id,
          errorMessage: `Chain broken at record index ${i}: mismatched previous HMAC`
        };
      }

      const payload = `${rec.key}:${rec.version}:${rec.timestamp}:${rec.encrypted ? rec.value : JSON.stringify(rec.value)}`;
      const expectedHmac = this.crypto.computeHmac(payload, prevHmac);

      if (rec.currentHmac !== expectedHmac) {
        return {
          valid: false,
          totalRecordsChecked: i,
          tamperedRecordId: rec.id,
          errorMessage: `Tampered payload detected at record ${rec.id}`
        };
      }

      prevHmac = rec.currentHmac;
    }

    return {
      valid: true,
      totalRecordsChecked: this.auditJournal.length
    };
  }

  public getRecordCount(): number {
    return this.auditJournal.length;
  }

  private resolveValue<T>(record: TemporalRecord): T {
    if (!record.encrypted) {
      return record.value as T;
    }

    const decrypted = this.crypto.decrypt(
      record.value as string,
      record.iv!,
      record.authTag!
    );
    return JSON.parse(decrypted) as T;
  }
}
