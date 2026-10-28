mod export;

use base64::{Engine, engine::general_purpose::STANDARD};
use tauri_plugin_dialog::DialogExt;

/// Returns the saved path, or `None` if the user cancelled the dialog.
#[tauri::command]
async fn export_cover(
    app: tauri::AppHandle,
    data_b64: String,
    kind: String,
    width_mm: f32,
    height_mm: f32,
) -> Result<Option<String>, String> {
    let png = STANDARD.decode(data_b64).map_err(|e| e.to_string())?;
    let (bytes, ext, label) = match kind.as_str() {
        "png" => (export::png_with_dpi(&png, 300)?, "png", "PNG"),
        "pdf" => (export::build_pdf(&png, width_mm, height_mm)?, "pdf", "PDF"),
        other => return Err(format!("unknown export kind: {other}")),
    };
    let Some(path) = app
        .dialog()
        .file()
        .add_filter(label, &[ext])
        .set_file_name(format!("dvd-cover.{ext}"))
        .blocking_save_file()
    else {
        return Ok(None);
    };
    let path = path.into_path().map_err(|e| e.to_string())?;
    std::fs::write(&path, bytes).map_err(|e| e.to_string())?;
    Ok(Some(path.display().to_string()))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![export_cover])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
