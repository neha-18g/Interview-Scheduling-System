CREATE TABLE IF NOT EXISTS users (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    firebase_uid VARCHAR(128) NOT NULL UNIQUE,
    name         VARCHAR(255) NOT NULL,
    email        VARCHAR(255) NOT NULL UNIQUE,
    role         ENUM('candidate', 'admin') NOT NULL DEFAULT 'candidate',
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active    TINYINT NOT NULL DEFAULT 1,
    INDEX idx_firebase_uid (firebase_uid)
);

CREATE TABLE IF NOT EXISTS interview_slots (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    title          VARCHAR(255) NOT NULL,
    description    TEXT,
    start_time     TIMESTAMP NOT NULL,
    end_time       TIMESTAMP NOT NULL,
    max_candidates INT NOT NULL DEFAULT 1,
    interview_duration INT NOT NULL DEFAULT 30,
    created_by     INT NOT NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                   ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- ← ADDED entire new table
CREATE TABLE IF NOT EXISTS interview_sub_slots (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    slot_id    INT NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time   TIMESTAMP NOT NULL,
    is_booked  TINYINT NOT NULL DEFAULT 0,
    FOREIGN KEY (slot_id) REFERENCES interview_slots(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS slot_bookings (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    slot_id           INT NOT NULL,
    sub_slot_id         INT DEFAULT NULL,                -- ← ADDED
    candidate_user_id INT NOT NULL,
    status            ENUM('pending', 'approved', 'rejected')
                      NOT NULL DEFAULT 'pending',
    booked_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                      ON UPDATE CURRENT_TIMESTAMP,
    candidate_statement     TEXT NOT NULL,
    resume_path             VARCHAR(512) DEFAULT NULL, 
    ai_summary              TEXT DEFAULT NULL,
    ai_result               VARCHAR(20) DEFAULT NULL,
    ai_reason              TEXT DEFAULT NULL,
    FOREIGN KEY (slot_id)           REFERENCES interview_slots(id) ON DELETE CASCADE,
    FOREIGN KEY (candidate_user_id) REFERENCES users(id) ON DELETE CASCADE,
     FOREIGN KEY (sub_slot_id)       REFERENCES interview_sub_slots(id) ON DELETE SET NULL  -- ← ADDED
);

CREATE TABLE IF NOT EXISTS email_logs (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    booking_id      INT DEFAULT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    subject         VARCHAR(500) NOT NULL,
    status          ENUM('queued', 'sent', 'failed') NOT NULL DEFAULT 'queued',
    error_message   TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    FOREIGN KEY (booking_id) REFERENCES slot_bookings(id) ON DELETE CASCADE
);
