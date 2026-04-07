use tauri::Manager;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{TrayIconBuilder, TrayIconEvent, MouseButton};

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            // 1. 全局快捷键
            let shortcut: tauri_plugin_global_shortcut::Shortcut = "Alt+Space".parse().unwrap();
            app.global_shortcut().on_shortcut(shortcut, move |app_handle, sc, event| {
                if sc == &shortcut && event.state() == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                    let win = app_handle.get_webview_window("main").unwrap();
                    if win.is_visible().unwrap() {
                        win.hide().unwrap();
                    } else {
                        win.show().unwrap();
                        win.set_focus().unwrap(); 
                    }
                }
            })?;

            // 2. 菜单项
            let show_i = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "完全退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            // 3. 托盘图标
            // 解决闪烁的关键点：
            // - 使用 show_menu_on_left_click(false) 避免左键弹出菜单干扰
            // - 在 Windows 上，TrayIconEvent 处理要精确区分 MouseButton
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false) 
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        let win = app.get_webview_window("main").unwrap();
                        win.show().unwrap();
                        win.set_focus().unwrap();
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, .. } = event {
                        let app = tray.app_handle();
                        if let Some(win) = app.get_webview_window("main") {
                            if win.is_visible().unwrap() {
                                win.hide().unwrap();
                            } else {
                                win.show().unwrap();
                                win.set_focus().unwrap();
                            }
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
