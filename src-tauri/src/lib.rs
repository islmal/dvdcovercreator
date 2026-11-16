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

/// Prints the cover using the exact Windows 11 right-click "Drucken" handler
/// (ShellExecuteW with verb "print" -> photowiz.dll Photo Printing Wizard).
#[tauri::command]
async fn print_cover(data_b64: String) -> Result<(), String> {
    let png = STANDARD.decode(data_b64).map_err(|e| e.to_string())?;
    let png_300dpi = export::png_with_dpi(&png, 300)?;
    let temp_path = std::env::temp_dir().join("dvd-cover-print.png");
    std::fs::write(&temp_path, png_300dpi).map_err(|e| e.to_string())?;

    #[cfg(target_os = "windows")]
    {
        use std::ffi::OsStr;
        use std::os::windows::ffi::OsStrExt;

        #[link(name = "shell32")]
        unsafe extern "system" {
            fn ShellExecuteW(
                hwnd: *mut std::ffi::c_void,
                lpOperation: *const u16,
                lpFile: *const u16,
                lpParameters: *const u16,
                lpDirectory: *const u16,
                nShowCmd: i32,
            ) -> isize;
        }

        let op: Vec<u16> = OsStr::new("print").encode_wide().chain(std::iter::once(0)).collect();
        let file: Vec<u16> = temp_path.as_os_str().encode_wide().chain(std::iter::once(0)).collect();
        let ret = unsafe {
            ShellExecuteW(
                std::ptr::null_mut(),
                op.as_ptr(),
                file.as_ptr(),
                std::ptr::null(),
                std::ptr::null(),
                1, // SW_SHOWNORMAL
            )
        };
        if ret <= 32 {
            return Err(format!("Windows ShellExecuteW print failed with code: {ret}"));
        }
        Ok(())
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("Native Windows Photo Printing Wizard is only supported on Windows.".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![export_cover, print_cover])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
