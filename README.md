# 🏃 Sprint.exe · Scrum personal

[![tests](https://github.com/Zulema1904/scrum-personal/actions/workflows/tests.yml/badge.svg)](https://github.com/Zulema1904/scrum-personal/actions/workflows/tests.yml)

Una app para organizar **tu propia vida con Scrum**: backlog, sprints y tablero. Se instala en el ordenador, **funciona sin internet** y **tus datos no salen de tu dispositivo**: no hay cuentas, ni servidor, ni anuncios.

**Pruébala:** [zulemagutierrez.com/sprint](https://zulemagutierrez.com/sprint/) · también está en el [escritorio retro de mi portfolio](https://zulemagutierrez.com/escritorio#app=sprint) como *Sprint.exe*.

## Descargar para el ordenador

También hay **versión de escritorio para Windows, macOS y Linux**, en la página de [**Releases**](https://github.com/Zulema1904/scrum-personal/releases/latest):

| Sistema | Qué descargar |
|---|---|
| 🪟 Windows 10/11 | `Sprint_…_x64-setup.exe` |
| 🍎 macOS (chip Apple e Intel) | `Sprint_…_universal.dmg` |
| 🐧 Linux | `Sprint_…_amd64.AppImage` (cualquier distro) o `.deb` (Ubuntu, Debian…) |

Tus tareas se guardan en tu ordenador y siguen ahí cada vez que abres el programa, sin internet. *Guardar copia* deja un archivo en tu carpeta **Descargas**.

> ⚠️ **El programa no está firmado** (firmarlo cuesta dinero), así que la primera vez el sistema avisa:
> - **Windows**: sale «Windows protegió tu PC» → pulsa *Más información* → *Ejecutar de todas formas*.
> - **macOS**: si dice que no se puede abrir, haz clic derecho sobre la app → *Abrir* → *Abrir*. (O en *Ajustes del Sistema → Privacidad y seguridad → Abrir igualmente*.)
> - **Linux**: al `.AppImage` dale permiso de ejecución (clic derecho → Propiedades → Permitir ejecutar, o `chmod +x`).

## Qué hace

- **Tableros en pestañas**, todos los que quieras y de dos tipos:
  - 🏃 **Scrum**: cada uno con su backlog y **su propio sprint**, así se llevan **varios sprints a la vez** (trabajo, estudios, casa…). La pestaña enseña los días que le quedan.
  - 📌 **Post-its**: una pared de notas de colores **sin sprint**, para lo que va por libre. Cada post-it lleva su **lista de tareas con casillas** y se puede sellar entero como **HECHO**; se reordenan arrastrándolos.
- **Backlog**: apuntas todo lo que quieres hacer, con prioridad y esfuerzo (1, 2, 3, 5, 8, 13), y lo ordenas arrastrando.
- **Sprints** de 1 a 4 semanas, con objetivo, días restantes y barra de progreso por tareas y por puntos.
- **Tablero** *Por hacer → En curso → Hecho*: se arrastra con ratón o con el dedo (pulsación larga), y también con flechas para teclado y lectores de pantalla.
- **Cierre de sprint**: lo terminado se queda en su sprint y lo que no dio tiempo vuelve arriba del backlog.
- **Copias de seguridad** en un archivo `.json` para guardarlas o pasarlas a otro dispositivo.
- **Instalable (PWA) y sin conexión**, en español e inglés.

## Cómo está hecho

- **HTML, CSS y JavaScript sin frameworks ni dependencias.** Nada que instalar para usarla ni para desarrollarla.
- La lógica de Scrum vive en [`web/logica.js`](web/logica.js), separada de la pantalla, para poder probarla sola.
- **Tests** con el runner que ya trae Node (`node --test`), que se ejecutan en cada push con GitHub Actions. Incluyen el caso de importar un archivo manipulado: todo lo que llega de fuera se valida y se limpia, y la pantalla escapa siempre el texto.
- **Service worker** que va primero a la red y, si no hay conexión, sirve la última copia: así nunca se queda en una versión vieja.
- **Versión de escritorio con [Tauri](https://tauri.app)**: la misma carpeta `web/` dentro de un programa nativo de unos pocos MB. El único código propio en Rust ([`src-tauri/src/main.rs`](src-tauri/src/main.rs)) guarda las copias en Descargas y solo acepta nombres de archivo sencillos, con sus tests. Los instaladores los fabrica **GitHub Actions** en Windows, macOS y Linux al publicar una versión ([`release.yml`](.github/workflows/release.yml)).

```bash
npm test                       # tests de la lógica
python -m http.server -d web   # y abre http://localhost:8000
```

## Privacidad

Todo se guarda en el `localStorage` del navegador de tu dispositivo. Si borras los datos del navegador se borran también las tareas, así que **guarda una copia de vez en cuando** con el botón *Guardar copia*.

---

**English:** a personal Scrum app (backlog, sprints and board) that installs on your phone or computer, works offline and keeps your data on your device. Plain HTML/CSS/JS, logic covered by `node --test` in CI.

Hecho por [Zulema Gutiérrez](https://zulemagutierrez.com).
