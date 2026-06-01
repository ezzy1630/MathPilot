use crate::migrations;
use crate::relational;
use rusqlite::{params, Connection};
use std::io::{Read, Write};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Manager};

struct ActiveCodex {
    call_id: String,
    child_slot: Arc<Mutex<Option<Child>>>,
}

fn active_codex() -> &'static Mutex<Option<ActiveCodex>> {
    static ACTIVE: OnceLock<Mutex<Option<ActiveCodex>>> = OnceLock::new();
    ACTIVE.get_or_init(|| Mutex::new(None))
}

fn clear_active_codex(call_id: &str) {
    if let Ok(mut guard) = active_codex().lock() {
        if guard
            .as_ref()
            .is_some_and(|active| active.call_id == call_id)
        {
            *guard = None;
        }
    }
}

fn kill_active_codex(call_id: Option<&str>) -> bool {
    let mut guard = match active_codex().lock() {
        Ok(guard) => guard,
        Err(_) => return false,
    };
    let Some(active) = guard.take() else {
        return false;
    };
    if call_id.is_some_and(|id| id != active.call_id) {
        *guard = Some(active);
        return false;
    }
    if let Some(mut child) = active.child_slot.lock().ok().and_then(|mut slot| slot.take()) {
        let _ = child.kill();
        return true;
    }
    false
}

struct CodexIoResult {
    stdout: String,
    stderr: String,
    ok: bool,
}

fn read_codex_output(mut child: Child) -> CodexIoResult {
    let mut stdout = String::new();
    let mut stderr = String::new();
    if let Some(mut out) = child.stdout.take() {
        let _ = out.read_to_string(&mut stdout);
    }
    if let Some(mut err) = child.stderr.take() {
        let _ = err.read_to_string(&mut stderr);
    }
    let ok = child
        .wait()
        .map(|status| status.success())
        .unwrap_or(false);
    CodexIoResult {
        stdout,
        stderr,
        ok,
    }
}

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

fn manifest_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
}

fn bundled_python_candidates(app: Option<&AppHandle>) -> Vec<PathBuf> {
    let mut candidates = Vec::new();

    if let Ok(exe) = std::env::current_exe() {
        if let Some(bundle_py) = exe
            .parent()
            .and_then(|macos| macos.parent())
            .map(|contents| contents.join("Resources").join("python").join("bin").join("python3"))
        {
            candidates.push(bundle_py);
        }
    }

    if let Some(app) = app {
        if let Ok(resource_dir) = app.path().resource_dir() {
            candidates.push(
                resource_dir
                    .join("python")
                    .join("bin")
                    .join("python3"),
            );
        }
    }

    candidates.push(
        manifest_dir()
            .join("resources")
            .join("python")
            .join("bin")
            .join("python3"),
    );

    #[cfg(debug_assertions)]
    {
        let venv = repo_root().join(".venv").join("bin").join("python3");
        if venv.exists() {
            candidates.push(venv);
        }
    }

    candidates.push(PathBuf::from("python3"));
    candidates
}

pub fn bundled_python(app: Option<&AppHandle>) -> PathBuf {
    bundled_python_candidates(app)
        .into_iter()
        .find(|path| path.exists())
        .unwrap_or_else(|| PathBuf::from("python3"))
}

fn python_imports(module: &str, python: &PathBuf) -> bool {
    Command::new(python)
        .args(["-c", &format!("import {module}")])
        .status()
        .map(|status| status.success())
        .unwrap_or(false)
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
    resource_id: Option<String>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO attempts (id, problem_id, skill_ids, answer_raw, correct, mode, hint_count, seconds, mixed, delayed, confidence, created_at, resource_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
         ON CONFLICT(id) DO UPDATE SET answer_raw = excluded.answer_raw, correct = excluded.correct, resource_id = excluded.resource_id",
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
            resource_id,
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

/// Stub for MathPilot_spec §8.3 — real HealthKit needs macOS entitlements + Swift bridge.
#[tauri::command]
pub fn health_kit_available() -> bool {
    false
}

fn skills_dir_candidates() -> Vec<PathBuf> {
    let mut candidates = Vec::new();
    if let Ok(exe) = std::env::current_exe() {
        if let Some(bundle) = exe
            .parent()
            .and_then(|macos| macos.parent())
            .map(|contents| contents.join("Resources").join("skills"))
        {
            candidates.push(bundle);
        }
    }
    candidates.push(manifest_dir().join("resources").join("skills"));
    candidates.push(repo_root().join("skills"));
    candidates
}

fn resolve_skills_dir() -> Option<PathBuf> {
    skills_dir_candidates()
        .into_iter()
        .find(|path| path.is_dir())
}

#[tauri::command]
pub fn read_skill_files() -> Result<Vec<String>, String> {
    let Some(skills_dir) = resolve_skills_dir() else {
        return Ok(Vec::new());
    };
    let mut out = Vec::new();
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
pub fn invoke_codex(
    packet: String,
    task: String,
    session_id: Option<String>,
    timeout_secs: Option<u64>,
    call_id: Option<String>,
) -> Result<CodexResult, String> {
    let packet_with_session = match session_id {
        Some(sid) if !sid.is_empty() => format!(
            "## Codex session (CLI)\nSession-Id: {}\n\n{}",
            sid, packet
        ),
        _ => packet,
    };
    let timeout = Duration::from_secs(timeout_secs.unwrap_or(120));
    let call_id = call_id.unwrap_or_else(|| format!("codex-{}", chrono::Utc::now().timestamp_millis()));

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
                timed_out: false,
                cancelled: false,
            });
        }
    };

    if let Some(mut stdin) = child.stdin.take() {
        let _ = stdin.write_all(packet_with_session.as_bytes());
    }

    let child_slot = Arc::new(Mutex::new(Some(child)));
    {
        let mut guard = active_codex()
            .lock()
            .map_err(|e| format!("codex runtime lock poisoned: {e}"))?;
        *guard = Some(ActiveCodex {
            call_id: call_id.clone(),
            child_slot: Arc::clone(&child_slot),
        });
    }

    let (tx, rx) = std::sync::mpsc::channel();
    std::thread::spawn(move || {
        let child = match child_slot.lock() {
            Ok(mut slot) => slot.take(),
            Err(_) => None,
        };
        let result = child.map(read_codex_output).unwrap_or(CodexIoResult {
            stdout: String::new(),
            stderr: String::new(),
            ok: false,
        });
        let _ = tx.send(result);
    });

    let started = Instant::now();
    loop {
        match rx.try_recv() {
            Ok(result) => {
                let cancelled = active_codex()
                    .lock()
                    .ok()
                    .and_then(|guard| guard.as_ref().map(|active| active.call_id.clone()))
                    != Some(call_id.clone());
                clear_active_codex(&call_id);
                return Ok(CodexResult {
                    ok: !cancelled && result.ok,
                    stdout: result.stdout,
                    stderr: if cancelled {
                        "Codex call cancelled.".to_string()
                    } else {
                        result.stderr
                    },
                    timed_out: false,
                    cancelled,
                });
            }
            Err(std::sync::mpsc::TryRecvError::Empty) => {}
            Err(std::sync::mpsc::TryRecvError::Disconnected) => {
                clear_active_codex(&call_id);
                let cancelled = kill_active_codex(Some(&call_id));
                return Ok(CodexResult {
                    ok: false,
                    stdout: String::new(),
                    stderr: if cancelled {
                        "Codex call cancelled.".to_string()
                    } else {
                        "Codex call ended unexpectedly.".to_string()
                    },
                    timed_out: false,
                    cancelled,
                });
            }
        }

        if started.elapsed() >= timeout {
            kill_active_codex(Some(&call_id));
            clear_active_codex(&call_id);
            let _ = rx.recv_timeout(Duration::from_millis(250));
            return Ok(CodexResult {
                ok: false,
                stdout: String::new(),
                stderr: format!(
                    "Codex call timed out after {} seconds.",
                    timeout.as_secs()
                ),
                timed_out: true,
                cancelled: false,
            });
        }

        if active_codex()
            .lock()
            .ok()
            .and_then(|guard| guard.as_ref().map(|active| active.call_id.clone()))
            != Some(call_id.clone())
        {
            let _ = rx.recv_timeout(Duration::from_millis(250));
            return Ok(CodexResult {
                ok: false,
                stdout: String::new(),
                stderr: "Codex call cancelled.".to_string(),
                timed_out: false,
                cancelled: true,
            });
        }

        std::thread::sleep(Duration::from_millis(100));
    }
}

#[tauri::command]
pub fn cancel_codex(call_id: Option<String>) -> Result<bool, String> {
    Ok(kill_active_codex(call_id.as_deref()))
}

#[derive(serde::Serialize)]
pub struct CodexResult {
    pub ok: bool,
    pub stdout: String,
    pub stderr: String,
    pub timed_out: bool,
    pub cancelled: bool,
}

#[derive(serde::Deserialize, Default)]
pub struct MathCheckInput {
    #[serde(default)]
    expected: String,
    #[serde(default)]
    actual: String,
    variables: Option<Vec<String>>,
    operation: Option<String>,
    expression: Option<String>,
    verify_mode: Option<String>,
    expected_derivative: Option<String>,
    expected_integral: Option<String>,
    variable: Option<String>,
}

fn resolved_math_check_operation(input: &MathCheckInput) -> Option<String> {
    if let Some(op) = input.operation.as_ref().filter(|s| !s.is_empty()) {
        return Some(op.clone());
    }
    input.verify_mode.as_ref().map(|mode| match mode.as_str() {
        "derivative" => "verify_derivative".to_string(),
        "integral" => "verify_integral".to_string(),
        other => other.to_string(),
    })
}

fn math_check_payload(input: &MathCheckInput) -> serde_json::Value {
    let mut obj = serde_json::Map::new();
    let calculus = resolved_math_check_operation(input).is_some();

    if let Some(op) = resolved_math_check_operation(input) {
        obj.insert("operation".to_string(), serde_json::Value::String(op));
    }
    if let Some(expr) = input.expression.as_ref().filter(|s| !s.is_empty()) {
        obj.insert("expression".to_string(), serde_json::Value::String(expr.clone()));
    }
    if !input.expected.is_empty() {
        obj.insert("expected".to_string(), serde_json::Value::String(input.expected.clone()));
    }
    if !input.actual.is_empty() {
        obj.insert("actual".to_string(), serde_json::Value::String(input.actual.clone()));
    }
    if let Some(vars) = &input.variables {
        obj.insert("variables".to_string(), serde_json::to_value(vars).unwrap_or_default());
    } else if !calculus {
        obj.insert(
            "variables".to_string(),
            serde_json::json!(["x"]),
        );
    }
    if let Some(v) = &input.expected_derivative {
        obj.insert(
            "expected_derivative".to_string(),
            serde_json::Value::String(v.clone()),
        );
    }
    if let Some(v) = &input.expected_integral {
        obj.insert(
            "expected_integral".to_string(),
            serde_json::Value::String(v.clone()),
        );
    }
    if let Some(v) = &input.variable {
        obj.insert("variable".to_string(), serde_json::Value::String(v.clone()));
    } else if calculus {
        obj.insert("variable".to_string(), serde_json::Value::String("x".to_string()));
    }
    if let Some(v) = &input.verify_mode {
        obj.insert("verify_mode".to_string(), serde_json::Value::String(v.clone()));
    }
    serde_json::Value::Object(obj)
}

fn run_math_check_script(app: &AppHandle, payload: serde_json::Value) -> Result<String, String> {
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

    let python = bundled_python(Some(app));
    let mut child = Command::new(&python)
        .arg(&script)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;

    let body = payload.to_string();
    if let Some(mut stdin) = child.stdin.take() {
        let _ = stdin.write_all(body.as_bytes());
    }

    let output = child.wait_with_output().map_err(|e| e.to_string())?;
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    if stdout.trim().is_empty() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    Ok(stdout.trim().to_string())
}

#[tauri::command]
pub fn write_backup(app: AppHandle, backup_id: String, payload: String) -> Result<String, String> {
    let dir = app_data_subdir(&app, "backups")?;
    let path = dir.join(format!("{}.json", safe_runtime_stem(&backup_id)?));
    std::fs::write(&path, payload).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeSelfTest {
    pub sympy: bool,
    pub python: String,
}

#[tauri::command]
pub fn runtime_self_test(app: AppHandle) -> Result<RuntimeSelfTest, String> {
    let python = bundled_python(Some(&app));
    Ok(RuntimeSelfTest {
        sympy: python_imports("sympy", &python),
        python: python.to_string_lossy().to_string(),
    })
}

/// Pre-warm SymPy in the bundled Python runtime (silent; errors ignored).
#[tauri::command]
pub fn warm_symbolic_checker(app: AppHandle) -> Result<(), String> {
    let _ = run_math_check_script(
        &app,
        serde_json::json!({
            "expected": "2*x",
            "actual": "x+x",
            "variables": ["x"],
        }),
    );
    Ok(())
}

#[tauri::command]
pub fn check_math_symbolic(app: AppHandle, input: MathCheckInput) -> Result<String, String> {
    run_math_check_script(&app, math_check_payload(&input))
}

#[tauri::command]
pub fn ocr_homework_base64(app: AppHandle, data_url: String) -> Result<String, String> {
    let comma = data_url.find(',').unwrap_or(0);
    let b64 = data_url.get(comma + 1..).unwrap_or("");
    let bytes = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, b64.trim())
        .map_err(|e| e.to_string())?;
    let tmp = std::env::temp_dir().join(format!(
        "mathpilot-hw-{}.png",
        chrono::Utc::now().timestamp_millis()
    ));
    std::fs::write(&tmp, bytes).map_err(|e| e.to_string())?;
    let out = ocr_homework_image(app, tmp.to_string_lossy().to_string())?;
    let _ = std::fs::remove_file(&tmp);
    Ok(out)
}

#[cfg(all(target_os = "macos", debug_assertions))]
fn ocr_result_ok(json: &str) -> bool {
    serde_json::from_str::<serde_json::Value>(json)
        .ok()
        .and_then(|value| value.get("ok").and_then(|ok| ok.as_bool()))
        .unwrap_or(false)
}

#[cfg(all(target_os = "macos", debug_assertions))]
fn ocr_homework_image_python(app: &AppHandle, image_path: String) -> Result<String, String> {
    let script = script_path("ocr_homework.py");
    if !script.exists() {
        return Ok(r#"{"ok":false,"text":""}"#.to_string());
    }
    let python = bundled_python(Some(app));
    let output = Command::new(&python)
        .arg(&script)
        .arg(&image_path)
        .output()
        .map_err(|e| e.to_string())?;
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

#[tauri::command]
pub fn ocr_homework_image(app: AppHandle, image_path: String) -> Result<String, String> {
    #[cfg(all(target_os = "macos", not(debug_assertions)))]
    {
        return crate::ocr_macos::recognize_text(&image_path);
    }

    #[cfg(all(target_os = "macos", debug_assertions))]
    {
        match crate::ocr_macos::recognize_text(&image_path) {
            Ok(result) if ocr_result_ok(&result) => Ok(result),
            _ => ocr_homework_image_python(&app, image_path),
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = image_path;
        Ok(r#"{"ok":false,"text":""}"#.to_string())
    }
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

fn repo_relative_path(rel: &str) -> Result<PathBuf, String> {
    let trimmed = rel.trim_start_matches('/');
    if trimmed.contains("..") {
        return Err("invalid path".to_string());
    }
    let full = repo_root().join(trimmed);
    if !full.starts_with(&repo_root()) {
        return Err("path must stay inside repo root".to_string());
    }
    Ok(full)
}

#[tauri::command]
pub fn backup_skill_file(filename: String, backup_id: String) -> Result<(), String> {
    let rel = format!("skills/maintenance/{}", filename.trim_start_matches("skills/maintenance/"));
    let source = repo_relative_path(&rel)?;
    if !source.exists() {
        return Ok(());
    }
    let backup_dir = repo_root().join("data").join("skill_file_backups");
    std::fs::create_dir_all(&backup_dir).map_err(|e| e.to_string())?;
    let backup_path = backup_dir.join(format!("{}__{}", backup_id, filename.replace('/', "__")));
    std::fs::copy(&source, backup_path).map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillChangelogEntry {
    pub at: String,
    pub actor: String,
    pub files_changed: Vec<String>,
    pub reason: String,
    pub backup_id: String,
}

#[tauri::command]
pub fn append_skill_changelog(entry: SkillChangelogEntry) -> Result<(), String> {
    let path = repo_root().join("data").join("skill_changelog.jsonl");
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let line = serde_json::to_string(&entry).map_err(|e| e.to_string())?;
    use std::io::Write;
    let mut file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|e| e.to_string())?;
    file.write_all(format!("{line}\n").as_bytes())
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn append_skill_maintenance_log(content: String) -> Result<(), String> {
    let path = repo_relative_path("skills/maintenance/improve_skill_file.md")?;
    use std::io::Write;
    let mut file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|e| e.to_string())?;
    if path.metadata().map(|m| m.len()).unwrap_or(0) > 0 {
        file.write_all(b"\n").map_err(|e| e.to_string())?;
    }
    file.write_all(content.as_bytes())
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn write_skill_patch(skill_id: String, content: String) -> Result<String, String> {
    let patch_dir = repo_root().join("data").join("skills_patches");
    let backup_dir = repo_root().join("data").join("skills_backups");
    std::fs::create_dir_all(&patch_dir).map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&backup_dir).map_err(|e| e.to_string())?;
    let safe = safe_runtime_stem(&skill_id)?;
    let path = patch_dir.join(format!("{safe}.patch.md"));
    if path.exists() {
        let backup_name = format!("{safe}__{}.patch.md", chrono::Utc::now().timestamp_millis());
        std::fs::copy(&path, backup_dir.join(backup_name)).map_err(|e| e.to_string())?;
    }
    std::fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PnpmTestResult {
    pub ok: bool,
    pub output: String,
    pub at: String,
}

#[tauri::command]
pub fn run_pnpm_test() -> Result<PnpmTestResult, String> {
    let root = repo_root();
    let output = Command::new("pnpm")
        .arg("test")
        .current_dir(&root)
        .output()
        .map_err(|e| format!("pnpm test failed to start ({e})"))?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    let combined = format!("{stdout}{stderr}");
    Ok(PnpmTestResult {
        ok: output.status.success(),
        output: combined.chars().take(12_000).collect(),
        at: chrono::Utc::now().to_rfc3339(),
    })
}

#[tauri::command]
pub fn apply_code_patches(backup_id: String, patches: Vec<CodePatch>) -> Result<Vec<String>, String> {
    let backup_dir = repo_root().join("data").join("code_patch_backups");
    std::fs::create_dir_all(&backup_dir).map_err(|e| e.to_string())?;

    let mut applied = Vec::new();
    for patch in patches {
        let full = repo_relative_path(&patch.path)?;
        if let Some(parent) = full.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        if full.exists() {
            let rel = patch.path.trim_start_matches('/');
            let backup_name = format!("{}__{}", backup_id, rel.replace('/', "__"));
            let backup_path = backup_dir.join(backup_name);
            let old = std::fs::read_to_string(&full).map_err(|e| e.to_string())?;
            std::fs::write(&backup_path, old).map_err(|e| e.to_string())?;
        }
        std::fs::write(&full, patch.content).map_err(|e| e.to_string())?;
        applied.push(patch.path.trim_start_matches('/').to_string());
    }
    Ok(applied)
}

#[tauri::command]
pub fn rollback_code_patches(backup_id: String) -> Result<Vec<String>, String> {
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
        let full = repo_relative_path(&rel)?;
        let content = std::fs::read_to_string(entry.path()).map_err(|e| e.to_string())?;
        std::fs::write(&full, content).map_err(|e| e.to_string())?;
        restored.push(rel);
    }
    Ok(restored)
}

#[cfg(test)]
mod math_check_tests {
    use super::{math_check_payload, resolved_math_check_operation, MathCheckInput};

    #[test]
    fn equivalence_payload_includes_expected_and_actual() {
        let input = MathCheckInput {
            expected: "2*x".into(),
            actual: "x+x".into(),
            variables: Some(vec!["x".into()]),
            ..Default::default()
        };
        let payload = math_check_payload(&input);
        assert_eq!(payload["expected"], "2*x");
        assert_eq!(payload["actual"], "x+x");
        assert!(payload.get("operation").is_none());
    }

    #[test]
    fn calculus_payload_from_verify_mode() {
        let input = MathCheckInput {
            verify_mode: Some("derivative".into()),
            expression: Some("x^3".into()),
            expected_derivative: Some("3*x^2".into()),
            variable: Some("x".into()),
            ..Default::default()
        };
        assert_eq!(
            resolved_math_check_operation(&input).as_deref(),
            Some("verify_derivative")
        );
        let payload = math_check_payload(&input);
        assert_eq!(payload["operation"], "verify_derivative");
        assert_eq!(payload["expression"], "x^3");
        assert_eq!(payload["expected_derivative"], "3*x^2");
    }
}
