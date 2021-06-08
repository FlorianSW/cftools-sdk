import {Cache} from '../types';

interface CacheEntry {
    value: any,
    notAfter: number,
}

export class InMemoryCache implements Cache {
    private entries = new Map<string, CacheEntry>();

    get<T>(cacheKey: string): T | undefined {
        const entry = this.entries.get(cacheKey);
        if (entry === undefined) {
            return undefined;
        }
        if (entry.notAfter <= new Date().getTime() / 1000) {
            this.entries.delete(cacheKey);
            return undefined;
        }
        return entry.value;
    }

    set<T>(cacheKey: string, value: T, expiry?: number): void {
        const currentTime = new Date().getTime() / 1000;
        const notAfter = currentTime + (expiry || 3600);

        this.entries.set(cacheKey, {
            value,
            notAfter
        })
    }
}
