export type AssetRecord<T> = {
  id: string;
  value: T;
  dispose?: (value: T) => void;
};

export class AssetManager<T> {
  private readonly assets = new Map<string, AssetRecord<T>>();

  get(id: string): T | undefined {
    return this.assets.get(id)?.value;
  }

  set(record: AssetRecord<T>): T {
    const existing = this.assets.get(record.id);
    if (existing && existing.value !== record.value) {
      existing.dispose?.(existing.value);
    }
    this.assets.set(record.id, record);
    return record.value;
  }

  has(id: string): boolean {
    return this.assets.has(id);
  }

  dispose(id: string): void {
    const record = this.assets.get(id);
    if (!record) return;
    record.dispose?.(record.value);
    this.assets.delete(id);
  }

  disposeAll(): void {
    for (const id of this.assets.keys()) {
      this.dispose(id);
    }
  }
}
