import time
import logging
from rq import Worker
from app.queues.redis_conn import redis_conn

logger = logging.getLogger(__name__)

if __name__ == "__main__":
    while True:
        try:
            print("worker listening on emails queue")
            worker = Worker(queues=["Emails","emails"], connection=redis_conn)
            worker.work()
        except Exception as e:
            logger.error(f"Worker crashed: {e}")
            print("Worker crashed - restarting in 5 seconds...")
            time.sleep(5)

if __name__ == "__main__":
    print("Worker started — listening on 'Emails' queue. Press Ctrl+C to stop.")
    worker = Worker(queues=["Emails"], connection=redis_conn)
    worker.work()