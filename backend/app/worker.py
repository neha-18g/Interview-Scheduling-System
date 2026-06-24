import time
import logging
from rq import Worker
from app.queues.redis_conn import redis_conn

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    while True:
        try:
            logger.info("Worker listening on 'Emails' and 'emails'queues...")
            worker = Worker(queues=["Emails","emails"], connection=redis_conn)
            worker.work()
        except Exception as e:
            logger.error(f"Worker crashed: {e}")
            logger.info("Restarting in 5 seconds...")
            time.sleep(5)