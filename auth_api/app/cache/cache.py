import json
import time
from typing import Optional
 
from app.core.config import REDIS_URL
  
class MemoryCache:
    def __init__(self):
        self._d: dict[str, tuple[float, str]] = {}
 
    def set(self, key: str, value: dict, ttl: int):
        self._d[key] = (time.time() + ttl, json.dumps(value))
 
    def get(self, key: str) -> Optional[dict]:
        item = self._d.get(key)
        if not item:
            return None
        if item[0] < time.time():
            del self._d[key]
            return None
        return json.loads(item[1])
 
    def delete(self, key: str):
        self._d.pop(key, None)
 
class RedisCache:
    def __init__(self, url: str):
        import redis
        self._r = redis.Redis.from_url(url, decode_responses=True)
 
    def set(self, key: str, value: dict, ttl: int):
        self._r.set(key, json.dumps(value), ex=ttl)
 
    def get(self, key: str) -> Optional[dict]:
        raw = self._r.get(key)
        return json.loads(raw) if raw else None
 
    def delete(self, key: str):
        self._r.delete(key)
 
cache = RedisCache(REDIS_URL) if REDIS_URL else MemoryCache()