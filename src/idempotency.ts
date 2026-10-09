export interface IdempotencyRecord<T = unknown> {
  key: string;
  reference: string;
  result: T;
  createdAt: string;
  /** Signed payload retained before the first broadcast, for ambiguous RPC retries. */
  wireTransaction?: string;
  rpcUrl?: string;
}

export interface IdempotencyStore<T = unknown> {
  /** Must serialize all callers sharing this store/key, including across processes. */
  withLock?<R>(key: string, operation: () => Promise<R>): Promise<R>;
  get(key: string): Promise<IdempotencyRecord<T> | undefined> | IdempotencyRecord<T> | undefined;
  set(key: string, record: IdempotencyRecord<T>): Promise<void> | void;
}

export class MemoryIdempotencyStore<T = unknown> implements IdempotencyStore<T> {
  private readonly locks = new Map<string, Promise<void>>();

  async withLock<R>(key: string, operation: () => Promise<R>): Promise<R> {
    const previous = this.locks.get(key) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.locks.set(key, current);
    await previous;
    try {
      return await operation();
    } finally {
      release();
      if (this.locks.get(key) === current) this.locks.delete(key);
    }
  }

  private readonly records = new Map<string, IdempotencyRecord<T>>();

  get(key: string): IdempotencyRecord<T> | undefined {
    return this.records.get(key);
  }

  set(key: string, record: IdempotencyRecord<T>): void {
    this.records.set(key, record);
  }
}

export function createReference(prefix = "solana-usdt"): string {
  let id: string;
  const webCrypto =
    typeof globalThis !== "undefined"
      ? globalThis.crypto || (globalThis as any).msCrypto
      : undefined;

  if (webCrypto && typeof webCrypto.randomUUID === "function") {
    id = webCrypto.randomUUID();
  } else if (webCrypto && typeof webCrypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    webCrypto.getRandomValues(bytes);
    // Set UUID v4 variant/version bits
    bytes[6] = (bytes[6]! & 0x0f) | 0x40;
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;

    id = "";
    for (let i = 0; i < 16; i++) {
      if (i === 4 || i === 6 || i === 8 || i === 10) id += "-";
      id += bytes[i]!.toString(16).padStart(2, "0");
    }
  } else {
    // Fallback using Math.random
    id = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
  return `${prefix}_${id}`;
}

export function createMemo(reference: string, prefix = "solana-usdt"): string {
  return `${prefix}:${reference}`;
}

export function parseMemoReference(memo: string, prefix = "solana-usdt"): string | undefined {
  const marker = `${prefix}:`;
  return memo.startsWith(marker) ? memo.slice(marker.length) : undefined;
}
