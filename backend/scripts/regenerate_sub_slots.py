import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.base import SessionLocal
from app.db.models import InterviewSlot, InterviewSubSlot
from app.interview_slots.service import generate_sub_slots

db = SessionLocal()

db.query(InterviewSubSlot).delete()
db.commit()
print("✅ Cleared old sub-slots.")

slots = db.query(InterviewSlot).all()
for slot in slots:
    generate_sub_slots(db, slot)
    print(f"✅ Regenerated sub-slots for: {slot.title}")

db.close()
print("Done.")
