import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ChronoVault } from '../engine';

describe('ChronoVault Compaction & Range Indexing', () => {
  it('should find records within a specific time range', async () => {
    const vault = new ChronoVault();
    const tStart = Date.now();

    vault.set('metric.cpu', 45);
    await new Promise((r) => setTimeout(r, 15));
    const tMid = Date.now();
    vault.set('metric.cpu', 72);
    await new Promise((r) => setTimeout(r, 15));
    const tEnd = Date.now();

    const range = vault.findBetween(tStart, tMid + 5);
    assert.ok(range.length >= 1);
  });

  it('should compact historical snapshots while retaining min count', () => {
    const vault = new ChronoVault();
    vault.set('state', 'v1');
    vault.set('state', 'v2');
    vault.set('state', 'v3');
    vault.set('state', 'v4');

    const report = vault.compact(0, 2);
    assert.strictEqual(report.remainingCount, 2);
    assert.strictEqual(report.prunedCount, 2);
    assert.strictEqual(vault.get('state'), 'v4');
  });
});
