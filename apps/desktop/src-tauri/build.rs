fn main() {
    #[cfg(target_os = "macos")]
    {
        let script = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../../scripts/build-macos-ocr.sh");
        if script.exists() {
            let status = std::process::Command::new("bash")
                .arg(&script)
                .status()
                .unwrap_or_else(|e| panic!("failed to run build-macos-ocr.sh: {e}"));
            if !status.success() {
                panic!("build-macos-ocr.sh failed with status {status}");
            }
        }
    }

    tauri_build::build()
}
