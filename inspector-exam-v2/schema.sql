-- BRILL TEAM PROJECT / Electra Afikim examination platform
-- Isolated staging schema. Run only against the dedicated afikim_exam database.
BEGIN;
CREATE TABLE IF NOT EXISTS exam_admins (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 username text NOT NULL UNIQUE,
 display_name text NOT NULL,
 role text NOT NULL CHECK (role IN ('owner','manager','hr')),
 password_salt text NOT NULL,
 password_hash text NOT NULL,
 must_change_password boolean DEFAULT true,
 is_active boolean DEFAULT true,
 created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS exam_staff_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 staff_id uuid REFERENCES exam_admins(id),
 session_digest text NOT NULL UNIQUE,
 expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS exam_staff_sessions_staff_idx ON exam_staff_sessions(staff_id);
CREATE TABLE IF NOT EXISTS exam_candidates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL,
 identity_digest text NOT NULL,
 identity_last4 text NOT NULL,
 access_digest text NOT NULL UNIQUE,
 status text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned','in_progress','submitted')),
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 started_at timestamptz,
 submitted_at timestamptz,
 correct_count integer,
 reviewer_decision text CHECK (reviewer_decision IS NULL OR reviewer_decision IN ('accepted','rejected','follow_up')),
 reviewer_notes text,
 reviewed_at timestamptz,
 assigned_by uuid REFERENCES exam_admins(id),
 time_limit_seconds integer NOT NULL DEFAULT 2400,
 reviewed_by uuid REFERENCES exam_admins(id),
 submitted_reason text
);
CREATE INDEX IF NOT EXISTS exam_candidates_owner_idx ON exam_candidates(assigned_by,created_at DESC);
CREATE TABLE IF NOT EXISTS exam_question_bank (
 id integer PRIMARY KEY,
 section text NOT NULL,
 prompt text NOT NULL,
 choices jsonb NOT NULL,
 answer_index integer NOT NULL CHECK(answer_index BETWEEN 0 AND 3),
 explanation text NOT NULL
);
CREATE TABLE IF NOT EXISTS exam_candidate_answers (
 candidate_id uuid NOT NULL REFERENCES exam_candidates(id),
 question_id integer NOT NULL REFERENCES exam_question_bank(id),
 selected_option integer NOT NULL CHECK(selected_option BETWEEN 0 AND 3),
 updated_at timestamptz DEFAULT now(),
 PRIMARY KEY (candidate_id,question_id)
);
CREATE TABLE IF NOT EXISTS exam_candidate_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 candidate_id uuid REFERENCES exam_candidates(id),
 session_digest text NOT NULL UNIQUE,
 expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS exam_candidate_sessions_candidate_idx ON exam_candidate_sessions(candidate_id);
CREATE TABLE IF NOT EXISTS exam_review_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 staff_id uuid REFERENCES exam_admins(id),
 candidate_id uuid REFERENCES exam_candidates(id),
 action text NOT NULL,
 detail jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS exam_rate_limits (
 kind text NOT NULL,
 subject_digest text NOT NULL,
 hits integer NOT NULL DEFAULT 0,
 since_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (kind,subject_digest)
);
COMMIT;
