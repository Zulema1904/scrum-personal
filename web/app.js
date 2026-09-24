/*
 * Sprint.exe · la pantalla. La lógica (tableros, Scrum y post-its) está en logica.js.
 * Todo se guarda en este navegador (localStorage): no hay servidor ni cuentas.
 * Parámetros de URL: ?lang=es|en  ?embed (dentro del portfolio)
 */
(() => {
  'use strict';

  const L = window.SprintLogica;
  const CLAVE = 'sprint-datos';
  // Versión 1: un único Scrum. Si solo existe esto, se convierte solo en un tablero (y se deja como copia)
  const CLAVE_V1 = 'sprint-datos-v1';
  const CLAVE_IDIOMA = 'sprint-lang';
  // Pasa a true cuando la Release con los instaladores esté publicada en GitHub (si no, el botón llevaría a una página vacía)
  const VERSION_PC_PUBLICADA = false;
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

  const nombresIniciales = () => ({ scrum: tx().defaultScrum, notas: tx().defaultNotes });
  function cargar() {
    const texto = store.get(CLAVE) || store.get(CLAVE_V1);
    if (texto) {
      try { return L.importar(texto, nombresIniciales()); } catch { /* copia rota: se empieza de cero */ }
    }
    return L.espacioVacio(nombresIniciales());
  }
  // Si no se puede guardar (modo privado, disco lleno), se avisa arriba en vez de fallar en silencio
  const guardar = () => { if (!store.set(CLAVE, JSON.stringify(espacio))) $('noStorage').hidden = false; };

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
        '<b>Tableros</b>: arriba tienes pestañas. Crea todos los que quieras con «+ Tablero»: de Scrum (cada uno con su propio sprint, así llevas varios a la vez: trabajo, estudios, casa…) o de post-its, para apuntar cosas sueltas sin sprint. Con ⚙ los renombras o los borras.',
        '<b>Post-its</b>: escribe y pulsa «Pegar». Dentro de cada post-it añade tareas y márcalas al hacerlas; con ✓ lo das entero por hecho. Arrástralos para ordenarlos y cambia su color con los puntitos.',
        '<b>Backlog</b>: apunta todo lo que quieres hacer, sin filtrar. Ordénalo arrastrando: lo de arriba es lo más importante.',
        '<b>Sprint</b>: elige un periodo corto (1 o 2 semanas) y un objetivo. Pasa al tablero solo lo que de verdad puedes terminar en ese tiempo.',
        '<b>Tablero</b>: mueve cada tarea de <i>Por hacer</i> a <i>En curso</i> y a <i>Hecho</i>, arrastrándola o con las flechas. Mejor pocas cosas en curso a la vez.',
        '<b>Esfuerzo</b>: puntúa las tareas (1, 2, 3, 5, 8, 13) comparándolas entre sí, no en horas. Tras unos sprints sabrás cuántos puntos te caben.',
        '<b>Cierre</b>: cuando acabe el sprint, ciérralo. Lo que no dio tiempo vuelve arriba del backlog, sin dramas.',
        '<b>En el móvil</b>: mantén pulsada una tarjeta para arrastrarla. Para instalar la app, pulsa «Instalar» o, en iPhone, Compartir → Añadir a pantalla de inicio. Funciona sin internet.',
      ],
      helpPC: '<b>En el ordenador</b>: también hay una versión para Windows, Mac y Linux en «Versión para PC».',
      privacy: '🔒 Tus datos se guardan solo en este dispositivo: guarda una copia de vez en cuando.',
      footer: 'Hecho por Zulema Gutiérrez',
      editTitle: '✏️ Editar tarea', title: 'Título', notes: 'Notas', delete: '🗑 Borrar', cancel: 'Cancelar', save: 'Guardar',
      deleteConfirm: (t) => `¿Borrar «${t}»? No se puede deshacer.`,
      importConfirm: (n) => `Esto cambia todo lo que tienes por la copia (${n} ${n === 1 ? 'tablero' : 'tableros'}). ¿Seguro?`,
      importOk: (n) => `Copia cargada: ${n} ${n === 1 ? 'tablero' : 'tableros'}.`,
      exported: 'Copia guardada en tus descargas.',
      exportedTo: (ruta) => `Copia guardada en ${ruta}`, exportFailed: 'No he podido guardar la copia: ',
      confirmTitle: '¿Seguro?', yes: 'Sí, adelante',
      defaultScrum: 'Mi sprint', defaultNotes: 'Post-its',
      newBoard: '+ Tablero', boardSettings: 'Ajustes del tablero', daysShort: (n) => (n === 0 ? '⏰' : `${n} d`),
      boardDialogNew: '🗂️ Nuevo tablero', boardDialogEdit: '⚙️ Ajustes del tablero', boardName: 'Nombre', boardType: 'Tipo',
      typeScrum: '🏃 Scrum: backlog, sprint y tablero', typeNotes: '📌 Post-its: notas sueltas, sin sprint',
      namePh: { scrum: 'p. ej. Trabajo, Estudios, Casa…', notas: 'p. ej. Ideas, Recados, Compra…' },
      create: 'Crear', deleteBoard: '🗑 Borrar tablero',
      deleteBoardConfirm: (n) => `¿Borrar el tablero «${n}» con todo lo que tiene? No se puede deshacer.`,
      noteNew: 'Nuevo post-it', notePh: '¿Qué quieres apuntar?', noteAdd: '📌 Pegar', noteTitle: 'Título del post-it',
      itemPh: '+ Añadir tarea', itemDelete: 'Quitar tarea', noteDone: 'Marcar como hecho', noteUndone: 'Volver a pendiente',
      noteDelete: 'Borrar post-it', noteDeleteConfirm: (t) => `¿Borrar el post-it «${t}»?`, stamp: 'HECHO',
      colores: { amarillo: 'amarillo', rosa: 'rosa', lila: 'lila', azul: 'azul', verde: 'verde' },
      colorLabel: (c) => `Color ${c}`,
      emptyNotes: 'Pega aquí tus post-its: ideas, recados, listas… Cada uno puede llevar sus tareas por hacer y hechas.',
      download: '💻 Versión para PC',
      errors: {
        noEsJson: 'Ese archivo no es una copia de Sprint.exe.', noEsCopia: 'Ese archivo no es una copia de Sprint.exe.',
        tituloVacio: 'Falta el texto.', sinSprint: 'Primero empieza un sprint.', yaHaySprint: 'Ya hay un sprint en curso.',
        ultimoTablero: 'Tiene que quedar al menos un tablero.', demasiados: 'Has llegado al máximo permitido.', tipoRaro: 'Tipo de tablero no válido.',
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
        '<b>Boards</b>: the tabs at the top. Create as many as you like with “+ Board”: Scrum ones (each with its own sprint, so you can run several at once: work, studies, home…) or sticky-note ones, for loose things with no sprint. Rename or delete them with ⚙.',
        '<b>Sticky notes</b>: type and press “Stick”. Add tasks inside each note and tick them off; ✓ marks the whole note as done. Drag them to reorder and change their colour with the dots.',
        '<b>Backlog</b>: write down everything you want to do, unfiltered. Drag to order it: the top is what matters most.',
        '<b>Sprint</b>: pick a short period (1 or 2 weeks) and a goal. Move to the board only what you can really finish in that time.',
        '<b>Board</b>: move each task from <i>To do</i> to <i>In progress</i> to <i>Done</i>, by dragging or with the arrows. Keep few things in progress at once.',
        '<b>Effort</b>: score tasks (1, 2, 3, 5, 8, 13) by comparing them, not in hours. After a few sprints you will know how many points fit.',
        '<b>Closing</b>: when the sprint ends, close it. Whatever did not fit goes back to the top of the backlog, no drama.',
        '<b>On your phone</b>: press and hold a card to drag it. To install the app, tap “Install” or, on iPhone, Share → Add to Home Screen. It works offline.',
      ],
      helpPC: '<b>On your computer</b>: there is also a Windows, Mac and Linux version under “Desktop app”.',
      privacy: '🔒 Your data stays on this device only: save a backup now and then.',
      footer: 'Made by Zulema Gutiérrez',
      editTitle: '✏️ Edit task', title: 'Title', notes: 'Notes', delete: '🗑 Delete', cancel: 'Cancel', save: 'Save',
      deleteConfirm: (t) => `Delete “${t}”? This cannot be undone.`,
      importConfirm: (n) => `This replaces everything you have with the backup (${n} ${n === 1 ? 'board' : 'boards'}). Are you sure?`,
      importOk: (n) => `Backup loaded: ${n} ${n === 1 ? 'board' : 'boards'}.`,
      exported: 'Backup saved to your downloads.',
      exportedTo: (ruta) => `Backup saved to ${ruta}`, exportFailed: 'I could not save the backup: ',
      confirmTitle: 'Are you sure?', yes: 'Yes, go ahead',
      defaultScrum: 'My sprint', defaultNotes: 'Sticky notes',
      newBoard: '+ Board', boardSettings: 'Board settings', daysShort: (n) => (n === 0 ? '⏰' : `${n} d`),
      boardDialogNew: '🗂️ New board', boardDialogEdit: '⚙️ Board settings', boardName: 'Name', boardType: 'Type',
      typeScrum: '🏃 Scrum: backlog, sprint and board', typeNotes: '📌 Sticky notes: loose notes, no sprint',
      namePh: { scrum: 'e.g. Work, Studies, Home…', notas: 'e.g. Ideas, Errands, Shopping…' },
      create: 'Create', deleteBoard: '🗑 Delete board',
      deleteBoardConfirm: (n) => `Delete the board “${n}” and everything in it? This cannot be undone.`,
      noteNew: 'New sticky note', notePh: 'What do you want to note down?', noteAdd: '📌 Stick', noteTitle: 'Sticky note title',
      itemPh: '+ Add a task', itemDelete: 'Remove task', noteDone: 'Mark as done', noteUndone: 'Back to pending',
      noteDelete: 'Delete sticky note', noteDeleteConfirm: (t) => `Delete the sticky note “${t}”?`, stamp: 'DONE',
      colores: { amarillo: 'yellow', rosa: 'pink', lila: 'lilac', azul: 'blue', verde: 'green' },
      colorLabel: (c) => `${c[0].toUpperCase()}${c.slice(1)} colour`,
      emptyNotes: 'Stick your notes here: ideas, errands, lists… Each one can hold its own to-do and done tasks.',
      download: '💻 Desktop app',
      errors: {
        noEsJson: 'That file is not a Sprint.exe backup.', noEsCopia: 'That file is not a Sprint.exe backup.',
        tituloVacio: 'The text is missing.', sinSprint: 'Start a sprint first.', yaHaySprint: 'A sprint is already running.',
        ultimoTablero: 'At least one board has to stay.', demasiados: 'You have reached the maximum.', tipoRaro: 'Invalid board type.',
      },
    },
  };
  const tx = () => T[lang];
  const nombreColumna = (c) => (c === 'backlog' ? tx().backlogName : tx()[c]);
  const fecha = (s) => { const [a, m, d] = s.split('-').map(Number); return new Date(a, m - 1, d).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB', { day: 'numeric', month: 'short' }); };
  const error = (e) => tx().errors[e && e.message] || String(e && e.message || e);

  let espacio = cargar();
  // El tablero abierto (de Scrum o de post-its); las funciones de Scrum trabajan sobre él
  let estado = L.tableroActual(espacio);
  if (!store.get(CLAVE)) guardar(); // así la conversión desde la versión 1 se hace una sola vez

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
    $('notaTituloInput').placeholder = tx().notePh;
    $('notaColores').innerHTML = L.COLORES.map((c) => `<button type="button" class="dot c-${c}${c === colorNuevo ? ' on' : ''}" data-nuevo-color="${c}" role="radio" aria-checked="${c === colorNuevo}" aria-label="${esc(tx().colorLabel(tx().colores[c]))}" title="${esc(tx().colorLabel(tx().colores[c]))}"></button>`).join('');
    const ayuda = VERSION_PC_PUBLICADA && !escritorio ? [...tx().help, tx().helpPC] : tx().help;
    $('helpSteps').innerHTML = ayuda.map((h) => `<li>${h}</li>`).join('');
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

  /* ---------- Pestañas de tableros ---------- */
  const ICONO = { scrum: '🏃', notas: '📌' };
  function pintarPestanas() {
    $('tabs').innerHTML = espacio.tableros.map((t) => {
      const on = t.id === espacio.actual;
      const dias = t.tipo === 'scrum' && t.activo ? ` <small>${esc(tx().daysShort(L.resumen(t).diasRestantes))}</small>` : '';
      return `<button class="tab${on ? ' on' : ''}" type="button" role="tab" aria-selected="${on}" data-tab="${esc(t.id)}" title="${esc(t.nombre)}">${ICONO[t.tipo]} <span>${esc(t.nombre)}</span>${dias}</button>`;
    }).join('')
      + `<button class="tab-add" type="button" id="tabNew">${esc(tx().newBoard)}</button>`
      + `<button class="tab-cfg" type="button" id="tabCfg" title="${esc(tx().boardSettings)}" aria-label="${esc(tx().boardSettings)}">⚙</button>`;
  }

  /* ---------- Post-its ---------- */
  let colorNuevo = 'amarillo';
  function postit(n) {
    const hechos = n.items.filter((i) => i.hecho).length;
    const boton = (accion, simbolo, rotulo) => `<button class="pi-btn" type="button" data-accion="${accion}" title="${esc(rotulo)}" aria-label="${esc(rotulo)}">${simbolo}</button>`;
    return `
      <article class="postit c-${esc(n.color)}${n.hecha ? ' hecha' : ''}" data-id="${esc(n.id)}" data-sello="${esc(tx().stamp)}">
        <header class="pi-head">
          <textarea class="pi-title" rows="1" maxlength="200" aria-label="${esc(tx().noteTitle)}">${esc(n.titulo)}</textarea>
          ${boton('hecha', n.hecha ? '↺' : '✓', n.hecha ? tx().noteUndone : tx().noteDone)}
          ${boton('borrar', '✕', tx().noteDelete)}
        </header>
        ${n.items.length ? `<ul class="pi-items">${n.items.map((i) => `
          <li class="${i.hecho ? 'ok' : ''}">
            <label><input type="checkbox" data-item="${esc(i.id)}"${i.hecho ? ' checked' : ''}><span>${esc(i.texto)}</span></label>
            <button class="pi-x" type="button" data-quitar="${esc(i.id)}" title="${esc(tx().itemDelete)}" aria-label="${esc(tx().itemDelete)}">✕</button>
          </li>`).join('')}</ul>` : ''}
        <form class="pi-add" autocomplete="off"><input maxlength="200" placeholder="${esc(tx().itemPh)}" aria-label="${esc(tx().itemPh)}"></form>
        <footer class="pi-foot">
          <span class="pi-colors">${L.COLORES.map((c) => `<button type="button" class="dot c-${c}${c === n.color ? ' on' : ''}" data-color="${c}" title="${esc(tx().colorLabel(tx().colores[c]))}" aria-label="${esc(tx().colorLabel(tx().colores[c]))}"></button>`).join('')}</span>
          ${n.items.length ? `<span class="pi-count">✓ ${hechos}/${n.items.length}</span>` : ''}
        </footer>
      </article>`;
  }

  function pintarNotas() {
    $('notasTitulo').textContent = `📌 ${estado.nombre}`;
    $('zone-notas').innerHTML = estado.notas.length
      ? estado.notas.map(postit).join('')
      : `<p class="empty">${esc(tx().emptyNotes)}</p>`;
    ajustarTitulos();
  }

  // Los títulos largos bajan de línea: el cuadro crece con el texto
  function ajustarAltura(campo) {
    campo.style.height = 'auto';
    campo.style.height = `${campo.scrollHeight}px`;
  }
  const ajustarTitulos = () => $('zone-notas').querySelectorAll('.pi-title').forEach(ajustarAltura);
  // La letra pixel llega un poco después y es más ancha: al cargar (y al cambiar el tamaño) se recalcula
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajustarTitulos);
  window.addEventListener('resize', ajustarTitulos);

  function pintar() {
    estado = L.tableroActual(espacio);
    pintarPestanas();
    const scrum = estado.tipo === 'scrum';
    $('vistaScrum').hidden = !scrum;
    $('vistaNotas').hidden = scrum;
    if (scrum) {
      pintarSprint();
      pintarTareas();
    } else {
      pintarNotas();
    }
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

  $('tabs').addEventListener('click', (e) => {
    const pestana = e.target.closest('[data-tab]');
    if (pestana) aplicar(() => L.elegirTablero(espacio, pestana.dataset.tab));
    else if (e.target.closest('#tabNew')) abrirTablero(null);
    else if (e.target.closest('#tabCfg')) abrirTablero(espacio.actual);
  });
  // Doble clic en una pestaña: sus ajustes
  $('tabs').addEventListener('dblclick', (e) => {
    const pestana = e.target.closest('[data-tab]');
    if (pestana) abrirTablero(pestana.dataset.tab);
  });

  $('notaColores').addEventListener('click', (e) => {
    const b = e.target.closest('[data-nuevo-color]');
    if (!b) return;
    colorNuevo = b.dataset.nuevoColor;
    $('notaColores').querySelectorAll('.dot').forEach((d) => {
      const on = d === b;
      d.classList.toggle('on', on);
      d.setAttribute('aria-checked', String(on));
    });
  });
  $('notaForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const ok = aplicar(() => L.nuevaNota(estado, { titulo: $('notaTituloInput').value, color: colorNuevo }));
    if (ok) {
      $('notaTituloInput').value = '';
      // Lo normal después es apuntar sus tareas
      const primero = document.querySelector('#zone-notas .postit .pi-add input');
      if (primero) primero.focus();
    }
  });

  const idNota = (el) => el.closest('.postit').dataset.id;
  const enfocarAnadir = (notaId) => {
    const campo = document.querySelector(`.postit[data-id="${CSS.escape(notaId)}"] .pi-add input`);
    if (campo) campo.focus({ preventScroll: true });
  };
  $('zone-notas').addEventListener('click', async (e) => {
    const accion = e.target.closest('[data-accion]');
    const color = e.target.closest('[data-color]');
    const quitar = e.target.closest('[data-quitar]');
    if (accion && accion.dataset.accion === 'hecha') {
      const n = estado.notas.find((x) => x.id === idNota(accion));
      aplicar(() => L.editarNota(estado, n.id, { hecha: !n.hecha }));
    } else if (accion && accion.dataset.accion === 'borrar') {
      const n = estado.notas.find((x) => x.id === idNota(accion));
      if (await preguntar(tx().noteDeleteConfirm(n.titulo))) aplicar(() => L.borrarNota(estado, n.id));
    } else if (color) {
      aplicar(() => L.editarNota(estado, idNota(color), { color: color.dataset.color }));
    } else if (quitar) {
      const notaId = idNota(quitar);
      if (aplicar(() => L.borrarItem(estado, notaId, quitar.dataset.quitar))) enfocarAnadir(notaId);
    }
  });
  $('zone-notas').addEventListener('change', (e) => {
    if (e.target.matches('[data-item]')) {
      aplicar(() => L.marcarItem(estado, idNota(e.target), e.target.dataset.item, e.target.checked));
    } else if (e.target.matches('.pi-title')) {
      // Si se deja vacío, se avisa y vuelve el título que tenía
      if (!aplicar(() => L.editarNota(estado, idNota(e.target), { titulo: e.target.value }))) pintar();
    }
  });
  $('zone-notas').addEventListener('input', (e) => { if (e.target.matches('.pi-title')) ajustarAltura(e.target); });
  $('zone-notas').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('.pi-title')) { e.preventDefault(); e.target.blur(); }
  });
  $('zone-notas').addEventListener('submit', (e) => {
    if (!e.target.matches('.pi-add')) return;
    e.preventDefault();
    const notaId = idNota(e.target);
    const campo = e.target.querySelector('input');
    if (aplicar(() => L.nuevoItem(estado, notaId, campo.value))) enfocarAnadir(notaId); // para seguir apuntando
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

  /* ---------- Crear, renombrar y borrar tableros ---------- */
  const dlgTablero = $('tabDialog');
  let editandoTablero = null; // null: tablero nuevo
  const tipoElegido = () => (document.querySelector('#tabTypes input:checked') || {}).value || 'scrum';

  function abrirTablero(id) {
    const t = id ? espacio.tableros.find((x) => x.id === id) : null;
    editandoTablero = t ? t.id : null;
    $('tabDlgTitle').textContent = t ? tx().boardDialogEdit : tx().boardDialogNew;
    $('tabName').value = t ? t.nombre : '';
    $('tabTypes').hidden = Boolean(t);
    if (!t) document.querySelector('#tabTypes input[value="scrum"]').checked = true;
    $('tabName').placeholder = tx().namePh[t ? t.tipo : tipoElegido()];
    $('tabDelete').hidden = !t;
    $('tabDelete').disabled = espacio.tableros.length <= 1;
    $('tabSubmit').textContent = t ? tx().save : tx().create;
    abrirDialogo(dlgTablero);
    $('tabName').focus();
  }
  $('tabTypes').addEventListener('change', () => { $('tabName').placeholder = tx().namePh[tipoElegido()]; });
  $('tabForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const nombre = $('tabName').value;
    const ok = aplicar(() => {
      if (editandoTablero) L.renombrarTablero(espacio, editandoTablero, nombre);
      else L.nuevoTablero(espacio, { tipo: tipoElegido(), nombre });
    });
    if (ok) cerrarDialogo(dlgTablero);
  });
  $('tabCancel').addEventListener('click', () => cerrarDialogo(dlgTablero));
  $('tabDelete').addEventListener('click', async () => {
    const t = espacio.tableros.find((x) => x.id === editandoTablero);
    if (!t || !(await preguntar(tx().deleteBoardConfirm(t.nombre)))) return;
    if (aplicar(() => L.borrarTablero(espacio, t.id))) cerrarDialogo(dlgTablero);
  });

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
    // Los post-its solo se mueven por su pared y las tareas solo por el Scrum
    if ((zona.dataset.zona === 'notas') !== arrastre.esNota) return null;
    if (!arrastre.esNota && zona.dataset.zona !== 'backlog' && !estado.activo) return null;
    return zona;
  }

  function colocarHueco(zona, x, y) {
    const tarjetas = [...zona.querySelectorAll('.task, .postit')].filter((c) => c !== arrastre.card);
    // En una lista cuenta la altura; en la pared de post-its, el orden de lectura (filas y columnas)
    const enRejilla = 'rejilla' in zona.dataset;
    const siguiente = tarjetas.find((c) => {
      const r = c.getBoundingClientRect();
      return enRejilla ? (y < r.top || (y <= r.bottom && x < r.left + r.width / 2)) : y < r.top + r.height / 2;
    });
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
    if (zona) { zona.classList.add('over'); colocarHueco(zona, x, y); }
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
    if (soltar && a.zona && a.esNota) aplicar(() => L.moverNota(estado, a.id, a.antesDe));
    else if (soltar && a.zona) aplicar(() => L.mover(estado, a.id, a.zona.dataset.zona, a.antesDe), a.id);
    else pintar();
  }

  document.querySelector('.app').addEventListener('pointerdown', (e) => {
    const card = e.target.closest('.task, .postit');
    // Los botones, casillas y campos de texto siguen funcionando: desde ahí no se arrastra
    if (!card || e.button !== 0 || e.target.closest('.mv, button, input, label, textarea, select') || arrastre) return;
    const tactil = e.pointerType === 'touch' || e.pointerType === 'pen';
    const esNota = card.classList.contains('postit');
    arrastre = { card, id: card.dataset.id, esNota, tactil, activo: false, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY };
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
  document.addEventListener('contextmenu', (e) => { if (arrastre || (e.target.closest('.task, .postit') && !e.target.closest('input'))) e.preventDefault(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && arrastre) terminarArrastre(false); });

  /* ---------- Copias de seguridad ---------- */
  $('export').addEventListener('click', async () => {
    const nombre = `sprint-copia-${L.fechaLocal(new Date())}.json`;
    if (escritorio) {
      // La ventana de escritorio no descarga archivos: lo escribe el programa en la carpeta Descargas
      try {
        const ruta = await window.__TAURI__.core.invoke('guardar_copia', { nombre, contenido: L.exportar(espacio) });
        avisar(tx().exportedTo(ruta));
      } catch (e) {
        avisar(tx().exportFailed + String(e));
      }
      return;
    }
    const blob = new Blob([L.exportar(espacio)], { type: 'application/json' });
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
      const nuevo = L.importar(await archivo.text(), nombresIniciales());
      if (!(await preguntar(tx().importConfirm(nuevo.tableros.length)))) return;
      espacio = nuevo;
      guardar();
      pintar();
      avisar(tx().importOk(nuevo.tableros.length));
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
    espacio = cargar();
    pintar();
  });

  // Al cambiar de día con la app abierta, que se actualicen los días restantes
  let hoy = L.fechaLocal(new Date());
  setInterval(() => { const h = L.fechaLocal(new Date()); if (h !== hoy) { hoy = h; pintar(); } }, 60000);

  /* ---------- App instalable y sin conexión ---------- */
  if (!escritorio && VERSION_PC_PUBLICADA) $('desktopDl').hidden = false;
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
