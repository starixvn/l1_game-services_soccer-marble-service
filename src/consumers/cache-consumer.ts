import appConfigs from "../app-configs";
import { CacheableMemory } from "cacheable";

export interface CacheOptions {
    ttl?: number;
}

export default class CacheConsumer {
    private readonly cache: CacheableMemory;

    constructor() {
        this.cache = new CacheableMemory({
            ttl: appConfigs.cache.ttl
        });
    }

    public async get<TReturnType>(
        key: string,
        getFunction: Function,
        options?: CacheOptions,
      ) {
        if (this.cache.has(key)) {
          return this.cache.get(key) as TReturnType;
        }
        const value = await getFunction();
        this.cache.set(key, value, options?.ttl);
        return value as TReturnType;
      }
    
      public has(key: string) {
        return this.cache.has(key);
      }
    
      public async set(key: string, value: any, options?: CacheOptions) {
        this.cache.set(key, value, options?.ttl);
      }
}