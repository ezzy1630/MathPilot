//! Native macOS homework OCR via bundled Vision helper (`mathpilot-ocr`).

use std::path::PathBuf;
use std::process::Command;

fn manifest_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
}

fn ocr_binary_candidates() -> Vec<PathBuf> {
    let mut candidates = vec![manifest_dir()
        .join("resources")
        .join("bin")
        .join("mathpilot-ocr")];
    if let Ok(exe) = std::env::current_exe() {
        if let Some(bundle_bin) = exe
            .parent()
            .and_then(|macos| macos.parent())
            .map(|contents| contents.join("Resources").join("bin").join("mathpilot-ocr"))
        {
            candidates.insert(0, bundle_bin);
        }
    }
    candidates
}

fn resolve_ocr_binary() -> Option<PathBuf> {
    ocr_binary_candidates().into_iter().find(|path| path.exists())
}

#[cfg(target_os = "macos")]
pub fn recognize_text(image_path: &str) -> Result<String, String> {
    let Some(bin) = resolve_ocr_binary() else {
        return Ok(r#"{"ok":false,"text":""}"#.to_string());
    };

    let output = Command::new(&bin)
        .arg(image_path)
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if !stdout.is_empty() {
        return Ok(stdout);
    }

    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    if stderr.is_empty() {
        Ok(r#"{"ok":false,"text":""}"#.to_string())
    } else {
        Err(stderr)
    }
}

#[cfg(not(target_os = "macos"))]
pub fn recognize_text(_image_path: &str) -> Result<String, String> {
    Ok(r#"{"ok":false,"text":""}"#.to_string())
}
