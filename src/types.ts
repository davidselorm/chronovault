export interface TemporalRecord<T = unknown> {
  id: string;
  key: string;
  value: T;
  timestamp: number; // Unix epoch in ms
  version: number;
  encrypted: boolean;
  iv?: string; // hex
  authTag?: string; // hex
  previousHmac?: string; // hex
  currentHmac: string; // hex
}

export interface SetOptions {
  encrypt?: boolean;
  ttlMs?: number;
}

export interface TemporalConfig {
  encryptionKey?: string; // 32 bytes hex or string
  hmacSecret?: string;
  defaultTtlMs?: number;
  autoPruneIntervalMs?: number;
}

export interface TemporalDiff<T = unknown> {
  key: string;
  fromTime: number;
  toTime: number;
  oldValue: T | null;
  newValue: T | null;
  versionDelta: number;
}

export interface AuditVerificationResult {
  valid: boolean;
  totalRecordsChecked: number;
  tamperedRecordId?: string;
  errorMessage?: string;
}
