-- Meanwhile, Somewhere — initial schema.
--
-- Design notes that matter later:
--   * Nothing here stores an IP. Abuse controls key off a salted SHA-256 of
--     it, which is enough to count actions per visitor and useless for
--     identifying one.
--   * Deletes are soft. `hidden` takes a post off the wall; the row stays, so
--     a flag storm is recoverable and a takedown request is one UPDATE.
--   * A scribble is vector strokes as JSON, a couple of kilobytes. There is no
--     image storage anywhere in this product, which is what keeps it free.

CREATE TABLE IF NOT EXISTS visits (
  country TEXT PRIMARY KEY,
  count   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS posts (
  id         TEXT PRIMARY KEY,
  message    TEXT    NOT NULL DEFAULT '',
  strokes    TEXT,                                -- JSON array of strokes, or NULL
  name       TEXT,                                -- optional, free text
  country    TEXT    NOT NULL,                    -- ISO 3166-1 alpha-2
  paper      INTEGER NOT NULL DEFAULT 0,
  x          REAL    NOT NULL,
  y          REAL    NOT NULL,
  rotation   REAL    NOT NULL DEFAULT 0,
  reactions  INTEGER NOT NULL DEFAULT 0,
  flags      INTEGER NOT NULL DEFAULT 0,
  hidden     INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL                     -- epoch ms
);

-- The wall's only read path: visible posts, newest first.
CREATE INDEX IF NOT EXISTS posts_visible ON posts (hidden, created_at DESC);

-- One row per (post, visitor, action). The primary key is the dedupe: a second
-- reaction or flag from the same visitor collides instead of counting twice,
-- which is what stops "felt this" being spammed in a loop.
CREATE TABLE IF NOT EXISTS post_actions (
  post_id    TEXT NOT NULL,
  visitor    TEXT NOT NULL,                       -- salted hash, never an IP
  kind       TEXT NOT NULL,                       -- 'react' | 'flag'
  created_at INTEGER NOT NULL,
  PRIMARY KEY (post_id, visitor, kind)
);

-- Rolling-window counters. Keyed by visitor+action+window so a bucket expires
-- simply by never being read again; a sweep clears the dead rows.
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket     TEXT    PRIMARY KEY,
  count      INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS rate_limits_expiry ON rate_limits (expires_at);
