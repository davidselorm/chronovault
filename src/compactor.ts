import { TemporalRecord } from './types';

export interface CompactionReport {
  prunedCount: number;
  remainingCount: number;
  reclaimedBytesEstimate: number;
}

export class VaultCompactor {
  public static compact(
    records: Map<string, TemporalRecord[]>,
    maxAgeMs?: number,
    minSnapshotsRetained: number = 1
  ): CompactionReport {
    let pruned = 0;
    let remaining = 0;
    const now = Date.now();
    const threshold = maxAgeMs ? now - maxAgeMs : -1;

    for (const [key, history] of records.entries()) {
      if (history.length <= minSnapshotsRetained) {
        remaining += history.length;
        continue;
      }

      const kept: TemporalRecord[] = [];
      const alwaysKeep = history.slice(-minSnapshotsRetained);
      const candidates = history.slice(0, -minSnapshotsRetained);

      for (const rec of candidates) {
        if (threshold > 0 && rec.timestamp < threshold) {
          pruned++;
        } else {
          kept.push(rec);
        }
      }

      const newHistory = [...kept, ...alwaysKeep];
      records.set(key, newHistory);
      remaining += newHistory.length;
    }

    return {
      prunedCount: pruned,
      remainingCount: remaining,
      reclaimedBytesEstimate: pruned * 256
    };
  }
}
