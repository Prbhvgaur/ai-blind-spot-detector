import { EventEmitter } from "node:events";

type StoredValue = {
  value: string;
  expiresAt: number | null;
};

export interface DemoRedisSubscriberLike {
  subscribe(channel: string): Promise<void>;
  handles(channel: string): boolean;
  disconnect(): void;
  on(event: "message", listener: (channel: string, payload: string) => void): this;
}

export interface DemoRedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, ttlSeconds?: number): Promise<string>;
  del(key: string): Promise<number>;
  incr(key: string): Promise<number>;
  expire(key: string, ttlSeconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
  publish(channel: string, payload: string): Promise<number>;
  setnx(key: string, value: string): Promise<number>;
  createSubscriber(): DemoRedisSubscriberLike;
}

class DemoRedisSubscriber extends EventEmitter {
  private readonly channels = new Set<string>();

  constructor(private readonly bus: DemoRedisBus) {
    super();
  }

  async subscribe(channel: string) {
    this.channels.add(channel);
    this.bus.addSubscriber(this);
  }

  handles(channel: string) {
    return this.channels.has(channel);
  }

  disconnect() {
    this.bus.removeSubscriber(this);
    this.channels.clear();
    this.removeAllListeners();
  }
}

class DemoRedisBus {
  private readonly store = new Map<string, StoredValue>();
  private readonly subscribers = new Set<DemoRedisSubscriber>();

  private cleanup(key: string) {
    const current = this.store.get(key);

    if (current?.expiresAt && current.expiresAt <= Date.now()) {
      this.store.delete(key);
    }
  }

  addSubscriber(subscriber: DemoRedisSubscriber) {
    this.subscribers.add(subscriber);
  }

  removeSubscriber(subscriber: DemoRedisSubscriber) {
    this.subscribers.delete(subscriber);
  }

  async get(key: string) {
    this.cleanup(key);
    return this.store.get(key)?.value ?? null;
  }

  async set(key: string, value: string, mode?: string, ttlSeconds?: number) {
    const expiresAt =
      mode === "EX" && typeof ttlSeconds === "number" ? Date.now() + ttlSeconds * 1000 : null;

    this.store.set(key, {
      value,
      expiresAt
    });

    return "OK";
  }

  async del(key: string) {
    const deleted = this.store.delete(key);
    return deleted ? 1 : 0;
  }

  async incr(key: string) {
    this.cleanup(key);
    const current = Number(this.store.get(key)?.value ?? "0") + 1;
    const expiresAt = this.store.get(key)?.expiresAt ?? null;

    this.store.set(key, {
      value: String(current),
      expiresAt
    });

    return current;
  }

  async expire(key: string, ttlSeconds: number) {
    const current = this.store.get(key);

    if (!current) {
      return 0;
    }

    current.expiresAt = Date.now() + ttlSeconds * 1000;
    this.store.set(key, current);
    return 1;
  }

  async ttl(key: string) {
    this.cleanup(key);
    const current = this.store.get(key);

    if (!current) {
      return -2;
    }

    if (!current.expiresAt) {
      return -1;
    }

    return Math.max(Math.ceil((current.expiresAt - Date.now()) / 1000), 0);
  }

  async publish(channel: string, payload: string) {
    let delivered = 0;

    for (const subscriber of this.subscribers) {
      if (!subscriber.handles(channel)) {
        continue;
      }

      delivered += 1;
      subscriber.emit("message", channel, payload);
    }

    return delivered;
  }

  async setnx(key: string, value: string) {
    this.cleanup(key);

    if (this.store.has(key)) {
      return 0;
    }

    this.store.set(key, {
      value,
      expiresAt: null
    });

    return 1;
  }

  createSubscriber() {
    return new DemoRedisSubscriber(this);
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __blindspotDemoRedis__: DemoRedisLike | undefined;
}

export const demoRedis: DemoRedisLike = global.__blindspotDemoRedis__ ?? new DemoRedisBus();

if (process.env.NODE_ENV !== "production") {
  global.__blindspotDemoRedis__ = demoRedis;
}
