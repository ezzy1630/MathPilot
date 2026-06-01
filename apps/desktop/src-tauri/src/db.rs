use crate::migrations;
use crate::relational;
use rusqlite::{params, Connection};
use std::io::{Read, Write};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

pub struct DbState(pub Mutex<Connection>);

fn db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("mathpilot.sqlite"))
}

fn repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("..")
        .join("..")
}

fn python_command() -> PathBuf {
    let mut candidates = vec![PathBuf::from("python3")];
    let venv = repo_root().join(".venv").join("bin").join("python3");
    if venv.exists() {
        candidates.insert(0, venv);
    }
    candidates
        .into_iter()
        .next()
        .unwrap_or_else(|| PathBuf::from("python3"))
}

fn script_path(name: &str) -> PathBuf {
    let mut candidates = vec![repo_root().join("scripts").join(name)];
    if let Ok(exe) = std::env::current_exe() {
        if let Some(resources) = exe
            .parent()
            .and_then(|macos| macos.parent())
            .map(|contents| contents.join("Resources").join("scripts").join(name))
        {
            candidates.insert(0, resources);
        }
    }
    candidates
        .into_iter()
        .find(|path| path.exists())
        .unwrap_or_else(|| repo_root().join("scripts").join(name))
}

fn app_data_subdir(app: &AppHandle, name: &str) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join(name);
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn safe_runtime_filename(filename: &str, extension: &str) -> Result<String, String> {
    if filename.contains('/') || filename.contains('\\') || filename.starts_with('.') {
        return Err("invalid runtime filename".to_string());
    }
    let path = PathBuf::from(filename);
    let Some(name) = path.file_name().and_then(|n| n.to_str()) else {
        return Err("invalid runtime filename".to_string());
    };
    if name != filename || path.extension().and_then(|e| e.to_str()) != Some(extension) {
        return Err(format!("runtime filename must be a .{extension} file"));
    }
    Ok(name.to_string())
}

fn safe_runtime_stem(stem: &str) -> Result<String, String> {
    if stem.is_empty() || stem.contains('/') || stem.contains('\\') || stem.starts_with('.') {
        return Err("invalid runtime file stem".to_string());
    }
    Ok(stem.to_string())
}

pub fn init_db(app: &AppHandle) -> Result<Connection, String> {
    let path = db_path(app)?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    migrations::run_migrations(&conn)?;
    Ok(conn)
}

#[tauri::command]
pub fn db_load_state(state: tauri::State<DbState>) -> Result<Option<String>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(relational) = relational::load_relational(&conn)? {
        return Ok(Some(relational));
    }
    let mut stmt = conn
        .prepare("SELECT payload FROM app_state WHERE id = 1")
        .map_err(|e| e.to_string())?;
    let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let payload: String = row.get(0).map_err(|e| e.to_string())?;
        Ok(Some(payload))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn db_save_state(state: tauri::State<DbState>, payload: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    relational::save_relational(&conn, &payload)
}

#[tauri::command]
pub fn db_sync_attempt(
    state: tauri::State<DbState>,
    id: String,
    problem_id: String,
    skill_ids: String,
    answer_raw: String,
    correct: bool,
    mode: String,
    hint_count: i64,
    seconds: i64,
    mixed: bool,
    delayed: bool,
    confidence: Option<f64>,
    created_at: String,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO attempts (id, problem_id, skill_ids, answer_raw, correct, mode, hint_count, seconds, mixed, delayed, confidence, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
         ON CONFLICT(id) DO UPDATE SET answer_raw = excluded.answer_raw, correct = excluded.correct",
        params![
            id,
            problem_id,
            skill_ids,
            answer_raw,
            if correct { 1 } else { 0 },
            mode,
            hint_count,
            seconds,
            if mixed { 1 } else { 0 },
            if delayed { 1 } else { 0 },
            confidence,
            created_at,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn save_homework_image(
    app: AppHandle,
    state: tauri::State<DbState>,
    analysis_id: String,
    data_url: String,
    retain: bool,
) -> Result<Option<String>, String> {
    if !retain {
        return Ok(None);
    }
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let dir = app_data_subdir(&app, "homework_images")?;
    let path = dir.join(format!("{analysis_id}.png"));
    let payload = data_url
        .split_once(',')
        .map(|(_, data)| data)
        .unwrap_or(data_url.as_str());
    use base64::Engine;
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(payload)
        .map_err(|e| e.to_string())?;
    std::fs::write(&path, bytes).map_err(|e| e.to_string())?;
    let path_str = path.to_string_lossy().to_string();
    conn.execute(
        "UPDATE homework_analyses SET image_path = ?1, raw_image_saved = 1 WHERE id = ?2",
        params![path_str, analysis_id],
    )
    .ok();
    Ok(Some(path_str))
}

#[tauri::command]
pub fn read_memory_files(app: AppHandle) -> Result<Vec<String>, String> {
    let memory_dir = app_data_subdir(&app, "memory")?;
    let mut out = Vec::new();
    for entry in std::fs::read_dir(&memory_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("md") {
            continue;
        }
        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("memory");
        let body = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
        out.push(format!("## {}\n{}", name, body.trim()));
    }
    Ok(out)
}

#[tauri::command]
pub fn append_memory_file(app: AppHandle, filename: String, content: String) -> Result<(), String> {
    let dir = app_data_subdir(&app, "memory")?;
    let path = dir.join(safe_runtime_filename(&filename, "md")?);
    use std::io::Write;
    let mut file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|e| e.to_string())?;
    if path.metadata().map(|m| m.len()).unwrap_or(0) > 0 {
        file.write_all(b"\n\n").map_err(|e| e.to_string())?;
    }
    file.write_all(content.as_bytes())
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn write_memory_file(app: AppHandle, filename: String, content: String) -> Result<(), String> {
    let dir = app_data_subdir(&app, "memory")?;
    std::fs::write(dir.join(safe_runtime_filename(&filename, "md")?), content)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn search_index_query(
    state: tauri::State<DbState>,
    query: String,
    limit: Option<i64>,
) -> Result<Vec<serde_json::Value>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    relational::search_index_query(&conn, &query, limit.unwrap_or(12))
}

#[tauri::command]
pub fn show_local_notification(title: String, body: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let script = format!(
            "display notification {} with title {}",
            serde_json::to_string(&body).unwrap_or_else(|_| "\"\"".into()),
            serde_json::to_string(&title).unwrap_or_else(|_| "\"MathPilot\"".into()),
        );
        let _ = Command::new("osascript").arg("-e").arg(script).spawn();
    }
    Ok(())
}

#[tauri::command]
pub fn read_skill_files() -> Result<Vec<String>, String> {
    let skills_dir = repo_root().join("skills");
    let mut out = Vec::new();
    if !skills_dir.exists() {
        return Ok(out);
    }
    collect_skill_md(&skills_dir, &skills_dir, &mut out)?;
    Ok(out)
}

fn collect_skill_md(base: &PathBuf, dir: &PathBuf, out: &mut Vec<String>) -> Result<(), String> {
    for entry in std::fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.is_dir() {
            collect_skill_md(base, &path, out)?;
            continue;
        }
        if path.extension().and_then(|e| e.to_str()) != Some("md") {
            continue;
        }
        let rel = path
            .strip_prefix(base)
            .map_err(|e| e.to_string())?
            .to_string_lossy()
            .replace('\\', "/");
        let body = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
        out.push(format!("## skills/{}\n{}", rel, body.trim()));
    }
    Ok(())
}

#[tauri::command]
pub fn invoke_codex(packet: String, task: String, session_id: Option<String>) -> Result<CodexResult, String> {
    let packet_with_session = match session_id {
        Some(sid) if !sid.is_empty() => format!(
            "## Codex session (CLI)\nSession-Id: {}\n\n{}",
            sid, packet
        ),
        _ => packet,
    };
    let mut child = match Command::new("codex")
        .arg("exec")
        .arg("--skip-git-repo-check")
        .arg(&task)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
    {
        Ok(c) => c,
        Err(e) => {
            return Ok(CodexResult {
                ok: false,
                stdout: String::new(),
                stderr: format!("Codex CLI not available ({e}). Use manual prompt packet mode."),
            });
        }
    };

    if let Some(mut stdin) = child.stdin.take() {
        let _ = stdin.write_all(packet_with_session.as_bytes());
    }

    let mut stdout = String::new();
    let mut stderr = String::new();
    if let Some(mut out) = child.stdout.take() {
        let _ = out.read_to_string(&mut stdout);
    }
    if let Some(mut err) = child.stderr.take() {
        let _ = err.read_to_string(&mut stderr);
    }

    let status = child.wait().map_err(|e| e.to_string())?;
    Ok(CodexResult {
        ok: status.success(),
        stdout,
        stderr,
    })
}

#[derive(serde::Serialize)]
pub struct CodexResult {
    pub ok: bool,
    pub stdout: String,
    pub stderr: String,
}

#[derive(serde::Deserialize)]
pub struct MathCheckInput {
    expected: String,
    actual: String,
    variables: Option<Vec<String>>,
}

#[tauri::command]
pub fn write_backup(app: AppHandle, backup_id: String, payload: String) -> Result<String, String> {
    let dir = app_data_subdir(&app, "backups")?;
    let path = dir.join(format!("{}.json", safe_runtime_stem(&backup_id)?));
    std::fs::write(&path, payload).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn check_math_symbolic(input: MathCheckInput) -> Result<String, String> {
    let script = script_path("math_check.py");
    if !script.exists() {
        return Ok(serde_json::json!({
            "ok": false,
            "error": "math_check_script_missing",
            "correct": false,
            "method": "text",
            "feedback": "SymPy checker unavailable."
        })
        .to_string());
    }

    let payload = serde_json::json!({
        "expected": input.expected,
        "actual": input.actual,
        "variables": input.variables.unwrap_or_else(|| vec!["x".to_string()]),
    });

    let mut child = Command::new(python_command())
        .arg(&script)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;

    if let Some(mut stdin) = child.stdin.take() {
        let _ = stdin.write_all(payload.to_string().as_bytes());
    }

    let output = child.wait_with_output().map_err(|e| e.to_string())?;
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    if stdout.trim().is_empty() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    Ok(stdout.trim().to_string())
}

#[tauri::command]
pub fn ocr_homework_base64(data_url: String) -> Result<String, String> {
    let comma = data_url.find(',').unwrap_or(0);
    let b64 = data_url.get(comma + 1..).unwrap_or("");
    let bytes = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, b64.trim())
        .map_err(|e| e.to_string())?;
    let tmp = std::env::temp_dir().join(format!(
        "mathpilot-hw-{}.png",
        chrono::Utc::now().timestamp_millis()
    ));
    std::fs::write(&tmp, bytes).map_err(|e| e.to_string())?;
    let out = ocr_homework_image(tmp.to_string_lossy().to_string())?;
    let _ = std::fs::remove_file(&tmp);
    Ok(out)
}

#[tauri::command]
pub fn ocr_homework_image(image_path: String) -> Result<String, String> {
    let script = script_path("ocr_homework.py");
    if !script.exists() {
        return Ok(r#"{"ok":false,"text":""}"#.to_string());
    }
    let output = Command::new(python_command())
        .arg(&script)
        .arg(&image_path)
        .output()
        .map_err(|e| e.to_string())?;
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

#[tauri::command]
pub fn list_backups(app: AppHandle) -> Result<Vec<String>, String> {
    let dir = app_data_subdir(&app, "backups")?;
    let mut names = Vec::new();
    for entry in std::fs::read_dir(&dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        if entry.path().extension().and_then(|e| e.to_str()) == Some("json") {
            names.push(entry.file_name().to_string_lossy().to_string());
        }
    }
    names.sort();
    Ok(names)
}

#[tauri::command]
pub fn restore_backup(app: AppHandle, backup_file: String) -> Result<String, String> {
    let path = app_data_subdir(&app, "backups")?.join(safe_runtime_filename(&backup_file, "json")?);
    let payload = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    Ok(payload)
}

#[derive(serde::Deserialize)]
pub struct CodePatch {
    pub path: String,
    pub content: String,
}

fn desktop_src_root() -> PathBuf {
    repo_root().join("apps").join("desktop")
}

#[tauri::command]
pub fn apply_code_patches(backup_id: String, patches: Vec<CodePatch>) -> Result<Vec<String>, String> {
    let root = desktop_src_root();
    let backup_dir = repo_root().join("data").join("code_patch_backups");
    std::fs::create_dir_all(&backup_dir).map_err(|e| e.to_string())?;

    let mut applied = Vec::new();
    for patch in patches {
        let rel = patch.path.trim_start_matches('/');
        if rel.contains("..") {
            return Err("invalid patch path".to_string());
        }
        let full = root.join(rel);
        if !full.starts_with(&root) {
            return Err("patch path must stay inside apps/desktop".to_string());
        }
        if full.exists() {
            let backup_name = format!("{}__{}", backup_id, rel.replace('/', "__"));
            let backup_path = backup_dir.join(backup_name);
            let old = std::fs::read_to_string(&full).map_err(|e| e.to_string())?;
            std::fs::write(&backup_path, old).map_err(|e| e.to_string())?;
        }
        if let Some(parent) = full.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        std::fs::write(&full, patch.content).map_err(|e| e.to_string())?;
        applied.push(rel.to_string());
    }
    Ok(applied)
}

#[tauri::command]
pub fn rollback_code_patches(backup_id: String) -> Result<Vec<String>, String> {
    let root = desktop_src_root();
    let backup_dir = repo_root().join("data").join("code_patch_backups");
    let prefix = format!("{backup_id}__");
    let mut restored = Vec::new();

    for entry in std::fs::read_dir(&backup_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();
        if !name.starts_with(&prefix) {
            continue
        }
        let rel = name.trim_start_matches(&prefix).replace("__", "/");
        let full = root.join(&rel);
        let content = std::fs::read_to_string(entry.path()).map_err(|e| e.to_string())?;
        std::fs::write(&full, content).map_err(|e| e.to_string())?;
        restored.push(rel);
    }
    Ok(restored)
}
