-- ─── Family Members ──────────────────────────────────────────────────────────
-- Self-referencing FKs are DEFERRABLE so we can insert parents and children
-- in a single transaction without ordering constraints.

CREATE TABLE IF NOT EXISTS family_members (
  id            TEXT PRIMARY KEY,
  name          TEXT        NOT NULL,
  photo         TEXT        NOT NULL DEFAULT '',
  gender        TEXT        NOT NULL CHECK (gender IN ('male', 'female')),
  birth_date    TEXT,                              -- ISO 8601 e.g. "1945-08-17"
  death_date    TEXT,
  birth_place   TEXT,
  father_id     TEXT,
  mother_id     TEXT,
  biography     TEXT,
  -- Extended optional profile fields
  nickname      TEXT,
  profession    TEXT,
  education     TEXT,
  religion      TEXT,
  nationality   TEXT,
  hobbies       TEXT[]      NOT NULL DEFAULT '{}',
  social_links  JSONB       NOT NULL DEFAULT '[]', -- [{label, url}]
  gallery       TEXT[]      NOT NULL DEFAULT '{}', -- array of image URLs
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_father FOREIGN KEY (father_id)
    REFERENCES family_members (id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT fk_mother FOREIGN KEY (mother_id)
    REFERENCES family_members (id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED
);

-- ─── Marriages ────────────────────────────────────────────────────────────────
-- One row per couple (not per person).
-- The canonical side (member_id) is whichever ID sorts first alphabetically.
-- When querying for a member, check BOTH member_id = $id AND spouse_id = $id.

CREATE TABLE IF NOT EXISTS marriages (
  id           SERIAL      PRIMARY KEY,
  member_id    TEXT        NOT NULL REFERENCES family_members (id) ON DELETE CASCADE,
  spouse_id    TEXT        NOT NULL REFERENCES family_members (id) ON DELETE CASCADE,
  status       TEXT        NOT NULL DEFAULT 'married'
                 CHECK (status IN ('married','widowed','divorced','separated','annulled')),
  married_date TEXT,
  end_date     TEXT,

  CONSTRAINT uq_marriage UNIQUE (member_id, spouse_id),
  CONSTRAINT chk_no_self_marriage CHECK (member_id <> spouse_id)
);

-- ─── Helper: auto-update updated_at ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_family_members_updated_at
  BEFORE UPDATE ON family_members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
