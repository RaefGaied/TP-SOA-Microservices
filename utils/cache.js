class MemoryCache {
    constructor() {
      this.store = new Map();
      this.stats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0
      };
    }
  
    get(key) {
      const entry = this.store.get(key);
      if (entry) {
        if (entry.expireAt && entry.expireAt < Date.now()) {
          this.store.delete(key);
          this.stats.misses++;
          return null;
        }
        this.stats.hits++;
        return entry.value;
      }
      this.stats.misses++;
      return null;
    }
  
    set(key, value, ttl = 0) {
      const entry = {
        value,
        expireAt: ttl ? Date.now() + ttl * 1000 : 0
      };
      this.store.set(key, entry);
      this.stats.sets++;
    }
  
    delete(key) {
      const existed = this.store.delete(key);
      if (existed) this.stats.deletes++;
      return existed;
    }
  
    clear() {
      this.store.clear();
    }
  
    getStats() {
      return {
        ...this.stats,
        size: this.store.size
      };
    }
  }
  

  const cache = new MemoryCache();
  
  module.exports = cache;