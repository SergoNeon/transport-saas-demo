-- 1
CREATE TABLE IF NOT EXISTS exam_admins (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 username text NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9._-]{3,40}$'),
 display_name text NOT NULL CHECK (length(trim(display_name)) BETWEEN 2 AND 120),
 role text NOT NULL CHECK (role IN ('owner','manager','reviewer')),
 password_salt text NOT NULL,
 password_hash text NOT NULL,
 must_change_password boolean NOT NULL DEFAULT true,
 is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2
CREATE TABLE IF NOT EXISTS exam_admin_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 admin_id uuid NOT NULL REFERENCES exam_admins(id) ON DELETE CASCADE,
 token_hash char(64) NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 revoked_at timestamptz
);

-- 3
CREATE TABLE IF NOT EXISTS exam_assignments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 worker_name text NOT NULL CHECK (length(trim(worker_name)) BETWEEN 2 AND 120),
 identity_hash char(64) NOT NULL,
 identity_last4 varchar(4) NOT NULL,
 code_hash char(64) NOT NULL UNIQUE,
 status text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned','in_progress','submitted','revoked')),
 assigned_by uuid REFERENCES exam_admins(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 started_at timestamptz,
 submitted_at timestamptz,
 time_limit_seconds integer NOT NULL DEFAULT 2400 CHECK (time_limit_seconds BETWEEN 600 AND 10800),
 correct_count integer CHECK (correct_count BETWEEN 0 AND 30),
 score_percent numeric(5,2) CHECK (score_percent BETWEEN 0 AND 100),
 submit_reason text CHECK (submit_reason IN ('submitted','timeout')),
 decision text CHECK (decision IN ('accepted','rejected')),
 decision_note text,
 reviewed_by uuid REFERENCES exam_admins(id),
 reviewed_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4
CREATE INDEX IF NOT EXISTS exam_assignments_created_idx ON exam_assignments(created_at DESC);

-- 5
CREATE INDEX IF NOT EXISTS exam_assignments_status_idx ON exam_assignments(status,created_at DESC);

-- 6
CREATE TABLE IF NOT EXISTS exam_questions (
 id smallint PRIMARY KEY CHECK (id BETWEEN 1 AND 30),
 section text NOT NULL,
 question text NOT NULL,
 options jsonb NOT NULL CHECK (jsonb_typeof(options) = 'array' AND jsonb_array_length(options) = 4),
 correct_option smallint NOT NULL CHECK (correct_option BETWEEN 0 AND 3),
 explanation text NOT NULL,
 version integer NOT NULL DEFAULT 1
);

-- 7
CREATE TABLE IF NOT EXISTS exam_answers (
 assignment_id uuid NOT NULL REFERENCES exam_assignments(id) ON DELETE CASCADE,
 question_id smallint NOT NULL REFERENCES exam_questions(id),
 selected_option smallint NOT NULL CHECK (selected_option BETWEEN 0 AND 3),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (assignment_id, question_id)
);

-- 8
CREATE TABLE IF NOT EXISTS exam_worker_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 assignment_id uuid NOT NULL REFERENCES exam_assignments(id) ON DELETE CASCADE,
 token_hash char(64) NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 revoked_at timestamptz
);

-- 9
CREATE TABLE IF NOT EXISTS exam_audit_events (
 id bigserial PRIMARY KEY,
 actor_admin_id uuid REFERENCES exam_admins(id),
 assignment_id uuid REFERENCES exam_assignments(id),
 action text NOT NULL,
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
 occurred_at timestamptz NOT NULL DEFAULT now()
);

-- 10
CREATE INDEX IF NOT EXISTS exam_audit_events_assignment_idx ON exam_audit_events(assignment_id,occurred_at DESC);

-- 11
CREATE TABLE IF NOT EXISTS exam_login_limits (
 kind text NOT NULL,
 subject_hash char(64) NOT NULL,
 attempt_count int NOT NULL DEFAULT 0,
 window_start timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(kind,subject_hash)
);

-- 12
CREATE INDEX IF NOT EXISTS exam_admin_sessions_expire_idx ON exam_admin_sessions(expires_at);

-- 13
CREATE INDEX IF NOT EXISTS exam_worker_sessions_expire_idx ON exam_worker_sessions(expires_at);
