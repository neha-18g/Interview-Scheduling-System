from redis import Redis
from app.core.config import settings

# Single shared connection — reused by both the API and the worker
redis_conn = Redis.from_url(settings.REDIS_URL)