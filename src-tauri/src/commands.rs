use tauri::State;

/// Path of a `.fab` project passed as a command-line argument at startup
/// (e.g. Windows "open with" / double-click on the file association).
pub struct StartupProjectPath(pub Option<String>);

#[tauri::command]
pub fn get_startup_project_path(state: State<StartupProjectPath>) -> Option<String> {
    state.0.clone()
}
