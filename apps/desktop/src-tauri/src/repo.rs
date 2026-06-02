use std::path::{Path, PathBuf};

const REPO_UNAVAILABLE: &str =
    "MathPilot source checkout is not available in this install. Set MATHPILOT_REPO_ROOT for development, or use a local dev build.";

pub fn compile_time_repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("..")
        .join("..")
}

fn looks_like_repo_root(path: &Path) -> bool {
    path.join("package.json").is_file() && path.join("apps").join("desktop").is_dir()
}

/// Runtime repo root when developing from a checkout (not embedded build-machine paths).
pub fn resolve_repo_root() -> Option<PathBuf> {
    if let Ok(env_root) = std::env::var("MATHPILOT_REPO_ROOT") {
        let path = PathBuf::from(env_root);
        if looks_like_repo_root(&path) {
            return Some(path);
        }
    }
    let compiled = compile_time_repo_root();
    if looks_like_repo_root(&compiled) {
        return Some(compiled);
    }
    None
}

pub fn require_repo_root() -> Result<PathBuf, String> {
    resolve_repo_root().ok_or_else(|| REPO_UNAVAILABLE.to_string())
}

#[tauri::command]
pub fn repo_available() -> bool {
    resolve_repo_root().is_some()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolve_repo_root_finds_checkout() {
        assert!(resolve_repo_root().is_some());
    }
}
