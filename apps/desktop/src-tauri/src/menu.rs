use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::{AppHandle, Emitter};

pub fn install_app_menu(app: &AppHandle) -> tauri::Result<()> {
    let app_menu = Submenu::with_items(
        app,
        "MathPilot",
        true,
        &[
            &PredefinedMenuItem::about(app, Some("MathPilot"), None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::services(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::hide(app, None)?,
            &PredefinedMenuItem::hide_others(app, None)?,
            &PredefinedMenuItem::show_all(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::quit(app, Some("Quit MathPilot"))?,
        ],
    )?;

    let view_menu = Submenu::with_items(
        app,
        "View",
        true,
        &[
            &MenuItem::with_id(app, "view_today", "Today", true, Some("Cmd+1"))?,
            &MenuItem::with_id(app, "view_map", "Knowledge Map", true, Some("Cmd+2"))?,
            &MenuItem::with_id(app, "view_resources", "Resources", true, Some("Cmd+3"))?,
            &MenuItem::with_id(app, "view_palette", "Command Palette…", true, Some("Cmd+K"))?,
        ],
    )?;

    let session_menu = Submenu::with_items(
        app,
        "Session",
        true,
        &[
            &MenuItem::with_id(
                app,
                "session_continue",
                "Continue",
                true,
                Some("Cmd+Return"),
            )?,
            &MenuItem::with_id(
                app,
                "session_homework",
                "Upload Homework…",
                true,
                Some("Cmd+U"),
            )?,
        ],
    )?;

    let edit_menu = Submenu::with_items(
        app,
        "Edit",
        true,
        &[
            &PredefinedMenuItem::undo(app, None)?,
            &PredefinedMenuItem::redo(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::cut(app, None)?,
            &PredefinedMenuItem::copy(app, None)?,
            &PredefinedMenuItem::paste(app, None)?,
            &PredefinedMenuItem::select_all(app, None)?,
        ],
    )?;

    let window_menu = Submenu::with_items(
        app,
        "Window",
        true,
        &[
            &PredefinedMenuItem::minimize(app, None)?,
            &PredefinedMenuItem::maximize(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::fullscreen(app, None)?,
        ],
    )?;

    let menu = Menu::with_items(
        app,
        &[
            &app_menu,
            &edit_menu,
            &view_menu,
            &session_menu,
            &window_menu,
        ],
    )?;
    app.set_menu(menu)?;
    Ok(())
}

pub fn handle_menu_event(app: &AppHandle, id: &str) {
    let event = format!("menu://{id}");
    let _ = app.emit(event.as_str(), ());
}
