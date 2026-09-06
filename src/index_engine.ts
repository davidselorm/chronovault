export class TemporalIndex {
  private timestamps: number[] = [];
  private recordIds: string[] = [];

  public insert(timestamp: number, recordId: string): void {
    // Binary search for insertion point to maintain sorted order O(log n)
    let low = 0;
    let high = this.timestamps.length;

    while (low < high) {
      const mid = (low + high) >>> 1;
      if (this.timestamps[mid] < timestamp) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }

    this.timestamps.splice(low, 0, timestamp);
    this.recordIds.splice(low, 0, recordId);
  }

  public findRange(startTime: number, endTime: number): string[] {
    const results: string[] = [];
    const len = this.timestamps.length;

    let startIdx = 0;
    let endIdx = len;

    // Binary search lower bound
    while (startIdx < endIdx) {
      const mid = (startIdx + endIdx) >>> 1;
      if (this.timestamps[mid] < startTime) {
        startIdx = mid + 1;
      } else {
        endIdx = mid;
      }
    }

    for (let i = startIdx; i < len; i++) {
      if (this.timestamps[i] > endTime) break;
      results.push(this.recordIds[i]);
    }

    return results;
  }

  public get count(): number {
    return this.timestamps.length;
  }
}
