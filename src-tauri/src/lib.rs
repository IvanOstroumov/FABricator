mod commands;

use tauri::{Emitter, Manager};

fn extract_project_path(args: &[String]) -> Option<String> {
    args.iter()
        .skip(1)
        .find(|a| a.ends_with(".fab") && !a.starts_with('-'))
        .cloned()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            // A second launch (e.g. double-clicking a .fab file) forwards its
            // path here instead of spawning a new window.
            if let Some(path) = extract_project_path(&argv) {
                let _ = app.emit("open-project-file", path);
            }
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let startup_args: Vec<String> = std::env::args().collect();
            if let Some(path) = extract_project_path(&startup_args) {
                app.manage(commands::StartupProjectPath(Some(path)));
            } else {
                app.manage(commands::StartupProjectPath(None));
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_startup_project_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
