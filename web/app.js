/*
 * Sprint.exe · la pantalla. La lógica de Scrum está en logica.js.
 * Todo se guarda en este navegador (localStorage): no hay servidor ni cuentas.
 * Parámetros de URL: ?lang=es|en  ?embed (dentro del portfolio)
 */
(() => {
  'use strict';

  const L = window.SprintLogica;
  const CLAVE = 'sprint-datos-v1';
  const CLAVE_IDIOMA = 'sprint-lang';
  const params = new URLSearchParams(location.search);
  const embebida = params.has('embed');
  if (embebida) document.body.classList.add('embed');
  // Dentro de la app de escritorio (Tauri) no hay service worker ni instalación: ya es un programa
  const escritorio = Boolean(window.__TAURI_INTERNALS__);
  if (escritorio) document.body.classList.add('desktop-app');
  if (typeof HTMLDialogElement !== 'function') document.documentElement.classList.add('no-dialog');

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  /* ---------- Almacenamiento (tolerante a modo privado) ---------- */
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); return true; } catch { return false; } },
  };

  let lang = (() => {
    const q = params.get('lang');
    if (q === 'es' || q === 'en') return q;
    const g = store.get(CLAVE_IDIOMA);
    if (g === 'es' || g === 'en') return g;
    return (navigator.language || 'es').toLowerCase().startsWith('es') ? 'es' : 'en';
  })();

  function cargar() {
    const texto = store.get(CLAVE);
    if (!texto) return L.estadoVacio();
    try { return L.importar(texto); } catch { return L.estadoVacio(); }
  }
  let estado = cargar();
  // Si no se puede guardar (modo privado, disco lleno), se avisa arriba en vez de fallar en silencio
  const guardar = () => { if (!store.set(CLAVE, JSON.stringify(estado))) $('noStorage').hidden = false; };

  /* ---------- Textos ---------- */
  const T = {
    es: {
      subtitle: 'Scrum personal: backlog, sprints y tablero',
      install: '📲 Instalar', standalone: 'Abrir como app ↗', export: '⬇ Guardar copia', import: '⬆ Cargar copia',
      noStorage: '⚠️ Este navegador no me deja guardar (¿modo privado?): lo que hagas se perderá al cerrar.',
      backlog: '📋 Backlog', board: '🗂️ Tablero del sprint',
      newTitle: 'Nueva tarea', newPh: '¿Qué tienes que hacer?', priority: 'Prioridad', points: 'Esfuerzo', add: '+ Añadir',
      todo: 'Por hacer', doing: 'En curso', done: 'Hecho',
      prio: { alta: '🔴 Alta', media: '🟡 Media', baja: '🟢 Baja' },
      ptsNone: 'Sin estimar', pts: (n) => `${n} ${n === 1 ? 'pt' : 'pts'}`,
      emptyBacklog: 'Apunta aquí todo lo que quieres hacer. Después pasa al sprint solo lo que te comprometes a terminar.',
      noSprintBoard: 'Empieza un sprint (arriba) para usar el tablero.',
      emptyCol: { todo: 'Arrastra aquí tareas del backlog', doing: 'Lo que estás haciendo ahora', done: 'Lo terminado 🎉' },
      moveTo: (col) => `Mover a ${col}`, backlogName: 'Backlog',
      notesBadge: 'Tiene notas',
      startTitle: '🚀 Empieza un sprint', startName: 'Nombre', startGoal: 'Objetivo (opcional)',
      goalPh: 'p. ej. Tener el CV listo y enviar 5 candidaturas', startLength: 'Duración', start: 'Empezar sprint',
      lengths: { 7: '1 semana', 14: '2 semanas', 21: '3 semanas', 28: '4 semanas' },
      lastSprint: (s) => `Último: ${s.nombre}, ${s.resumen.hechas} de ${s.resumen.total} tareas hechas.`,
      daysLeft: (n) => (n === 0 ? '⏰ Se acabó el tiempo: ciérralo y planifica el siguiente' : n === 1 ? 'Queda 1 día (hoy)' : `Quedan ${n} días`),
      progress: (h, t) => `${h} de ${t} tareas`, ptsProgress: (h, t) => `${h} de ${t} pts`,
      close: '🏁 Cerrar sprint',
      closeConfirm: (s, n) => `¿Cerrar ${s}?${n ? ` ${n === 1 ? 'La tarea sin terminar volverá' : `Las ${n} tareas sin terminar volverán`} al backlog.` : ''}`,
      closed: (s, h, t) => `✅ ${s} cerrado: ${h} de ${t} tareas hechas.`,
      helpTitle: '❓ ¿Cómo se usa? Scrum en un minuto',
      help: [
        '<b>Backlog</b>: apunta todo lo que quieres hacer, sin filtrar. Ordénalo arrastrando: lo de arriba es lo más importante.',
        '<b>Sprint</b>: elige un periodo corto (1 o 2 semanas) y un objetivo. Pasa al tablero solo lo que de verdad puedes terminar en ese tiempo.',
        '<b>Tablero</b>: mueve cada tarea de <i>Por hacer</i> a <i>En curso</i> y a <i>Hecho</i>, arrastrándola o con las flechas. Mejor pocas cosas en curso a la vez.',
        '<b>Esfuerzo</b>: puntúa las tareas (1, 2, 3, 5, 8, 13) comparándolas entre sí, no en horas. Tras unos sprints sabrás cuántos puntos te caben.',
        '<b>Cierre</b>: cuando acabe el sprint, ciérralo. Lo que no dio tiempo vuelve arriba del backlog, sin dramas.',
        '<b>En el móvil</b>: mantén pulsada una tarjeta para arrastrarla. Para instalar la app, pulsa «Instalar» o, en iPhone, Compartir → Añadir a pantalla de inicio. Funciona sin internet.',
        '<b>En el ordenador</b>: también hay una versión para Windows, Mac y Linux en «Versión para PC».',
      ],
      privacy: '🔒 Tus datos se guardan solo en este dispositivo: guarda una copia de vez en cuando.',
      footer: 'Hecho por Zulema Gutiérrez',
      editTitle: '✏️ Editar tarea', title: 'Título', notes: 'Notas', delete: '🗑 Borrar', cancel: 'Cancelar', save: 'Guardar',
      deleteConfirm: (t) => `¿Borrar «${t}»? No se puede deshacer.`,
      importConfirm: (n) => `Esto cambia todo lo que tienes por la copia (${n} ${n === 1 ? 'tarea' : 'tareas'}). ¿Seguro?`,
      importOk: (n) => `Copia cargada: ${n} ${n === 1 ? 'tarea' : 'tareas'}.`,
      exported: 'Copia guardada en tus descargas.',
      exportedTo: (ruta) => `Copia guardada en ${ruta}`, exportFailed: 'No he podido guardar la copia: ',
      confirmTitle: '¿Seguro?', yes: 'Sí, adelante',
      download: '💻 Versión para PC',
      errors: {
        noEsJson: 'Ese archivo no es una copia de Sprint.exe.', noEsCopia: 'Ese archivo no es una copia de Sprint.exe.',
        tituloVacio: 'La tarea necesita un título.', sinSprint: 'Primero empieza un sprint.', yaHaySprint: 'Ya hay un sprint en curso.',
      },
    },
    en: {
      subtitle: 'Personal Scrum: backlog, sprints and board',
      install: '📲 Install', standalone: 'Open as an app ↗', export: '⬇ Save backup', import: '⬆ Load backup',
      noStorage: '⚠️ This browser will not let me save (private mode?): your changes will be lost when you close it.',
      backlog: '📋 Backlog', board: '🗂️ Sprint board',
      newTitle: 'New task', newPh: 'What do you need to do?', priority: 'Priority', points: 'Effort', add: '+ Add',
      todo: 'To do', doing: 'In progress', done: 'Done',
      prio: { alta: '🔴 High', media: '🟡 Medium', baja: '🟢 Low' },
      ptsNone: 'Not estimated', pts: (n) => `${n} ${n === 1 ? 'pt' : 'pts'}`,
      emptyBacklog: 'Write down everything you want to do. Then move into the sprint only what you commit to finishing.',
      noSprintBoard: 'Start a sprint (above) to use the board.',
      emptyCol: { todo: 'Drag backlog tasks here', doing: 'What you are working on now', done: 'Finished work 🎉' },
      moveTo: (col) => `Move to ${col}`, backlogName: 'Backlog',
      notesBadge: 'Has notes',
      startTitle: '🚀 Start a sprint', startName: 'Name', startGoal: 'Goal (optional)',
      goalPh: 'e.g. Get my CV ready and send 5 applications', startLength: 'Length', start: 'Start sprint',
      lengths: { 7: '1 week', 14: '2 weeks', 21: '3 weeks', 28: '4 weeks' },
      lastSprint: (s) => `Last one: ${s.nombre}, ${s.resumen.hechas} of ${s.resumen.total} tasks done.`,
      daysLeft: (n) => (n === 0 ? '⏰ Time is up: close it and plan the next one' : n === 1 ? '1 day left (today)' : `${n} days left`),
      progress: (h, t) => `${h} of ${t} tasks`, ptsProgress: (h, t) => `${h} of ${t} pts`,
      close: '🏁 Close sprint',
      closeConfirm: (s, n) => `Close ${s}?${n ? ` ${n === 1 ? 'The unfinished task will go' : `The ${n} unfinished tasks will go`} back to the backlog.` : ''}`,
      closed: (s, h, t) => `✅ ${s} closed: ${h} of ${t} tasks done.`,
      helpTitle: '❓ How does it work? Scrum in one minute',
      help: [
        '<b>Backlog</b>: write down everything you want to do, unfiltered. Drag to order it: the top is what matters most.',
        '<b>Sprint</b>: pick a short period (1 or 2 weeks) and a goal. Move to the board only what you can really finish in that time.',
        '<b>Board</b>: move each task from <i>To do</i> to <i>In progress</i> to <i>Done</i>, by dragging or with the arrows. Keep few things in progress at once.',
        '<b>Effort</b>: score tasks (1, 2, 3, 5, 8, 13) by comparing them, not in hours. After a few sprints you will know how many points fit.',
        '<b>Closing</b>: when the sprint ends, close it. Whatever did not fit goes back to the top of the backlog, no drama.',
        '<b>On your phone</b>: press and hold a card to drag it. To install the app, tap “Install” or, on iPhone, Share → Add to Home Screen. It works offline.',
        '<b>On your computer</b>: there is also a Windows, Mac and Linux version under “Desktop app”.',
      ],
      privacy: '🔒 Your data stays on this device only: save a backup now and then.',
      footer: 'Made by Zulema Gutiérrez',
      editTitle: '✏️ Edit task', title: 'Title', notes: 'Notes', delete: '🗑 Delete', cancel: 'Cancel', save: 'Save',
      deleteConfirm: (t) => `Delete “${t}”? This cannot be undone.`,
      importConfirm: (n) => `This replaces everything you have with the backup (${n} ${n === 1 ? 'task' : 'tasks'}). Are you sure?`,
      importOk: (n) => `Backup loaded: ${n} ${n === 1 ? 'task' : 'tasks'}.`,
      exported: 'Backup saved to your downloads.',
      exportedTo: (ruta) => `Backup saved to ${ruta}`, exportFailed: 'I could not save the backup: ',
      confirmTitle: 'Are you sure?', yes: 'Yes, go ahead',
      download: '💻 Desktop app',
      errors: {
        noEsJson: 'That file is not a Sprint.exe backup.', noEsCopia: 'That file is not a Sprint.exe backup.',
        tituloVacio: 'The task needs a title.', sinSprint: 'Start a sprint first.', yaHaySprint: 'A sprint is already running.',
      },
    },
  };
  const tx = () => T[lang];
  const nombreColumna = (c) => (c === 'backlog' ? tx().backlogName : tx()[c]);
  const fecha = (s) => { const [a, m, d] = s.split('-').map(Number); return new Date(a, m - 1, d).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB', { day: 'numeric', month: 'short' }); };
  const error = (e) => tx().errors[e && e.message] || String(e && e.message || e);

  /* ---------- Avisos breves ---------- */
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  document.body.append(toast);
  let toastT = 0;
  function avisar(msg) {
    toast.textContent = msg;
    toast.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(() => toast.classList.remove('on'), 3200);
  }

  /* ---------- Pintar ---------- */

  function opciones(select, valores, etiqueta, elegido) {
    select.innerHTML = valores.map((v) => `<option value="${esc(v)}"${String(v) === String(elegido) ? ' selected' : ''}>${esc(etiqueta(v))}</option>`).join('');
  }

  function pintarTextos() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = tx()[el.dataset.t]; });
    $('lang').textContent = lang === 'es' ? 'EN' : 'ES';
    $('lang').setAttribute('aria-label', lang === 'es' ? 'Switch to English' : 'Cambiar a español');
    $('newTitle').placeholder = tx().newPh;
    $('helpSteps').innerHTML = tx().help.map((h) => `<li>${h}</li>`).join('');
    $('standalone').href = `./?lang=${lang}`;
    opciones($('newPrio'), L.PRIORIDADES, (p) => tx().prio[p], $('newPrio').value || 'media');
    opciones($('newPts'), ['', ...L.PUNTOS], (p) => (p === '' ? `${tx().points}: ?` : tx().pts(p)), $('newPts').value || '');
    opciones($('edPrio'), L.PRIORIDADES, (p) => tx().prio[p], $('edPrio').value || 'media');
    opciones($('edPts'), ['', ...L.PUNTOS], (p) => (p === '' ? tx().ptsNone : tx().pts(p)), $('edPts').value || '');
  }

  function pintarSprint() {
    const s = L.sprintActivo(estado);
    const caja = $('sprint');
    if (!s) {
      const ultimo = [...estado.sprints].reverse().find((x) => x.cerrado && x.resumen);
      caja.innerHTML = `
        <form class="start" id="startForm" autocomplete="off">
          <h2>${esc(tx().startTitle)}</h2>
          ${ultimo ? `<p class="last">${esc(tx().lastSprint(ultimo))}</p>` : ''}
          <div class="start-row">
            <label>${esc(tx().startName)}<input id="spName" maxlength="80" value="${esc(L.siguienteNombre(estado))}"></label>
            <label class="grow">${esc(tx().startGoal)}<input id="spGoal" maxlength="300" placeholder="${esc(tx().goalPh)}"></label>
            <label>${esc(tx().startLength)}<select id="spDays">${L.DURACIONES.map((d) => `<option value="${d}"${d === 14 ? ' selected' : ''}>${esc(tx().lengths[d])}</option>`).join('')}</select></label>
            <button class="btn primary" type="submit">${esc(tx().start)}</button>
          </div>
        </form>`;
      return;
    }
    const r = L.resumen(estado);
    const pct = r.puntos ? r.puntosHechos / r.puntos : (r.total ? r.hechas / r.total : 0);
    caja.innerHTML = `
      <div class="sprint-in">
        <div class="sprint-info">
          <h2>🏃 ${esc(s.nombre)}</h2>
          ${s.objetivo ? `<p class="goal">🎯 ${esc(s.objetivo)}</p>` : ''}
          <p class="dates">📅 ${esc(fecha(s.inicio))} → ${esc(fecha(s.fin))} · <b class="${r.diasRestantes === 0 ? 'late' : ''}">${esc(tx().daysLeft(r.diasRestantes))}</b></p>
        </div>
        <div class="sprint-progress">
          <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct * 100)}"><i style="width:${(pct * 100).toFixed(1)}%"></i></div>
          <p>${esc(tx().progress(r.hechas, r.total))}${r.puntos ? ` · ${esc(tx().ptsProgress(r.puntosHechos, r.puntos))}` : ''}</p>
        </div>
        <button class="btn" type="button" id="closeSprint">${esc(tx().close)}</button>
      </div>`;
  }

  function tarjeta(t, zona) {
    const atras = { todo: 'backlog', doing: 'todo', done: 'doing' }[zona];
    const alante = { backlog: estado.activo ? 'todo' : null, todo: 'doing', doing: 'done' }[zona];
    const flecha = (destino, simbolo) => `<button class="mv" type="button" data-mv="${destino}" aria-label="${esc(tx().moveTo(nombreColumna(destino)))}" title="${esc(tx().moveTo(nombreColumna(destino)))}">${simbolo}</button>`;
    return `
      <article class="task p-${esc(t.prioridad)}" data-id="${esc(t.id)}" tabindex="0">
        <p class="task-title">${esc(t.titulo)}</p>
        <div class="task-meta">
          <span class="badge prio">${esc(tx().prio[t.prioridad])}</span>
          ${t.puntos ? `<span class="badge pts">${esc(tx().pts(t.puntos))}</span>` : ''}
          ${t.notas ? `<span class="badge notes" title="${esc(tx().notesBadge)}" aria-label="${esc(tx().notesBadge)}">📝</span>` : ''}
          ${atras || alante ? `<span class="mvs">${atras ? flecha(atras, '◀') : ''}${alante ? flecha(alante, '▶') : ''}</span>` : ''}
        </div>
      </article>`;
  }

  function pintarTareas() {
    ['backlog', 'todo', 'doing', 'done'].forEach((zona) => {
      const lista = L.columna(estado, zona);
      const caja = $(`zone-${zona}`);
      let vacio = '';
      if (!lista.length) {
        if (zona === 'backlog') vacio = tx().emptyBacklog;
        else if (!estado.activo) vacio = zona === 'todo' ? tx().noSprintBoard : '';
        else vacio = tx().emptyCol[zona];
      }
      caja.innerHTML = lista.map((t) => tarjeta(t, zona)).join('') + (vacio ? `<p class="empty">${esc(vacio)}</p>` : '');
      const contador = zona === 'backlog' ? $('countBacklog') : $(`count-${zona}`);
      contador.textContent = estado.activo || zona === 'backlog' ? `(${lista.length})` : '';
    });
    $('board').classList.toggle('off', !estado.activo);
  }

  function pintar() {
    pintarSprint();
    pintarTareas();
  }

  /* ---------- Acciones ---------- */

  function aplicar(cambio, foco) {
    try {
      cambio();
    } catch (e) {
      avisar(error(e));
      return false;
    }
    guardar();
    pintar();
    if (foco) {
      const el = document.querySelector(`.task[data-id="${CSS.escape(foco)}"]`);
      if (el) el.focus({ preventScroll: true });
    }
    return true;
  }

  $('addForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const ok = aplicar(() => L.nuevaTarea(estado, { titulo: $('newTitle').value, prioridad: $('newPrio').value, puntos: $('newPts').value }));
    if (ok) { $('newTitle').value = ''; $('newTitle').focus(); }
  });

  $('sprint').addEventListener('submit', (e) => {
    if (e.target.id !== 'startForm') return;
    e.preventDefault();
    aplicar(() => L.empezarSprint(estado, { nombre: $('spName').value, objetivo: $('spGoal').value, dias: $('spDays').value }));
  });

  $('sprint').addEventListener('click', async (e) => {
    if (!e.target.closest('#closeSprint')) return;
    const s = L.sprintActivo(estado);
    const pendientes = estado.tareas.filter((t) => t.sprint === s.id && t.estado !== 'done').length;
    if (!(await preguntar(tx().closeConfirm(s.nombre, pendientes)))) return;
    let hecho;
    if (aplicar(() => { hecho = L.cerrarSprint(estado); })) {
      avisar(tx().closed(hecho.sprint.nombre, hecho.sprint.resumen.hechas, hecho.sprint.resumen.total));
    }
  });

  // Flechas de las tarjetas (también sirven con teclado y lector de pantalla)
  document.querySelector('.app').addEventListener('click', (e) => {
    const b = e.target.closest('.mv');
    if (!b) return;
    const id = b.closest('.task').dataset.id;
    aplicar(() => L.mover(estado, id, b.dataset.mv), id);
  });

  /* ---------- Ventanas de diálogo ---------- */
  const abrirDialogo = (d) => { if (d.showModal) d.showModal(); else d.setAttribute('open', ''); };
  const cerrarDialogo = (d) => { if (d.close) d.close(); else d.removeAttribute('open'); };

  // Confirmaciones propias: las del navegador (confirm) no aparecen en la app de escritorio de Mac
  const confirmar = $('confirmar');
  function preguntar(mensaje) {
    return new Promise((resolver) => {
      $('cfTitle').textContent = tx().confirmTitle;
      $('cfText').textContent = mensaje;
      $('cfYes').textContent = tx().yes;
      $('cfNo').textContent = tx().cancel;
      const fin = (si) => { cerrarDialogo(confirmar); resolver(si); };
      $('cfYes').onclick = () => fin(true);
      $('cfNo').onclick = () => fin(false);
      confirmar.oncancel = (ev) => { ev.preventDefault(); fin(false); }; // tecla Esc
      abrirDialogo(confirmar);
      $('cfNo').focus();
    });
  }

  /* ---------- Editor de tareas ---------- */
  const editor = $('editor');
  let editando = null;

  function abrirEditor(id) {
    const t = L.buscar(estado, id);
    if (!t) return;
    editando = id;
    $('edTitle').value = t.titulo;
    $('edNotes').value = t.notas;
    $('edPrio').value = t.prioridad;
    $('edPts').value = t.puntos || '';
    abrirDialogo(editor);
    $('edTitle').focus();
  }
  const cerrarEditor = () => cerrarDialogo(editor);

  $('editForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const ok = aplicar(() => L.editarTarea(estado, editando, {
      titulo: $('edTitle').value, notas: $('edNotes').value, prioridad: $('edPrio').value, puntos: $('edPts').value,
    }), editando);
    if (ok) cerrarEditor();
  });
  $('edCancel').addEventListener('click', cerrarEditor);
  $('edDelete').addEventListener('click', async () => {
    const t = L.buscar(estado, editando);
    if (!t || !(await preguntar(tx().deleteConfirm(t.titulo)))) return;
    if (aplicar(() => L.borrarTarea(estado, editando))) cerrarEditor();
  });
  editor.addEventListener('close', () => {
    const el = editando && document.querySelector(`.task[data-id="${CSS.escape(editando)}"]`);
    if (el) el.focus({ preventScroll: true });
  });

  document.querySelector('.app').addEventListener('click', (e) => {
    const card = e.target.closest('.task');
    if (!card || e.target.closest('.mv') || Date.now() - soltadaEn < 250) return;
    abrirEditor(card.dataset.id);
  });
  document.querySelector('.app').addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('task')) {
      e.preventDefault();
      abrirEditor(e.target.dataset.id);
    }
  });

  /* ---------- Arrastrar tarjetas (ratón y dedo) ----------
     Con ratón empieza al moverse unos píxeles; con el dedo, al mantener pulsado,
     para no robarle el scroll a quien solo quiere bajar por la lista. */
  let arrastre = null;
  let soltadaEn = 0;

  function zonaEn(x, y) {
    const el = document.elementFromPoint(x, y);
    const zona = el && el.closest('[data-zona]');
    if (!zona) return null;
    if (zona.dataset.zona !== 'backlog' && !estado.activo) return null;
    return zona;
  }

  function colocarHueco(zona, y) {
    const tarjetas = [...zona.querySelectorAll('.task')].filter((c) => c !== arrastre.card);
    const siguiente = tarjetas.find((c) => { const r = c.getBoundingClientRect(); return y < r.top + r.height / 2; });
    const vacio = zona.querySelector('.empty');
    if (siguiente) zona.insertBefore(arrastre.hueco, siguiente);
    else if (vacio) zona.insertBefore(arrastre.hueco, vacio);
    else zona.append(arrastre.hueco);
    arrastre.antesDe = siguiente ? siguiente.dataset.id : null;
  }

  function autoScroll() {
    if (!arrastre || !arrastre.activo) return;
    const margen = 70;
    const y = arrastre.y;
    if (y < margen) window.scrollBy(0, -Math.ceil((margen - y) / 5));
    else if (y > innerHeight - margen) window.scrollBy(0, Math.ceil((y - innerHeight + margen) / 5));
    arrastre.raf = requestAnimationFrame(autoScroll);
  }

  function empezarArrastre() {
    const a = arrastre;
    const r = a.card.getBoundingClientRect();
    a.activo = true;
    a.dx = a.x0 - r.left;
    a.dy = a.y0 - r.top;
    a.fantasma = a.card.cloneNode(true);
    a.fantasma.classList.add('ghost');
    a.fantasma.removeAttribute('tabindex');
    a.fantasma.style.width = `${r.width}px`;
    document.body.append(a.fantasma);
    a.hueco = document.createElement('div');
    a.hueco.className = 'slot';
    a.hueco.style.height = `${r.height}px`;
    a.card.after(a.hueco);
    a.card.classList.add('lifted');
    document.body.classList.add('dragging');
    if (navigator.vibrate && a.tactil) navigator.vibrate(15);
    moverFantasma(a.x0, a.y0);
    a.raf = requestAnimationFrame(autoScroll);
  }

  function moverFantasma(x, y) {
    const a = arrastre;
    a.x = x;
    a.y = y;
    a.fantasma.style.transform = `translate(${x - a.dx}px, ${y - a.dy}px) rotate(2deg)`;
    const zona = zonaEn(x, y);
    document.querySelectorAll('.zone.over').forEach((z) => { if (z !== zona) z.classList.remove('over'); });
    a.zona = zona;
    if (zona) { zona.classList.add('over'); colocarHueco(zona, y); }
  }

  function terminarArrastre(soltar) {
    const a = arrastre;
    arrastre = null;
    clearTimeout(a.espera);
    cancelAnimationFrame(a.raf);
    document.removeEventListener('pointermove', a.onMove);
    document.removeEventListener('pointerup', a.onUp);
    document.removeEventListener('pointercancel', a.onCancel);
    if (!a.activo) return;
    soltadaEn = Date.now();
    a.fantasma.remove();
    a.hueco.remove();
    a.card.classList.remove('lifted');
    document.body.classList.remove('dragging');
    document.querySelectorAll('.zone.over').forEach((z) => z.classList.remove('over'));
    if (soltar && a.zona) aplicar(() => L.mover(estado, a.id, a.zona.dataset.zona, a.antesDe), a.id);
    else pintar();
  }

  document.querySelector('.app').addEventListener('pointerdown', (e) => {
    const card = e.target.closest('.task');
    if (!card || e.button !== 0 || e.target.closest('.mv') || arrastre) return;
    const tactil = e.pointerType === 'touch' || e.pointerType === 'pen';
    arrastre = { card, id: card.dataset.id, tactil, activo: false, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY };
    const a = arrastre;
    if (tactil) a.espera = setTimeout(() => { if (arrastre === a) empezarArrastre(); }, 380);

    a.onMove = (ev) => {
      if (!a.activo) {
        const lejos = Math.hypot(ev.clientX - a.x0, ev.clientY - a.y0);
        if (a.tactil) { if (lejos > 10) terminarArrastre(false); return; } // está haciendo scroll
        if (lejos < 6) return;
        empezarArrastre();
      }
      moverFantasma(ev.clientX, ev.clientY);
    };
    a.onUp = () => terminarArrastre(true);
    a.onCancel = () => terminarArrastre(false);
    document.addEventListener('pointermove', a.onMove);
    document.addEventListener('pointerup', a.onUp);
    document.addEventListener('pointercancel', a.onCancel);
  });

  // Mientras se arrastra con el dedo, la página no hace scroll ni saca el menú de pulsación larga
  document.addEventListener('touchmove', (e) => { if (arrastre && arrastre.activo) e.preventDefault(); }, { passive: false });
  document.addEventListener('contextmenu', (e) => { if (arrastre || e.target.closest('.task')) e.preventDefault(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && arrastre) terminarArrastre(false); });

  /* ---------- Copias de seguridad ---------- */
  $('export').addEventListener('click', async () => {
    const nombre = `sprint-copia-${L.fechaLocal(new Date())}.json`;
    if (escritorio) {
      // La ventana de escritorio no descarga archivos: lo escribe el programa en la carpeta Descargas
      try {
        const ruta = await window.__TAURI__.core.invoke('guardar_copia', { nombre, contenido: L.exportar(estado) });
        avisar(tx().exportedTo(ruta));
      } catch (e) {
        avisar(tx().exportFailed + String(e));
      }
      return;
    }
    const blob = new Blob([L.exportar(estado)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nombre;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    avisar(tx().exported);
  });
  $('import').addEventListener('click', () => $('importFile').click());
  $('importFile').addEventListener('change', async () => {
    const archivo = $('importFile').files[0];
    $('importFile').value = '';
    if (!archivo) return;
    try {
      const nuevo = L.importar(await archivo.text());
      if (!(await preguntar(tx().importConfirm(nuevo.tareas.length)))) return;
      estado = nuevo;
      guardar();
      pintar();
      avisar(tx().importOk(nuevo.tareas.length));
    } catch (e) {
      avisar(error(e));
    }
  });

  /* ---------- Idioma ---------- */
  $('lang').addEventListener('click', () => {
    lang = lang === 'es' ? 'en' : 'es';
    store.set(CLAVE_IDIOMA, lang);
    pintarTextos();
    pintar();
  });

  // Si la app está abierta en dos pestañas (o en el portfolio y suelta), se mantienen al día
  window.addEventListener('storage', (e) => {
    if (e.key !== CLAVE || arrastre) return;
    estado = cargar();
    pintar();
  });

  // Al cambiar de día con la app abierta, que se actualicen los días restantes
  let hoy = L.fechaLocal(new Date());
  setInterval(() => { const h = L.fechaLocal(new Date()); if (h !== hoy) { hoy = h; pintarSprint(); } }, 60000);

  /* ---------- App instalable y sin conexión ---------- */
  if (!escritorio) $('desktopDl').hidden = false;
  if (embebida) {
    $('standalone').hidden = false;
  } else if (!escritorio && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* sin modo offline, pero la app funciona */ });
  }
  let instalar = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    if (embebida || escritorio) return;
    e.preventDefault();
    instalar = e;
    $('install').hidden = false;
  });
  $('install').addEventListener('click', async () => {
    if (!instalar) return;
    instalar.prompt();
    await instalar.userChoice.catch(() => null);
    instalar = null;
    $('install').hidden = true;
  });
  window.addEventListener('appinstalled', () => { $('install').hidden = true; });

  // Comprobar si se puede guardar (modo privado de algunos navegadores)
  $('noStorage').hidden = store.set('sprint-prueba', '1');
  try { localStorage.removeItem('sprint-prueba'); } catch { /* sin almacenamiento */ }

  pintarTextos();
  pintar();
})();
