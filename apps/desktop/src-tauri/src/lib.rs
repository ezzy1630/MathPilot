mod db;
mod menu;
mod migrations;
mod ocr_macos;
mod relational;

use db::{init_db, DbState};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .on_menu_event(|app, event| {
            menu::handle_menu_event(app, event.id().as_ref());
        })
        .setup(|app| {
            let conn = init_db(app.handle()).expect("failed to open MathPilot database");
            app.manage(DbState(std::sync::Mutex::new(conn)));
            menu::install_app_menu(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            db::db_load_state,
            db::db_save_state,
            db::db_sync_attempt,
            db::save_homework_image,
            db::read_memory_files,
            db::append_memory_file,
            db::write_memory_file,
            db::search_index_query,
            db::show_local_notification,
            db::health_kit_available,
            db::read_skill_files,
            db::invoke_codex,
            db::cancel_codex,
            db::runtime_self_test,
            db::warm_symbolic_checker,
            db::check_math_symbolic,
            db::write_backup,
            db::ocr_homework_image,
            db::ocr_homework_base64,
            db::list_backups,
            db::restore_backup,
            db::apply_code_patches,
            db::rollback_code_patches,
            db::backup_skill_file,
            db::append_skill_changelog,
            db::append_skill_maintenance_log,
            db::write_skill_patch,
            db::run_pnpm_test,
        ])
        .run(tauri::generate_context!())
        .expect("failed to run MathPilot");
}
