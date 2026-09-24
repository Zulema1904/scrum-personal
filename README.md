# 🏃 Sprint.exe · Scrum personal

[![tests](https://github.com/Zulema1904/scrum-personal/actions/workflows/tests.yml/badge.svg)](https://github.com/Zulema1904/scrum-personal/actions/workflows/tests.yml)

Una app para organizar **tu propia vida con Scrum**: backlog, sprints y tablero. Se instala en el móvil o en el ordenador, **funciona sin internet** y **tus datos no salen de tu dispositivo**: no hay cuentas, ni servidor, ni anuncios.

**Pruébala:** [zulema1904.github.io/sprint](https://zulema1904.github.io/sprint/) · también está dentro de [mi portfolio](https://zulema1904.github.io) como *Sprint.exe*.

## Qué hace

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

```bash
npm test                       # tests de la lógica
python -m http.server -d web   # y abre http://localhost:8000
```

## Privacidad

Todo se guarda en el `localStorage` del navegador de tu dispositivo. Si borras los datos del navegador se borran también las tareas, así que **guarda una copia de vez en cuando** con el botón *Guardar copia*.

---

**English:** a personal Scrum app (backlog, sprints and board) that installs on your phone or computer, works offline and keeps your data on your device. Plain HTML/CSS/JS, logic covered by `node --test` in CI.

Hecho por [Zulema Gutiérrez](https://zulema1904.github.io).
