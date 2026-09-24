// Sprint.exe de escritorio: una ventana que carga la misma app web de la carpeta web/.
// Las tareas se guardan en el perfil del usuario (el almacenamiento de la ventana),
// así que se conservan entre sesiones sin necesidad de internet.

// En Windows, que no se abra una consola negra detrás de la ventana
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::{Path, PathBuf};
use tauri::Manager;

/// Límite de tamaño de una copia: miles de tareas caben en mucho menos.
const MAX_COPIA: usize = 20 * 1024 * 1024;

/// La web de la autora: la única dirección que la app sabe abrir.
const WEB_AUTORA: &str = "https://zulemagutierrez.com/";

/// Guarda la copia de seguridad en la carpeta Descargas y devuelve dónde ha quedado.
/// Dentro de la ventana de escritorio la web no puede descargar archivos por su cuenta.
#[tauri::command]
fn guardar_copia(app: tauri::AppHandle, nombre: String, contenido: String) -> Result<String, String> {
    if !nombre_valido(&nombre) {
        return Err("nombre de archivo no válido".into());
    }
    if contenido.len() > MAX_COPIA {
        return Err("la copia es demasiado grande".into());
    }
    let carpeta = app
        .path()
        .download_dir()
        .or_else(|_| app.path().document_dir())
        .map_err(|e| e.to_string())?;
    let ruta = ruta_libre(carpeta.join(&nombre));
    std::fs::write(&ruta, contenido).map_err(|e| e.to_string())?;
    Ok(ruta.display().to_string())
}

/// Abre la web de la autora en el navegador del sistema.
/// La dirección está fija aquí, así la ventana no puede pedir que se abra ninguna otra.
#[tauri::command]
fn abrir_web(ingles: bool) -> Result<(), String> {
    open::that_detached(url_web(ingles)).map_err(|e| e.to_string())
}

fn url_web(ingles: bool) -> String {
    if ingles {
        format!("{WEB_AUTORA}?lang=en")
    } else {
        WEB_AUTORA.to_string()
    }
}

/// Solo un nombre de archivo .json sencillo: sin carpetas, así la web no puede escribir fuera de Descargas.
fn nombre_valido(nombre: &str) -> bool {
    nombre.len() <= 80
        && nombre.ends_with(".json")
        && !nombre.starts_with('.')
        && nombre.chars().all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.'))
}

/// Si ya hay un archivo con ese nombre, prueba "nombre-2.json", "nombre-3.json"…
fn ruta_libre(ruta: PathBuf) -> PathBuf {
    if !ruta.exists() {
        return ruta;
    }
    let base = ruta.file_stem().map(|s| s.to_string_lossy().into_owned()).unwrap_or_default();
    let carpeta = ruta.parent().map(Path::to_path_buf).unwrap_or_default();
    (2..)
        .map(|n| carpeta.join(format!("{base}-{n}.json")))
        .find(|p| !p.exists())
        .expect("siempre hay un nombre libre")
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![guardar_copia, abrir_web])
        .run(tauri::generate_context!())
        .expect("no se pudo arrancar Sprint");
}

#[cfg(test)]
mod tests {
    use super::{nombre_valido, url_web};

    #[test]
    fn solo_abre_la_web_de_la_autora() {
        assert_eq!(url_web(false), "https://zulemagutierrez.com/");
        assert_eq!(url_web(true), "https://zulemagutierrez.com/?lang=en");
    }

    #[test]
    fn acepta_los_nombres_de_la_app() {
        assert!(nombre_valido("sprint-copia-2026-09-24.json"));
    }

    #[test]
    fn rechaza_rutas_y_otros_archivos() {
        for malo in ["../secreto.json", "carpeta/copia.json", "C:\\copia.json", ".oculto.json", "copia.exe", ""] {
            assert!(!nombre_valido(malo), "debería rechazar {malo:?}");
        }
    }
}
