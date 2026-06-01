use rusqlite::Connection;

pub fn run_migrations(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            applied_at TEXT NOT NULL
        );",
    )
    .map_err(|e| e.to_string())?;

    let current: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    if current < 1 {
        migration_v1(conn)?;
        record(conn, 1)?;
    }
    if current < 2 {
        migration_v2(conn)?;
        record(conn, 2)?;
    }
    if current < 3 {
        migration_v3(conn)?;
        record(conn, 3)?;
    }
    if current < 4 {
        migration_v4(conn)?;
        record(conn, 4)?;
    }
    if current < 5 {
        migration_v5(conn)?;
        record(conn, 5)?;
    }
    if current < 6 {
        migration_v6(conn)?;
        record(conn, 6)?;
    }
    if current < 7 {
        migration_v7(conn)?;
        record(conn, 7)?;
    }
    if current < 8 {
        migration_v8(conn)?;
        record(conn, 8)?;
    }
    if current < 9 {
        migration_v9(conn)?;
        record(conn, 9)?;
    }
    if current < 10 {
        migration_v10(conn)?;
        record(conn, 10)?;
    }
    if current < 11 {
        migration_v11(conn)?;
        record(conn, 11)?;
    }
    Ok(())
}

fn record(conn: &Connection, version: i32) -> Result<(), String> {
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT OR REPLACE INTO schema_migrations (version, applied_at) VALUES (?1, ?2)",
        rusqlite::params![version, now],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn migration_v1(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS app_state (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          payload TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS changelog (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          created_at TEXT NOT NULL,
          summary TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS attempts (
          id TEXT PRIMARY KEY,
          problem_id TEXT NOT NULL,
          skill_ids TEXT NOT NULL,
          answer_raw TEXT,
          correct INTEGER NOT NULL,
          mode TEXT NOT NULL,
          hint_count INTEGER NOT NULL,
          seconds INTEGER NOT NULL,
          mixed INTEGER NOT NULL,
          delayed INTEGER NOT NULL,
          confidence REAL,
          mistake_tags TEXT,
          mastery_delta REAL,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_attempts_created ON attempts(created_at DESC);
        ",
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn migration_v2(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS skill_mastery (
          skill_id TEXT PRIMARY KEY,
          mastery_score REAL NOT NULL,
          mastery_state TEXT NOT NULL,
          fluency_score REAL NOT NULL,
          retention_score REAL NOT NULL,
          conceptual_score REAL NOT NULL,
          procedural_score REAL NOT NULL,
          transfer_score REAL NOT NULL,
          evidence_count INTEGER NOT NULL,
          recent_failures INTEGER NOT NULL,
          last_practiced TEXT,
          review_due TEXT,
          delayed_mixed_correct INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS review_items (
          id TEXT PRIMARY KEY,
          skill_id TEXT NOT NULL,
          due TEXT NOT NULL,
          interval_days INTEGER NOT NULL,
          priority INTEGER NOT NULL,
          reason TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_review_due ON review_items(due);
        CREATE TABLE IF NOT EXISTS diagnostics (
          id TEXT PRIMARY KEY,
          started_at TEXT NOT NULL,
          target_count INTEGER NOT NULL,
          answered_count INTEGER NOT NULL,
          current_index INTEGER NOT NULL,
          queue_json TEXT NOT NULL,
          weak_skills_json TEXT NOT NULL,
          strong_skills_json TEXT NOT NULL,
          completed INTEGER NOT NULL,
          summary_json TEXT
        );
        CREATE TABLE IF NOT EXISTS problems (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          prompt TEXT NOT NULL,
          skill_ids_json TEXT NOT NULL,
          difficulty REAL NOT NULL,
          mode TEXT NOT NULL,
          answer_type TEXT NOT NULL,
          expected_answer TEXT NOT NULL,
          hint_sequence_json TEXT NOT NULL,
          worked_example_json TEXT,
          verification_status TEXT NOT NULL,
          source TEXT NOT NULL,
          deprecated INTEGER NOT NULL DEFAULT 0,
          deprecation_reason TEXT,
          attempt_count INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS homework_analyses (
          id TEXT PRIMARY KEY,
          created_at TEXT NOT NULL,
          detected_topic TEXT NOT NULL,
          problem_text TEXT NOT NULL,
          extracted_work_summary TEXT NOT NULL,
          correctness TEXT NOT NULL,
          mistake_tags_json TEXT NOT NULL,
          skills_affected_json TEXT NOT NULL,
          feedback_summary TEXT NOT NULL,
          raw_image_saved INTEGER NOT NULL,
          image_path TEXT
        );
        ",
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn migration_v3(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS mistake_patterns (
          tag TEXT PRIMARY KEY,
          skill_ids_json TEXT NOT NULL,
          count INTEGER NOT NULL,
          last_seen TEXT NOT NULL,
          note TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS resource_effectiveness (
          resource_id TEXT PRIMARY KEY,
          effectiveness_score REAL NOT NULL,
          notes TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        ",
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn migration_v4(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS ai_calls (
          id TEXT PRIMARY KEY,
          created_at TEXT NOT NULL,
          task TEXT NOT NULL,
          mode TEXT NOT NULL,
          prompt_preview TEXT NOT NULL,
          status TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS review_events (
          id TEXT PRIMARY KEY,
          skill_id TEXT NOT NULL,
          review_type TEXT NOT NULL,
          due TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          started_at TEXT NOT NULL,
          ended_at TEXT,
          pace TEXT NOT NULL,
          phases_json TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS session_events (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
          entity_type,
          entity_id,
          body,
          tokenize='porter'
        );
        ",
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn migration_v5(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        ALTER TABLE homework_analyses ADD COLUMN step_feedback_json TEXT;
        ALTER TABLE homework_analyses ADD COLUMN repair_recommendation_json TEXT;
        ",
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn migration_v6(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS diagnostic_items (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          problem_id TEXT NOT NULL,
          skill_ids_json TEXT NOT NULL,
          answer_raw TEXT,
          correct INTEGER NOT NULL,
          question_type TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_diagnostic_items_session ON diagnostic_items(session_id);
        ",
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn migration_v7(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS skills (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          area TEXT NOT NULL,
          course TEXT NOT NULL,
          type TEXT NOT NULL,
          prerequisites_json TEXT NOT NULL,
          supports_json TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS skill_edges (
          from_skill_id TEXT NOT NULL,
          to_skill_id TEXT NOT NULL,
          edge_type TEXT NOT NULL,
          PRIMARY KEY (from_skill_id, to_skill_id, edge_type)
        );
        CREATE TABLE IF NOT EXISTS resources (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          url TEXT NOT NULL,
          source TEXT NOT NULL,
          duration TEXT NOT NULL,
          skill_ids_json TEXT NOT NULL,
          effectiveness_score REAL NOT NULL
        );
        CREATE TABLE IF NOT EXISTS resource_events (
          id TEXT PRIMARY KEY,
          resource_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          helpful INTEGER,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_skill_edges_to ON skill_edges(to_skill_id);
        CREATE INDEX IF NOT EXISTS idx_resource_events_resource ON resource_events(resource_id);
        ",
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn migration_v8(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS maintenance_runs (
          id TEXT PRIMARY KEY,
          started_at TEXT NOT NULL,
          ended_at TEXT NOT NULL,
          trigger TEXT NOT NULL,
          jobs_run_json TEXT NOT NULL,
          changes_made_json TEXT NOT NULL,
          backups_created_json TEXT NOT NULL,
          skills_updated_json TEXT NOT NULL,
          memories_updated_json TEXT NOT NULL,
          problem_bank_changes_json TEXT NOT NULL,
          resource_rank_changes_json TEXT NOT NULL,
          review_schedule_changes_json TEXT NOT NULL,
          warnings_json TEXT NOT NULL
        );
        ALTER TABLE ai_calls ADD COLUMN prompt_hash TEXT;
        ",
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn migration_v9(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        ALTER TABLE attempts ADD COLUMN resource_id TEXT;
        CREATE INDEX IF NOT EXISTS idx_attempts_resource ON attempts(resource_id);
        CREATE INDEX IF NOT EXISTS idx_ai_calls_created ON ai_calls(created_at DESC);
        UPDATE ai_calls SET prompt_hash = '' WHERE prompt_hash IS NULL;
        ALTER TABLE homework_analyses ADD COLUMN steps_json TEXT;
        ALTER TABLE homework_analyses ADD COLUMN wrong_step_index INTEGER;
        ALTER TABLE homework_analyses ADD COLUMN detected_problems_json TEXT;
        ",
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn migration_v10(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        ALTER TABLE ai_calls ADD COLUMN response_preview TEXT;
        ALTER TABLE ai_calls ADD COLUMN stderr_preview TEXT;
        ALTER TABLE ai_calls ADD COLUMN session_id TEXT;
        ",
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn migration_v11(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        ALTER TABLE diagnostics ADD COLUMN skill_probes_json TEXT DEFAULT '{}';
        ALTER TABLE diagnostics ADD COLUMN continuing INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE diagnostics ADD COLUMN trigger_reason TEXT;
        ",
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::relational;
    use rusqlite::Connection;

    #[test]
    fn migrations_apply_through_v10() {
        let conn = Connection::open_in_memory().expect("in-memory db");
        run_migrations(&conn).expect("migrations");
        let version: i64 = conn
            .query_row("SELECT MAX(version) FROM schema_migrations", [], |row| row.get(0))
            .expect("version");
        assert!(version >= 10);
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='maintenance_runs'",
                [],
                |row| row.get(0),
            )
            .expect("count");
        assert_eq!(count, 1);
        let has_resource_col: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM pragma_table_info('attempts') WHERE name='resource_id'",
                [],
                |row| row.get(0),
            )
            .expect("col");
        assert_eq!(has_resource_col, 1);
        for col in ["response_preview", "stderr_preview", "session_id"] {
            let present: i64 = conn
                .query_row(
                    &format!(
                        "SELECT COUNT(*) FROM pragma_table_info('ai_calls') WHERE name='{col}'"
                    ),
                    [],
                    |row| row.get(0),
                )
                .expect("col");
            assert_eq!(present, 1, "missing ai_calls.{col}");
        }
    }

    #[test]
    fn migration_v10_idempotent() {
        let conn = Connection::open_in_memory().expect("in-memory db");
        run_migrations(&conn).expect("first run");
        run_migrations(&conn).expect("second run idempotent");
        let version: i64 = conn
            .query_row("SELECT MAX(version) FROM schema_migrations", [], |row| row.get(0))
            .expect("version");
        assert_eq!(version, 11);
        let migration_rows: i64 = conn
            .query_row("SELECT COUNT(*) FROM schema_migrations WHERE version = 10", [], |row| {
                row.get(0)
            })
            .expect("count");
        assert_eq!(migration_rows, 1);
        for col in ["response_preview", "stderr_preview", "session_id"] {
            let present: i64 = conn
                .query_row(
                    &format!(
                        "SELECT COUNT(*) FROM pragma_table_info('ai_calls') WHERE name='{col}'"
                    ),
                    [],
                    |row| row.get(0),
                )
                .expect("col");
            assert_eq!(present, 1, "missing ai_calls.{col}");
        }
    }

    #[test]
    fn v10_ai_calls_and_mistake_patterns_round_trip() {
        let conn = Connection::open_in_memory().expect("in-memory db");
        run_migrations(&conn).expect("migrations");

        let payload = r#"{
          "profileName": "Test",
          "currentFocus": "Calculus 1",
          "onboarded": true,
          "advancedMode": false,
          "mastery": {
            "chain_rule": {
              "skillId": "chain_rule",
              "masteryScore": 0.5,
              "masteryState": "Solid",
              "fluencyScore": 0.5,
              "retentionScore": 0.5,
              "conceptualScore": 0.5,
              "proceduralScore": 0.5,
              "transferScore": 0.5,
              "evidenceCount": 1,
              "recentFailures": 0,
              "delayedMixedCorrect": 0
            }
          },
          "mistakePatterns": {
            "setup:missing_equation": {
              "tag": "setup:missing_equation",
              "skillIds": ["related_rates"],
              "count": 5,
              "lastSeen": "2026-06-01T12:00:00Z",
              "note": "Forgot constraint equation"
            }
          },
          "aiCalls": [{
            "id": "ai-1",
            "createdAt": "2026-06-01T12:00:00Z",
            "task": "hint chain_rule",
            "mode": "codex_cli",
            "promptPreview": "Task: hint",
            "promptHash": "abc123",
            "status": "received",
            "responsePreview": "{\"feedback_to_user\":\"Try u-sub\"}",
            "stderrPreview": "",
            "sessionId": "tutor_session_chain_rule"
          }],
          "reviewQueue": [],
          "problems": {},
          "attempts": [],
          "homeworkAnalyses": [],
          "changelog": [],
          "skills": {},
          "resources": {}
        }"#;

        relational::save_relational(&conn, payload).expect("save");
        let loaded = relational::load_relational(&conn)
            .expect("load")
            .expect("payload");

        assert!(loaded.contains("setup:missing_equation"));
        assert!(loaded.contains("Forgot constraint equation"));
        assert!(loaded.contains("responsePreview"));
        assert!(loaded.contains("tutor_session_chain_rule"));
        assert!(loaded.contains("\"count\":5"));
    }
}
