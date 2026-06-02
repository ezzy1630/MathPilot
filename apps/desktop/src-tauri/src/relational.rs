use rusqlite::{params, Connection};
use serde_json::{json, Map, Value};

pub fn save_relational(conn: &Connection, payload: &str) -> Result<(), String> {
    let state: Value = serde_json::from_str(payload).map_err(|e| e.to_string())?;
    let obj = state.as_object().ok_or("state must be an object")?;
    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

    save_settings(&tx, obj)?;
    save_mastery(&tx, obj)?;
    save_review(&tx, obj)?;
    save_problems(&tx, obj)?;
    save_diagnostic(&tx, obj)?;
    save_homework(&tx, obj)?;
    save_attempts(&tx, obj)?;
    save_mistake_patterns(&tx, obj)?;
    save_resource_effectiveness(&tx, obj)?;
    save_ai_calls(&tx, obj)?;
    save_changelog(&tx, obj)?;
    save_review_events(&tx, obj)?;
    save_session_events(&tx, obj)?;
    save_search_index(&tx, obj)?;
    save_diagnostic_items(&tx, obj)?;
    save_skills_graph(&tx, obj)?;
    save_resources_table(&tx, obj)?;
    save_resource_events(&tx, obj)?;
    save_maintenance_runs(&tx, obj)?;

    let now = chrono::Utc::now().to_rfc3339();
    tx.execute(
        "INSERT INTO app_state (id, payload, updated_at) VALUES (1, ?1, ?2)
         ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at",
        params![payload, now],
    )
    .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

pub fn load_relational(conn: &Connection) -> Result<Option<String>, String> {
    let mastery_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM skill_mastery", [], |r| r.get(0))
        .unwrap_or(0);
    if mastery_count == 0 {
        return load_app_state_payload(conn);
    }

    let mut obj = Map::new();
    load_settings(conn, &mut obj)?;
    load_mastery(conn, &mut obj)?;
    load_review(conn, &mut obj)?;
    load_problems(conn, &mut obj)?;
    load_diagnostic(conn, &mut obj)?;
    load_homework(conn, &mut obj)?;
    load_attempts(conn, &mut obj)?;
    load_mistake_patterns(conn, &mut obj)?;
    load_resource_effectiveness(conn, &mut obj)?;
    load_resources_table(conn, &mut obj)?;
    load_resource_events(conn, &mut obj)?;
    load_ai_calls(conn, &mut obj)?;
    load_changelog(conn, &mut obj)?;
    load_maintenance_runs(conn, &mut obj)?;
    load_skills_graph(conn, &mut obj)?;
    load_daily_session(conn, &mut obj)?;
    Ok(Some(Value::Object(obj).to_string()))
}

fn load_app_state_payload(conn: &Connection) -> Result<Option<String>, String> {
    let mut stmt = conn
        .prepare("SELECT payload FROM app_state WHERE id = 1")
        .map_err(|e| e.to_string())?;
    let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let payload: String = row.get(0).map_err(|e| e.to_string())?;
        if payload.trim().is_empty() || payload.trim() == "{}" {
            return Ok(None);
        }
        return Ok(Some(payload));
    }
    Ok(None)
}

fn save_settings(conn: &Connection, obj: &Map<String, Value>) -> Result<(), String> {
    conn.execute("DELETE FROM settings", [])
        .map_err(|e| e.to_string())?;
    for key in [
        "profileName",
        "currentFocus",
        "onboarded",
        "advancedMode",
        "sessionPace",
        "developerModeEnabled",
        "resources",
        "maintenanceRuns",
        "overrides",
        "quickRepair",
        "dailySession",
        "codexSessions",
        "sessionsSinceMaintenance",
        "preferences",
        "coachInsight",
        "studyPlan",
        "codexHint",
        "postDiagnosticPending",
        "continuingDiagnosticPending",
        "continuingDiagnosticCuratorRan",
        "homeworkClusterLastRun",
        "mapHighlightSkillIds",
        "mapViewMode",
        "activeVideo",
        "workedExamples",
        "developerState",
        "codeChangeProposals",
        "syllabus",
        "syllabusMapping",
    ] {
        if let Some(val) = obj.get(key) {
            conn.execute(
                "INSERT INTO settings (key, value) VALUES (?1, ?2)",
                params![key, val.to_string()],
            )
            .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

fn load_settings(conn: &Connection, obj: &mut Map<String, Value>) -> Result<(), String> {
    let mut stmt = conn
        .prepare("SELECT key, value FROM settings")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| e.to_string())?;
    for row in rows.flatten() {
        let (key, value) = row;
        if let Ok(parsed) = serde_json::from_str::<Value>(&value) {
            obj.insert(key, parsed);
        }
    }
    Ok(())
}

fn save_mastery(conn: &Connection, obj: &Map<String, Value>) -> Result<(), String> {
    conn.execute("DELETE FROM skill_mastery", [])
        .map_err(|e| e.to_string())?;
    if let Some(mastery) = obj.get("mastery").and_then(|v| v.as_object()) {
        for (_, record) in mastery {
            conn.execute(
                "INSERT INTO skill_mastery (
                  skill_id, mastery_score, mastery_state, fluency_score, retention_score,
                  conceptual_score, procedural_score, transfer_score, evidence_count,
                  recent_failures, last_practiced, review_due, delayed_mixed_correct
                ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)",
                params![
                    record.get("skillId").and_then(|v| v.as_str()).unwrap_or(""),
                    record
                        .get("masteryScore")
                        .and_then(|v| v.as_f64())
                        .unwrap_or(0.0),
                    record
                        .get("masteryState")
                        .and_then(|v| v.as_str())
                        .unwrap_or("Unknown"),
                    record
                        .get("fluencyScore")
                        .and_then(|v| v.as_f64())
                        .unwrap_or(0.0),
                    record
                        .get("retentionScore")
                        .and_then(|v| v.as_f64())
                        .unwrap_or(0.0),
                    record
                        .get("conceptualScore")
                        .and_then(|v| v.as_f64())
                        .unwrap_or(0.0),
                    record
                        .get("proceduralScore")
                        .and_then(|v| v.as_f64())
                        .unwrap_or(0.0),
                    record
                        .get("transferScore")
                        .and_then(|v| v.as_f64())
                        .unwrap_or(0.0),
                    record
                        .get("evidenceCount")
                        .and_then(|v| v.as_i64())
                        .unwrap_or(0),
                    record
                        .get("recentFailures")
                        .and_then(|v| v.as_i64())
                        .unwrap_or(0),
                    record.get("lastPracticed").and_then(|v| v.as_str()),
                    record.get("reviewDue").and_then(|v| v.as_str()),
                    record
                        .get("delayedMixedCorrect")
                        .and_then(|v| v.as_i64())
                        .unwrap_or(0),
                ],
            )
            .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

fn load_mastery(conn: &Connection, obj: &mut Map<String, Value>) -> Result<(), String> {
    let mut stmt = conn
        .prepare(
            "SELECT skill_id, mastery_score, mastery_state, fluency_score, retention_score,
                    conceptual_score, procedural_score, transfer_score, evidence_count,
                    recent_failures, last_practiced, review_due, delayed_mixed_correct
             FROM skill_mastery",
        )
        .map_err(|e| e.to_string())?;
    let mut mastery = Map::new();
    let rows = stmt
        .query_map([], |row| {
            Ok(json!({
                "skillId": row.get::<_, String>(0)?,
                "masteryScore": row.get::<_, f64>(1)?,
                "masteryState": row.get::<_, String>(2)?,
                "fluencyScore": row.get::<_, f64>(3)?,
                "retentionScore": row.get::<_, f64>(4)?,
                "conceptualScore": row.get::<_, f64>(5)?,
                "proceduralScore": row.get::<_, f64>(6)?,
                "transferScore": row.get::<_, f64>(7)?,
                "evidenceCount": row.get::<_, i64>(8)?,
                "recentFailures": row.get::<_, i64>(9)?,
                "lastPracticed": row.get::<_, Option<String>>(10)?,
                "reviewDue": row.get::<_, Option<String>>(11)?,
                "delayedMixedCorrect": row.get::<_, i64>(12)?,
            }))
        })
        .map_err(|e| e.to_string())?;
    for row in rows.flatten() {
        if let Some(id) = row.get("skillId").and_then(|v| v.as_str()) {
            mastery.insert(id.to_string(), row);
        }
    }
    obj.insert("mastery".into(), Value::Object(mastery));
    Ok(())
}

fn save_review(conn: &Connection, obj: &Map<String, Value>) -> Result<(), String> {
    conn.execute("DELETE FROM review_items", [])
        .map_err(|e| e.to_string())?;
    if let Some(items) = obj.get("reviewQueue").and_then(|v| v.as_array()) {
        for item in items {
            conn.execute(
                "INSERT INTO review_items (id, skill_id, due, interval_days, priority, reason)
                 VALUES (?1,?2,?3,?4,?5,?6)",
                params![
                    item.get("id").and_then(|v| v.as_str()).unwrap_or(""),
                    item.get("skillId").and_then(|v| v.as_str()).unwrap_or(""),
                    item.get("due").and_then(|v| v.as_str()).unwrap_or(""),
                    item.get("intervalDays")
                        .and_then(|v| v.as_i64())
                        .unwrap_or(1),
                    item.get("priority").and_then(|v| v.as_i64()).unwrap_or(50),
                    item.get("reason").and_then(|v| v.as_str()).unwrap_or(""),
                ],
            )
            .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

fn load_review(conn: &Connection, obj: &mut Map<String, Value>) -> Result<(), String> {
    let mut stmt = conn
        .prepare("SELECT id, skill_id, due, interval_days, priority, reason FROM review_items")
        .map_err(|e| e.to_string())?;
    let mut queue = Vec::new();
    let rows = stmt
        .query_map([], |row| {
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "skillId": row.get::<_, String>(1)?,
                "due": row.get::<_, String>(2)?,
                "intervalDays": row.get::<_, i64>(3)?,
                "priority": row.get::<_, i64>(4)?,
                "reason": row.get::<_, String>(5)?,
            }))
        })
        .map_err(|e| e.to_string())?;
    for row in rows.flatten() {
        queue.push(row);
    }
    obj.insert("reviewQueue".into(), Value::Array(queue));
    Ok(())
}

fn save_problems(conn: &Connection, obj: &Map<String, Value>) -> Result<(), String> {
    conn.execute("DELETE FROM problems", [])
        .map_err(|e| e.to_string())?;
    if let Some(problems) = obj.get("problems").and_then(|v| v.as_object()) {
        for (_, p) in problems {
            conn.execute(
                "INSERT INTO problems (
                  id, title, prompt, skill_ids_json, difficulty, mode, answer_type, expected_answer,
                  hint_sequence_json, worked_example_json, verification_status, source,
                  deprecated, deprecation_reason, attempt_count, created_at
                ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16)",
                params![
                    p.get("id").and_then(|v| v.as_str()).unwrap_or(""),
                    p.get("title").and_then(|v| v.as_str()).unwrap_or(""),
                    p.get("prompt").and_then(|v| v.as_str()).unwrap_or(""),
                    p.get("skillIds")
                        .map(|v| v.to_string())
                        .unwrap_or_else(|| "[]".into()),
                    p.get("difficulty").and_then(|v| v.as_f64()).unwrap_or(0.5),
                    p.get("mode")
                        .and_then(|v| v.as_str())
                        .unwrap_or("guided_practice"),
                    p.get("answerType")
                        .and_then(|v| v.as_str())
                        .unwrap_or("expression"),
                    p.get("expectedAnswer")
                        .and_then(|v| v.as_str())
                        .unwrap_or(""),
                    p.get("hintSequence")
                        .map(|v| v.to_string())
                        .unwrap_or_else(|| "[]".into()),
                    p.get("workedExample").map(|v| v.to_string()),
                    p.get("verificationStatus")
                        .and_then(|v| v.as_str())
                        .unwrap_or("verified"),
                    p.get("source")
                        .and_then(|v| v.as_str())
                        .unwrap_or("curated"),
                    if p.get("deprecated")
                        .and_then(|v| v.as_bool())
                        .unwrap_or(false)
                    {
                        1
                    } else {
                        0
                    },
                    p.get("deprecationReason").and_then(|v| v.as_str()),
                    p.get("attemptCount").and_then(|v| v.as_i64()).unwrap_or(0),
                    chrono::Utc::now().to_rfc3339(),
                ],
            )
            .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

fn load_problems(conn: &Connection, obj: &mut Map<String, Value>) -> Result<(), String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, title, prompt, skill_ids_json, difficulty, mode, answer_type, expected_answer,
                    hint_sequence_json, worked_example_json, verification_status, source,
                    deprecated, deprecation_reason, attempt_count
             FROM problems",
        )
        .map_err(|e| e.to_string())?;
    let mut problems = Map::new();
    let rows = stmt
        .query_map([], |row| {
            let skill_ids_json: String = row.get(3)?;
            let hints_json: String = row.get(8)?;
            let worked: Option<String> = row.get(9)?;
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "title": row.get::<_, String>(1)?,
                "prompt": row.get::<_, String>(2)?,
                "skillIds": serde_json::from_str::<Value>(&skill_ids_json).unwrap_or(Value::Array(vec![])),
                "difficulty": row.get::<_, f64>(4)?,
                "mode": row.get::<_, String>(5)?,
                "answerType": row.get::<_, String>(6)?,
                "expectedAnswer": row.get::<_, String>(7)?,
                "hintSequence": serde_json::from_str::<Value>(&hints_json).unwrap_or(Value::Array(vec![])),
                "workedExample": worked.and_then(|s| serde_json::from_str::<Value>(&s).ok()),
                "verificationStatus": row.get::<_, String>(10)?,
                "source": row.get::<_, String>(11)?,
                "deprecated": row.get::<_, i64>(12)? == 1,
                "deprecationReason": row.get::<_, Option<String>>(13)?,
                "attemptCount": row.get::<_, i64>(14)?,
            }))
        })
        .map_err(|e| e.to_string())?;
    for row in rows.flatten() {
        if let Some(id) = row.get("id").and_then(|v| v.as_str()) {
            problems.insert(id.to_string(), row);
        }
    }
    obj.insert("problems".into(), Value::Object(problems));
    Ok(())
}

fn save_diagnostic(conn: &Connection, obj: &Map<String, Value>) -> Result<(), String> {
    conn.execute("DELETE FROM diagnostics", [])
        .map_err(|e| e.to_string())?;
    if let Some(d) = obj.get("diagnostic") {
        if d.is_null() {
            return Ok(());
        }
        conn.execute(
            "INSERT INTO diagnostics (
              id, started_at, target_count, answered_count, current_index,
              queue_json, weak_skills_json, strong_skills_json, completed, summary_json,
              skill_probes_json, continuing, trigger_reason
            ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)",
            params![
                d.get("id").and_then(|v| v.as_str()).unwrap_or("diag"),
                d.get("startedAt").and_then(|v| v.as_str()).unwrap_or(""),
                d.get("targetCount").and_then(|v| v.as_i64()).unwrap_or(25),
                d.get("answeredCount").and_then(|v| v.as_i64()).unwrap_or(0),
                d.get("currentIndex").and_then(|v| v.as_i64()).unwrap_or(0),
                d.get("queue")
                    .map(|v| v.to_string())
                    .unwrap_or_else(|| "[]".into()),
                d.get("weakSkills")
                    .map(|v| v.to_string())
                    .unwrap_or_else(|| "[]".into()),
                d.get("strongSkills")
                    .map(|v| v.to_string())
                    .unwrap_or_else(|| "[]".into()),
                if d.get("completed")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false)
                {
                    1
                } else {
                    0
                },
                d.get("summary").map(|v| v.to_string()),
                d.get("skillProbes")
                    .map(|v| v.to_string())
                    .unwrap_or_else(|| "{}".into()),
                if d.get("continuing").and_then(|v| v.as_bool()).unwrap_or(false) {
                    1
                } else {
                    0
                },
                d.get("triggerReason").and_then(|v| v.as_str()),
            ],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn load_diagnostic(conn: &Connection, obj: &mut Map<String, Value>) -> Result<(), String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, started_at, target_count, answered_count, current_index,
                    queue_json, weak_skills_json, strong_skills_json, completed, summary_json,
                    skill_probes_json, continuing, trigger_reason
             FROM diagnostics ORDER BY started_at DESC LIMIT 1",
        )
        .map_err(|e| e.to_string())?;
    let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
    let row = match rows.next().map_err(|e| e.to_string())? {
        Some(r) => r,
        None => return Ok(()),
    };
    let summary: Option<String> = row.get(9).map_err(|e| e.to_string())?;
    let skill_probes_raw: Option<String> = row.get(10).ok();
    let continuing: i64 = row.get(11).unwrap_or(0);
    let trigger_reason: Option<String> = row.get(12).ok();
    obj.insert(
        "diagnostic".into(),
        json!({
            "id": row.get::<_, String>(0).map_err(|e| e.to_string())?,
            "startedAt": row.get::<_, String>(1).map_err(|e| e.to_string())?,
            "targetCount": row.get::<_, i64>(2).map_err(|e| e.to_string())?,
            "answeredCount": row.get::<_, i64>(3).map_err(|e| e.to_string())?,
            "currentIndex": row.get::<_, i64>(4).map_err(|e| e.to_string())?,
            "queue": serde_json::from_str::<Value>(&row.get::<_, String>(5).map_err(|e| e.to_string())?).unwrap_or(Value::Array(vec![])),
            "weakSkills": serde_json::from_str::<Value>(&row.get::<_, String>(6).map_err(|e| e.to_string())?).unwrap_or(Value::Array(vec![])),
            "strongSkills": serde_json::from_str::<Value>(&row.get::<_, String>(7).map_err(|e| e.to_string())?).unwrap_or(Value::Array(vec![])),
            "completed": row.get::<_, i64>(8).map_err(|e| e.to_string())? == 1,
            "summary": summary.and_then(|s| serde_json::from_str::<Value>(&s).ok()),
            "skillProbes": skill_probes_raw
                .and_then(|s| serde_json::from_str::<Value>(&s).ok())
                .unwrap_or(Value::Object(Map::new())),
            "continuing": continuing == 1,
            "triggerReason": trigger_reason,
        }),
    );
    Ok(())
}

fn save_homework(conn: &Connection, obj: &Map<String, Value>) -> Result<(), String> {
    conn.execute("DELETE FROM homework_analyses", [])
        .map_err(|e| e.to_string())?;
    if let Some(items) = obj.get("homeworkAnalyses").and_then(|v| v.as_array()) {
        for h in items {
            conn.execute(
                "INSERT INTO homework_analyses (
                  id, created_at, detected_topic, problem_text, extracted_work_summary,
                  correctness, mistake_tags_json, skills_affected_json, feedback_summary,
                  raw_image_saved, image_path, step_feedback_json, repair_recommendation_json,
                  steps_json, wrong_step_index, detected_problems_json
                ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16)",
                params![
                    h.get("id").and_then(|v| v.as_str()).unwrap_or(""),
                    h.get("createdAt").and_then(|v| v.as_str()).unwrap_or(""),
                    h.get("detectedTopic")
                        .and_then(|v| v.as_str())
                        .unwrap_or(""),
                    h.get("problemText").and_then(|v| v.as_str()).unwrap_or(""),
                    h.get("extractedWorkSummary")
                        .and_then(|v| v.as_str())
                        .unwrap_or(""),
                    h.get("correctness")
                        .and_then(|v| v.as_str())
                        .unwrap_or("unclear"),
                    h.get("mistakeTags")
                        .map(|v| v.to_string())
                        .unwrap_or_else(|| "[]".into()),
                    h.get("skillsAffected")
                        .map(|v| v.to_string())
                        .unwrap_or_else(|| "[]".into()),
                    h.get("feedbackSummary")
                        .and_then(|v| v.as_str())
                        .unwrap_or(""),
                    if h.get("rawImageSaved")
                        .and_then(|v| v.as_bool())
                        .unwrap_or(false)
                    {
                        1
                    } else {
                        0
                    },
                    h.get("imagePath").and_then(|v| v.as_str()),
                    h.get("stepFeedback")
                        .map(|v| v.to_string())
                        .unwrap_or_else(|| "[]".into()),
                    h.get("repairRecommendation")
                        .filter(|v| !v.is_null())
                        .map(|v| v.to_string()),
                    h.get("steps").map(|v| v.to_string()),
                    h.get("wrongStepIndex").and_then(|v| v.as_i64()),
                    h.get("detectedProblems").map(|v| v.to_string()),
                ],
            )
            .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

fn load_homework(conn: &Connection, obj: &mut Map<String, Value>) -> Result<(), String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, created_at, detected_topic, problem_text, extracted_work_summary,
                    correctness, mistake_tags_json, skills_affected_json, feedback_summary,
                    raw_image_saved, image_path, step_feedback_json, repair_recommendation_json,
                    steps_json, wrong_step_index, detected_problems_json
             FROM homework_analyses ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;
    let mut list = Vec::new();
    let rows = stmt
        .query_map([], |row| {
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "createdAt": row.get::<_, String>(1)?,
                "detectedTopic": row.get::<_, String>(2)?,
                "problemText": row.get::<_, String>(3)?,
                "extractedWorkSummary": row.get::<_, String>(4)?,
                "correctness": row.get::<_, String>(5)?,
                "mistakeTags": serde_json::from_str::<Value>(&row.get::<_, String>(6)?).unwrap_or(Value::Array(vec![])),
                "skillsAffected": serde_json::from_str::<Value>(&row.get::<_, String>(7)?).unwrap_or(Value::Array(vec![])),
                "feedbackSummary": row.get::<_, String>(8)?,
                "rawImageSaved": row.get::<_, i64>(9)? == 1,
                "imagePath": row.get::<_, Option<String>>(10)?,
                "stepFeedback": row.get::<_, Option<String>>(11)?.and_then(|s| serde_json::from_str::<Value>(&s).ok()).unwrap_or(Value::Array(vec![])),
                "repairRecommendation": row.get::<_, Option<String>>(12)?.and_then(|s| serde_json::from_str::<Value>(&s).ok()),
                "steps": row.get::<_, Option<String>>(13)?.and_then(|s| serde_json::from_str::<Value>(&s).ok()),
                "wrongStepIndex": row.get::<_, Option<i64>>(14)?,
                "detectedProblems": row.get::<_, Option<String>>(15)?.and_then(|s| serde_json::from_str::<Value>(&s).ok()),
            }))
        })
        .map_err(|e| e.to_string())?;
    for row in rows.flatten() {
        list.push(row);
    }
    obj.insert("homeworkAnalyses".into(), Value::Array(list));
    Ok(())
}

fn save_attempts(conn: &Connection, obj: &Map<String, Value>) -> Result<(), String> {
    conn.execute("DELETE FROM attempts", [])
        .map_err(|e| e.to_string())?;
    if let Some(items) = obj.get("attempts").and_then(|v| v.as_array()) {
        for a in items {
            conn.execute(
                "INSERT INTO attempts (
                  id, problem_id, skill_ids, answer_raw, correct, mode, hint_count, seconds,
                  mixed, delayed, confidence, mistake_tags, mastery_delta, created_at, resource_id
                ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15)",
                params![
                    a.get("id").and_then(|v| v.as_str()).unwrap_or(""),
                    a.get("problemId").and_then(|v| v.as_str()).unwrap_or(""),
                    a.get("skillIds")
                        .map(|v| v.to_string())
                        .unwrap_or_else(|| "[]".into()),
                    a.get("answer").and_then(|v| v.as_str()).unwrap_or(""),
                    if a.get("correct").and_then(|v| v.as_bool()).unwrap_or(false) {
                        1
                    } else {
                        0
                    },
                    a.get("mode").and_then(|v| v.as_str()).unwrap_or("guided"),
                    a.get("hintCount").and_then(|v| v.as_i64()).unwrap_or(0),
                    a.get("seconds").and_then(|v| v.as_i64()).unwrap_or(0),
                    if a.get("mixed").and_then(|v| v.as_bool()).unwrap_or(false) {
                        1
                    } else {
                        0
                    },
                    if a.get("delayed").and_then(|v| v.as_bool()).unwrap_or(false) {
                        1
                    } else {
                        0
                    },
                    a.get("confidence").and_then(|v| v.as_f64()),
                    a.get("mistakeTags").map(|v| v.to_string()),
                    a.get("masteryDelta")
                        .and_then(|v| v.as_f64())
                        .unwrap_or(0.0),
                    a.get("createdAt").and_then(|v| v.as_str()).unwrap_or(""),
                    a.get("resourceId").and_then(|v| v.as_str()),
                ],
            )
            .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

fn load_attempts(conn: &Connection, obj: &mut Map<String, Value>) -> Result<(), String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, problem_id, skill_ids, answer_raw, correct, mode, hint_count, seconds,
                    mixed, delayed, confidence, mistake_tags, mastery_delta, created_at, resource_id
             FROM attempts ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;
    let mut list = Vec::new();
    let rows = stmt
        .query_map([], |row| {
            let tags: Option<String> = row.get(11)?;
            let resource_id: Option<String> = row.get(14).ok();
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "problemId": row.get::<_, String>(1)?,
                "skillIds": serde_json::from_str::<Value>(&row.get::<_, String>(2)?).unwrap_or(Value::Array(vec![])),
                "answer": row.get::<_, String>(3)?,
                "correct": row.get::<_, i64>(4)? == 1,
                "mode": row.get::<_, String>(5)?,
                "hintCount": row.get::<_, i64>(6)?,
                "seconds": row.get::<_, i64>(7)?,
                "mixed": row.get::<_, i64>(8)? == 1,
                "delayed": row.get::<_, i64>(9)? == 1,
                "confidence": row.get::<_, Option<f64>>(10)?,
                "mistakeTags": tags.and_then(|s| serde_json::from_str::<Value>(&s).ok()),
                "masteryDelta": row.get::<_, f64>(12)?,
                "createdAt": row.get::<_, String>(13)?,
                "resourceId": resource_id,
            }))
        })
        .map_err(|e| e.to_string())?;
    for row in rows.flatten() {
        list.push(row);
    }
    obj.insert("attempts".into(), Value::Array(list));
    Ok(())
}

fn save_changelog(conn: &Connection, obj: &Map<String, Value>) -> Result<(), String> {
    conn.execute("DELETE FROM changelog", [])
        .map_err(|e| e.to_string())?;
    if let Some(items) = obj.get("changelog").and_then(|v| v.as_array()) {
        for entry in items {
            if let Some(summary) = entry.as_str() {
                conn.execute(
                    "INSERT INTO changelog (created_at, summary) VALUES (?1, ?2)",
                    params![chrono::Utc::now().to_rfc3339(), summary],
                )
                .map_err(|e| e.to_string())?;
            }
        }
    }
    Ok(())
}

fn load_changelog(conn: &Connection, obj: &mut Map<String, Value>) -> Result<(), String> {
    let mut stmt = conn
        .prepare("SELECT summary FROM changelog ORDER BY id DESC LIMIT 50")
        .map_err(|e| e.to_string())?;
    let mut list = Vec::new();
    let rows = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?;
    for row in rows.flatten() {
        list.push(Value::String(row));
    }
    obj.insert("changelog".into(), Value::Array(list));
    Ok(())
}

fn save_mistake_patterns(conn: &Connection, obj: &Map<String, Value>) -> Result<(), String> {
    conn.execute("DELETE FROM mistake_patterns", [])
        .map_err(|e| e.to_string())?;
    if let Some(patterns) = obj.get("mistakePatterns").and_then(|v| v.as_object()) {
        for (_, pattern) in patterns {
            conn.execute(
                "INSERT INTO mistake_patterns (tag, skill_ids_json, count, last_seen, note)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![
                    pattern.get("tag").and_then(|v| v.as_str()).unwrap_or(""),
                    pattern
                        .get("skillIds")
                        .map(|v| v.to_string())
                        .unwrap_or_else(|| "[]".into()),
                    pattern.get("count").and_then(|v| v.as_i64()).unwrap_or(0),
                    pattern
                        .get("lastSeen")
                        .and_then(|v| v.as_str())
                        .unwrap_or(""),
                    pattern.get("note").and_then(|v| v.as_str()).unwrap_or(""),
                ],
            )
            .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

fn load_mistake_patterns(conn: &Connection, obj: &mut Map<String, Value>) -> Result<(), String> {
    let mut stmt = conn
        .prepare("SELECT tag, skill_ids_json, count, last_seen, note FROM mistake_patterns")
        .map_err(|e| e.to_string())?;
    let mut map = Map::new();
    let rows = stmt
        .query_map([], |row| {
            Ok(json!({
                "tag": row.get::<_, String>(0)?,
                "skillIds": serde_json::from_str::<Value>(&row.get::<_, String>(1)?).unwrap_or(Value::Array(vec![])),
                "count": row.get::<_, i64>(2)?,
                "lastSeen": row.get::<_, String>(3)?,
                "note": row.get::<_, String>(4)?,
            }))
        })
        .map_err(|e| e.to_string())?;
    for row in rows.flatten() {
        if let Some(tag) = row.get("tag").and_then(|v| v.as_str()) {
            map.insert(tag.into(), row);
        }
    }
    obj.insert("mistakePatterns".into(), Value::Object(map));
    Ok(())
}

fn save_resource_effectiveness(conn: &Connection, obj: &Map<String, Value>) -> Result<(), String> {
    conn.execute("DELETE FROM resource_effectiveness", [])
        .map_err(|e| e.to_string())?;
    if let Some(resources) = obj.get("resources").and_then(|v| v.as_object()) {
        let now = chrono::Utc::now().to_rfc3339();
        for (id, resource) in resources {
            conn.execute(
                "INSERT INTO resource_effectiveness (resource_id, effectiveness_score, notes, updated_at)
                 VALUES (?1, ?2, ?3, ?4)",
                params![
                    id,
                    resource.get("effectivenessScore").and_then(|v| v.as_f64()).unwrap_or(0.5),
                    resource.get("notes").and_then(|v| v.as_str()).unwrap_or(""),
                    now,
                ],
            )
            .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

fn load_resource_effectiveness(
    conn: &Connection,
    obj: &mut Map<String, Value>,
) -> Result<(), String> {
    let mut stmt = conn
        .prepare("SELECT resource_id, effectiveness_score, notes FROM resource_effectiveness")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, f64>(1)?,
                row.get::<_, String>(2)?,
            ))
        })
        .map_err(|e| e.to_string())?;
    if obj.get("resources").is_none() {
        obj.insert("resources".into(), Value::Object(Map::new()));
    }
    if let Some(resources) = obj.get_mut("resources").and_then(|v| v.as_object_mut()) {
        for row in rows.flatten() {
            let (id, score, notes) = row;
            let entry = resources.entry(id.clone()).or_insert_with(|| {
                json!({
                    "id": id,
                    "title": id,
                    "source": "",
                    "url": "",
                    "skillIds": [],
                    "duration": "—",
                    "format": "video",
                    "effectivenessScore": score,
                    "notes": notes,
                })
            });
            if let Some(resource) = entry.as_object_mut() {
                resource.insert("effectivenessScore".into(), json!(score));
                if !notes.is_empty() {
                    resource.insert("notes".into(), json!(notes));
                }
            }
        }
    }
    Ok(())
}

fn load_resources_table(conn: &Connection, obj: &mut Map<String, Value>) -> Result<(), String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, title, url, source, duration, skill_ids_json, effectiveness_score
             FROM resources",
        )
        .map_err(|e| e.to_string())?;
    if obj.get("resources").is_none() {
        obj.insert("resources".into(), Value::Object(Map::new()));
    }
    let rows = stmt
        .query_map([], |row| {
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "title": row.get::<_, String>(1)?,
                "url": row.get::<_, String>(2)?,
                "source": row.get::<_, String>(3)?,
                "duration": row.get::<_, String>(4)?,
                "skillIds": serde_json::from_str::<Value>(&row.get::<_, String>(5)?).unwrap_or(Value::Array(vec![])),
                "format": "video",
                "effectivenessScore": row.get::<_, f64>(6)?,
                "notes": "",
            }))
        })
        .map_err(|e| e.to_string())?;
    if let Some(resources) = obj.get_mut("resources").and_then(|v| v.as_object_mut()) {
        for row in rows.flatten() {
            if let Some(id) = row.get("id").and_then(|v| v.as_str()) {
                let existing = resources.get(id).cloned().unwrap_or(row.clone());
                let mut merged = existing.as_object().cloned().unwrap_or_default();
                if let Some(patch) = row.as_object() {
                    for (k, v) in patch {
                        merged.insert(k.clone(), v.clone());
                    }
                }
                resources.insert(id.to_string(), Value::Object(merged));
            }
        }
    }
    Ok(())
}

fn load_resource_events(conn: &Connection, obj: &mut Map<String, Value>) -> Result<(), String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, resource_id, event_type, helpful, created_at
             FROM resource_events ORDER BY created_at DESC LIMIT 200",
        )
        .map_err(|e| e.to_string())?;
    let mut list = Vec::new();
    let rows = stmt
        .query_map([], |row| {
            let helpful: Option<i64> = row.get(3)?;
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "resourceId": row.get::<_, String>(1)?,
                "eventType": row.get::<_, String>(2)?,
                "helpful": helpful.map(|v| v == 1),
                "createdAt": row.get::<_, String>(4)?,
            }))
        })
        .map_err(|e| e.to_string())?;
    for row in rows.flatten() {
        list.push(row);
    }
    if !list.is_empty() {
        obj.insert("resourceEvents".into(), Value::Array(list));
    }
    Ok(())
}

fn save_ai_calls(conn: &Connection, obj: &Map<String, Value>) -> Result<(), String> {
    conn.execute("DELETE FROM ai_calls", [])
        .map_err(|e| e.to_string())?;
    if let Some(calls) = obj.get("aiCalls").and_then(|v| v.as_array()) {
        for call in calls {
            conn.execute(
                "INSERT INTO ai_calls (
                  id, created_at, task, mode, prompt_preview, status, prompt_hash,
                  response_preview, stderr_preview, session_id
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                params![
                    call.get("id").and_then(|v| v.as_str()).unwrap_or(""),
                    call.get("createdAt").and_then(|v| v.as_str()).unwrap_or(""),
                    call.get("task").and_then(|v| v.as_str()).unwrap_or(""),
                    call.get("mode").and_then(|v| v.as_str()).unwrap_or(""),
                    call.get("promptPreview")
                        .and_then(|v| v.as_str())
                        .unwrap_or(""),
                    call.get("status").and_then(|v| v.as_str()).unwrap_or(""),
                    call.get("promptHash").and_then(|v| v.as_str()),
                    call.get("responsePreview").and_then(|v| v.as_str()),
                    call.get("stderrPreview").and_then(|v| v.as_str()),
                    call.get("sessionId").and_then(|v| v.as_str()),
                ],
            )
            .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

fn load_ai_calls(conn: &Connection, obj: &mut Map<String, Value>) -> Result<(), String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, created_at, task, mode, prompt_preview, status, prompt_hash,
                    response_preview, stderr_preview, session_id
             FROM ai_calls ORDER BY created_at DESC LIMIT 100",
        )
        .map_err(|e| e.to_string())?;
    let mut list = Vec::new();
    let rows = stmt
        .query_map([], |row| {
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "createdAt": row.get::<_, String>(1)?,
                "task": row.get::<_, String>(2)?,
                "mode": row.get::<_, String>(3)?,
                "promptPreview": row.get::<_, String>(4)?,
                "status": row.get::<_, String>(5)?,
                "promptHash": row.get::<_, Option<String>>(6)?,
                "responsePreview": row.get::<_, Option<String>>(7)?,
                "stderrPreview": row.get::<_, Option<String>>(8)?,
                "sessionId": row.get::<_, Option<String>>(9)?,
            }))
        })
        .map_err(|e| e.to_string())?;
    for row in rows.flatten() {
        list.push(row);
    }
    obj.insert("aiCalls".into(), Value::Array(list));
    Ok(())
}

fn save_review_events(conn: &Connection, obj: &Map<String, Value>) -> Result<(), String> {
    conn.execute("DELETE FROM review_events", [])
        .map_err(|e| e.to_string())?;
    if let Some(items) = obj.get("reviewQueue").and_then(|v| v.as_array()) {
        let now = chrono::Utc::now().to_rfc3339();
        for (i, item) in items.iter().enumerate() {
            conn.execute(
                "INSERT INTO review_events (id, skill_id, review_type, due, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![
                    format!("review-{}", i),
                    item.get("skillId").and_then(|v| v.as_str()).unwrap_or(""),
                    item.get("reviewType")
                        .and_then(|v| v.as_str())
                        .unwrap_or("procedural"),
                    item.get("due").and_then(|v| v.as_str()).unwrap_or(""),
                    now,
                ],
            )
            .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

fn save_session_events(conn: &Connection, obj: &Map<String, Value>) -> Result<(), String> {
    if let Some(session) = obj.get("dailySession") {
        let session_id = session
            .get("startedAt")
            .and_then(|v| v.as_str())
            .unwrap_or("session");
        let phase_index = session
            .get("phaseIndex")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);
        let event_id = format!("{}-phase-{}", session_id, phase_index);
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT OR REPLACE INTO session_events (id, session_id, event_type, payload_json, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                event_id,
                session_id,
                "phase_advance",
                session.to_string(),
                now,
            ],
        )
        .ok();
        conn.execute(
            "INSERT OR REPLACE INTO sessions (id, started_at, ended_at, pace, phases_json)
             VALUES (?1, ?2, NULL, ?3, ?4)",
            params![
                session_id,
                session
                    .get("startedAt")
                    .and_then(|v| v.as_str())
                    .unwrap_or(&now),
                session
                    .get("pace")
                    .and_then(|v| v.as_str())
                    .unwrap_or("normal"),
                session
                    .get("phases")
                    .map(|v| v.to_string())
                    .unwrap_or_else(|| "[]".into()),
            ],
        )
        .ok();
    }
    Ok(())
}

fn save_search_index(conn: &Connection, obj: &Map<String, Value>) -> Result<(), String> {
    conn.execute("DELETE FROM search_index", [])
        .map_err(|e| e.to_string())?;

    if let Some(skills) = obj.get("skills").and_then(|v| v.as_object()) {
        for (id, skill) in skills {
            let name = skill.get("name").and_then(|v| v.as_str()).unwrap_or("");
            let area = skill.get("area").and_then(|v| v.as_str()).unwrap_or("");
            conn.execute(
                "INSERT INTO search_index (entity_type, entity_id, body) VALUES (?1, ?2, ?3)",
                params!["skill", id, format!("{id} {name} {area}")],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    if let Some(problems) = obj.get("problems").and_then(|v| v.as_object()) {
        for (id, problem) in problems {
            if problem
                .get("deprecated")
                .and_then(|v| v.as_bool())
                .unwrap_or(false)
            {
                continue;
            }
            let title = problem.get("title").and_then(|v| v.as_str()).unwrap_or("");
            let prompt = problem.get("prompt").and_then(|v| v.as_str()).unwrap_or("");
            conn.execute(
                "INSERT INTO search_index (entity_type, entity_id, body) VALUES (?1, ?2, ?3)",
                params!["problem", id, format!("{title} {prompt}")],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    if let Some(resources) = obj.get("resources").and_then(|v| v.as_object()) {
        for (id, resource) in resources {
            let title = resource.get("title").and_then(|v| v.as_str()).unwrap_or("");
            let source = resource
                .get("source")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            conn.execute(
                "INSERT INTO search_index (entity_type, entity_id, body) VALUES (?1, ?2, ?3)",
                params!["resource", id, format!("{title} {source}")],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    if let Some(items) = obj.get("homeworkAnalyses").and_then(|v| v.as_array()) {
        for h in items {
            let id = h.get("id").and_then(|v| v.as_str()).unwrap_or("");
            let topic = h
                .get("detectedTopic")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let text = h.get("problemText").and_then(|v| v.as_str()).unwrap_or("");
            conn.execute(
                "INSERT INTO search_index (entity_type, entity_id, body) VALUES (?1, ?2, ?3)",
                params!["homework", id, format!("{topic} {text}")],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

fn save_diagnostic_items(conn: &Connection, obj: &Map<String, Value>) -> Result<(), String> {
    conn.execute("DELETE FROM diagnostic_items", [])
        .map_err(|e| e.to_string())?;
    let session_id = obj
        .get("diagnostic")
        .and_then(|d| d.get("id"))
        .and_then(|v| v.as_str())
        .unwrap_or("standalone");
    let problems = obj.get("problems").and_then(|v| v.as_object());
    if let Some(items) = obj.get("attempts").and_then(|v| v.as_array()) {
        for a in items {
            if a.get("mode").and_then(|v| v.as_str()) != Some("diagnostic") {
                continue;
            }
            let problem_id = a.get("problemId").and_then(|v| v.as_str()).unwrap_or("");
            let question_type = problems
                .and_then(|p| p.get(problem_id))
                .and_then(|prob| prob.get("source"))
                .and_then(|s| s.as_str())
                .unwrap_or("procedural");
            conn.execute(
                "INSERT INTO diagnostic_items (
                  id, session_id, problem_id, skill_ids_json, answer_raw, correct, question_type, created_at
                ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8)",
                params![
                    a.get("id").and_then(|v| v.as_str()).unwrap_or(""),
                    session_id,
                    problem_id,
                    a.get("skillIds").map(|v| v.to_string()).unwrap_or_else(|| "[]".into()),
                    a.get("answer").and_then(|v| v.as_str()).unwrap_or(""),
                    if a.get("correct").and_then(|v| v.as_bool()).unwrap_or(false) {
                        1
                    } else {
                        0
                    },
                    question_type,
                    a.get("createdAt").and_then(|v| v.as_str()).unwrap_or(""),
                ],
            )
            .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

fn save_skills_graph(conn: &Connection, obj: &Map<String, Value>) -> Result<(), String> {
    conn.execute("DELETE FROM skill_edges", [])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM skills", [])
        .map_err(|e| e.to_string())?;
    if let Some(skills) = obj.get("skills").and_then(|v| v.as_object()) {
        for (id, skill) in skills {
            conn.execute(
                "INSERT INTO skills (id, name, area, course, type, prerequisites_json, supports_json)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    id,
                    skill.get("name").and_then(|v| v.as_str()).unwrap_or(""),
                    skill.get("area").and_then(|v| v.as_str()).unwrap_or(""),
                    skill.get("course").and_then(|v| v.as_str()).unwrap_or(""),
                    skill.get("type").and_then(|v| v.as_str()).unwrap_or("mixed"),
                    skill
                        .get("prerequisites")
                        .map(|v| v.to_string())
                        .unwrap_or_else(|| "[]".into()),
                    skill
                        .get("supports")
                        .map(|v| v.to_string())
                        .unwrap_or_else(|| "[]".into()),
                ],
            )
            .map_err(|e| e.to_string())?;
            if let Some(prereqs) = skill.get("prerequisites").and_then(|v| v.as_array()) {
                for prereq in prereqs {
                    if let Some(from_id) = prereq.as_str() {
                        conn.execute(
                            "INSERT OR IGNORE INTO skill_edges (from_skill_id, to_skill_id, edge_type)
                             VALUES (?1, ?2, 'prerequisite')",
                            params![from_id, id],
                        )
                        .map_err(|e| e.to_string())?;
                    }
                }
            }
            if let Some(supports) = skill.get("supports").and_then(|v| v.as_array()) {
                for support in supports {
                    if let Some(to_id) = support.as_str() {
                        conn.execute(
                            "INSERT OR IGNORE INTO skill_edges (from_skill_id, to_skill_id, edge_type)
                             VALUES (?1, ?2, 'supports')",
                            params![id, to_id],
                        )
                        .map_err(|e| e.to_string())?;
                    }
                }
            }
        }
    }
    Ok(())
}

fn save_resources_table(conn: &Connection, obj: &Map<String, Value>) -> Result<(), String> {
    conn.execute("DELETE FROM resources", [])
        .map_err(|e| e.to_string())?;
    if let Some(resources) = obj.get("resources").and_then(|v| v.as_object()) {
        for (id, resource) in resources {
            conn.execute(
                "INSERT INTO resources (id, title, url, source, duration, skill_ids_json, effectiveness_score)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    id,
                    resource.get("title").and_then(|v| v.as_str()).unwrap_or(""),
                    resource.get("url").and_then(|v| v.as_str()).unwrap_or(""),
                    resource.get("source").and_then(|v| v.as_str()).unwrap_or(""),
                    resource.get("duration").and_then(|v| v.as_str()).unwrap_or(""),
                    resource
                        .get("skillIds")
                        .map(|v| v.to_string())
                        .unwrap_or_else(|| "[]".into()),
                    resource
                        .get("effectivenessScore")
                        .and_then(|v| v.as_f64())
                        .unwrap_or(0.5),
                ],
            )
            .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

fn save_resource_events(conn: &Connection, obj: &Map<String, Value>) -> Result<(), String> {
    conn.execute("DELETE FROM resource_events", [])
        .map_err(|e| e.to_string())?;
    if let Some(events) = obj.get("resourceEvents").and_then(|v| v.as_array()) {
        for event in events {
            conn.execute(
                "INSERT INTO resource_events (id, resource_id, event_type, helpful, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![
                    event.get("id").and_then(|v| v.as_str()).unwrap_or(""),
                    event
                        .get("resourceId")
                        .and_then(|v| v.as_str())
                        .unwrap_or(""),
                    event
                        .get("eventType")
                        .and_then(|v| v.as_str())
                        .unwrap_or(""),
                    event
                        .get("helpful")
                        .and_then(|v| v.as_bool())
                        .map(|b| if b { 1 } else { 0 }),
                    event
                        .get("createdAt")
                        .and_then(|v| v.as_str())
                        .unwrap_or(""),
                ],
            )
            .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

fn save_maintenance_runs(conn: &Connection, obj: &Map<String, Value>) -> Result<(), String> {
    conn.execute("DELETE FROM maintenance_runs", [])
        .map_err(|e| e.to_string())?;
    if let Some(runs) = obj.get("maintenanceRuns").and_then(|v| v.as_array()) {
        for run in runs {
            conn.execute(
                "INSERT INTO maintenance_runs (
                  id, started_at, ended_at, trigger, jobs_run_json, changes_made_json,
                  backups_created_json, skills_updated_json, memories_updated_json,
                  problem_bank_changes_json, resource_rank_changes_json,
                  review_schedule_changes_json, warnings_json
                ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)",
                params![
                    run.get("id").and_then(|v| v.as_str()).unwrap_or(""),
                    run.get("startedAt").and_then(|v| v.as_str()).unwrap_or(""),
                    run.get("endedAt").and_then(|v| v.as_str()).unwrap_or(""),
                    run.get("trigger").and_then(|v| v.as_str()).unwrap_or(""),
                    run.get("jobsRun").map(|v| v.to_string()).unwrap_or_else(|| "[]".into()),
                    run.get("changesMade")
                        .map(|v| v.to_string())
                        .unwrap_or_else(|| "[]".into()),
                    run.get("backupsCreated")
                        .map(|v| v.to_string())
                        .unwrap_or_else(|| "[]".into()),
                    run.get("skillsUpdated")
                        .map(|v| v.to_string())
                        .unwrap_or_else(|| "[]".into()),
                    run.get("memoriesUpdated")
                        .map(|v| v.to_string())
                        .unwrap_or_else(|| "[]".into()),
                    run.get("problemBankChanges")
                        .map(|v| v.to_string())
                        .unwrap_or_else(|| "[]".into()),
                    run.get("resourceRankChanges")
                        .map(|v| v.to_string())
                        .unwrap_or_else(|| "[]".into()),
                    run.get("reviewScheduleChanges")
                        .map(|v| v.to_string())
                        .unwrap_or_else(|| "[]".into()),
                    run.get("warnings")
                        .map(|v| v.to_string())
                        .unwrap_or_else(|| "[]".into()),
                ],
            )
            .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

fn load_skills_graph(conn: &Connection, obj: &mut Map<String, Value>) -> Result<(), String> {
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM skills", [], |r| r.get(0))
        .unwrap_or(0);
    if count == 0 {
        return Ok(());
    }
    let mut stmt = conn
        .prepare(
            "SELECT id, name, area, course, type, prerequisites_json, supports_json FROM skills",
        )
        .map_err(|e| e.to_string())?;
    let mut skills = Map::new();
    let rows = stmt
        .query_map([], |row| {
            let id: String = row.get(0)?;
            let prereqs_json: String = row.get(5)?;
            let supports_json: String = row.get(6)?;
            Ok((
                id,
                json!({
                    "id": row.get::<_, String>(0)?,
                    "name": row.get::<_, String>(1)?,
                    "area": row.get::<_, String>(2)?,
                    "course": row.get::<_, String>(3)?,
                    "type": row.get::<_, String>(4)?,
                    "prerequisites": serde_json::from_str::<Value>(&prereqs_json).unwrap_or(Value::Array(vec![])),
                    "supports": serde_json::from_str::<Value>(&supports_json).unwrap_or(Value::Array(vec![])),
                }),
            ))
        })
        .map_err(|e| e.to_string())?;
    for row in rows.flatten() {
        let (id, skill) = row;
        skills.insert(id, skill);
    }
    if !skills.is_empty() {
        obj.insert("skills".into(), Value::Object(skills));
    }
    Ok(())
}

fn load_daily_session(conn: &Connection, obj: &mut Map<String, Value>) -> Result<(), String> {
    if obj.contains_key("dailySession") {
        return Ok(());
    }
    let mut stmt = conn
        .prepare(
            "SELECT started_at, pace, phases_json FROM sessions ORDER BY started_at DESC LIMIT 1",
        )
        .map_err(|e| e.to_string())?;
    let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
    let Some(row) = rows.next().map_err(|e| e.to_string())? else {
        return Ok(());
    };
    let started_at: String = row.get(0).map_err(|e| e.to_string())?;
    let pace: String = row.get(1).map_err(|e| e.to_string())?;
    let phases_json: String = row.get(2).map_err(|e| e.to_string())?;
    let phases = serde_json::from_str::<Value>(&phases_json).unwrap_or(Value::Array(vec![]));
    let phase_index = phases.as_array().map(|a| a.len().saturating_sub(1)).unwrap_or(0) as i64;
    obj.insert(
        "dailySession".into(),
        json!({
            "startedAt": started_at,
            "pace": pace,
            "phases": phases,
            "phaseIndex": phase_index,
        }),
    );
    Ok(())
}

fn load_maintenance_runs(conn: &Connection, obj: &mut Map<String, Value>) -> Result<(), String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, started_at, ended_at, trigger, jobs_run_json, changes_made_json,
                    backups_created_json, skills_updated_json, memories_updated_json,
                    problem_bank_changes_json, resource_rank_changes_json,
                    review_schedule_changes_json, warnings_json
             FROM maintenance_runs ORDER BY ended_at DESC LIMIT 50",
        )
        .map_err(|e| e.to_string())?;
    let mut list = Vec::new();
    let rows = stmt
        .query_map([], |row| {
            let parse_arr = |i: usize| -> Value {
                let s: String = row.get(i).unwrap_or_else(|_| "[]".into());
                serde_json::from_str(&s).unwrap_or(Value::Array(vec![]))
            };
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "startedAt": row.get::<_, String>(1)?,
                "endedAt": row.get::<_, String>(2)?,
                "trigger": row.get::<_, String>(3)?,
                "jobsRun": parse_arr(4),
                "changesMade": parse_arr(5),
                "backupsCreated": parse_arr(6),
                "skillsUpdated": parse_arr(7),
                "memoriesUpdated": parse_arr(8),
                "problemBankChanges": parse_arr(9),
                "resourceRankChanges": parse_arr(10),
                "reviewScheduleChanges": parse_arr(11),
                "warnings": parse_arr(12),
            }))
        })
        .map_err(|e| e.to_string())?;
    for row in rows.flatten() {
        list.push(row);
    }
    if !list.is_empty() {
        obj.insert("maintenanceRuns".into(), Value::Array(list));
    }
    Ok(())
}

pub fn search_index_query(
    conn: &Connection,
    query: &str,
    limit: i64,
) -> Result<Vec<Value>, String> {
    let trimmed = query.trim();
    if trimmed.len() < 2 {
        return Ok(vec![]);
    }
    let fts = trimmed
        .split_whitespace()
        .map(|token| format!("\"{}\"*", token.replace('"', " ")))
        .collect::<Vec<_>>()
        .join(" AND ");
    let mut stmt = conn
        .prepare(
            "SELECT entity_type, entity_id, body FROM search_index WHERE body MATCH ?1 LIMIT ?2",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![fts, limit], |row| {
            Ok(json!({
                "entityType": row.get::<_, String>(0)?,
                "entityId": row.get::<_, String>(1)?,
                "body": row.get::<_, String>(2)?,
            }))
        })
        .map_err(|e| e.to_string())?;
    Ok(rows.flatten().collect())
}
