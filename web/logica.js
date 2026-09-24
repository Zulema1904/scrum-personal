/*
 * Sprint.exe · lógica de Scrum sin nada de pantalla, para poder probarla con tests.
 * Todas las funciones reciben el estado y lo modifican; quien las llama se encarga de guardar.
 *
 * Estado:
 *   tareas:  [{ id, titulo, notas, prioridad, puntos, estado, sprint, creada, hecha }]
 *            estado: 'backlog' | 'todo' | 'doing' | 'done'
 *   sprints: [{ id, nombre, objetivo, inicio, fin, cerrado, resumen }]
 *   activo:  id del sprint en curso o null
 */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.SprintLogica = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VERSION = 1;
  const ESTADOS = ['backlog', 'todo', 'doing', 'done'];
  const PRIORIDADES = ['alta', 'media', 'baja'];
  const PUNTOS = [1, 2, 3, 5, 8, 13];
  const DURACIONES = [7, 14, 21, 28];
  const MAX_TITULO = 200;
  const MAX_NOTAS = 4000;

  const nuevoId = () => (typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);

  /* ---------- Fechas en hora local (YYYY-MM-DD) ---------- */
  const dosCifras = (n) => String(n).padStart(2, '0');
  const fechaLocal = (d) => `${d.getFullYear()}-${dosCifras(d.getMonth() + 1)}-${dosCifras(d.getDate())}`;
  const leerFecha = (s) => { const [a, m, d] = s.split('-').map(Number); return new Date(a, m - 1, d); };
  const sumarDias = (s, n) => { const d = leerFecha(s); d.setDate(d.getDate() + n); return fechaLocal(d); };
  const diasEntre = (a, b) => Math.round((leerFecha(b) - leerFecha(a)) / 86400000);

  const estadoVacio = () => ({ version: VERSION, tareas: [], sprints: [], activo: null });

  const buscar = (estado, id) => estado.tareas.find((t) => t.id === id) || null;
  const sprintActivo = (estado) => estado.sprints.find((s) => s.id === estado.activo) || null;

  function limpiarTitulo(titulo) {
    const t = String(titulo == null ? '' : titulo).replace(/\s+/g, ' ').trim().slice(0, MAX_TITULO);
    if (!t) throw new Error('tituloVacio');
    return t;
  }
  const limpiarPrioridad = (p) => (PRIORIDADES.includes(p) ? p : 'media');
  const limpiarPuntos = (p) => { const n = Number(p); return PUNTOS.includes(n) ? n : null; };
  const limpiarNotas = (n) => String(n == null ? '' : n).slice(0, MAX_NOTAS);

  /* ---------- Tareas ---------- */

  function nuevaTarea(estado, datos, ahora = new Date()) {
    const tarea = {
      id: nuevoId(),
      titulo: limpiarTitulo(datos.titulo),
      notas: limpiarNotas(datos.notas),
      prioridad: limpiarPrioridad(datos.prioridad),
      puntos: limpiarPuntos(datos.puntos),
      estado: 'backlog',
      sprint: null,
      creada: ahora.toISOString(),
      hecha: null,
    };
    estado.tareas.push(tarea);
    return tarea;
  }

  function editarTarea(estado, id, cambios) {
    const t = buscar(estado, id);
    if (!t) throw new Error('noExiste');
    // Se valida todo antes de tocar nada, para no dejar la tarea a medias
    const titulo = 'titulo' in cambios ? limpiarTitulo(cambios.titulo) : t.titulo;
    t.titulo = titulo;
    if ('notas' in cambios) t.notas = limpiarNotas(cambios.notas);
    if ('prioridad' in cambios) t.prioridad = limpiarPrioridad(cambios.prioridad);
    if ('puntos' in cambios) t.puntos = limpiarPuntos(cambios.puntos);
    return t;
  }

  function borrarTarea(estado, id) {
    const i = estado.tareas.findIndex((t) => t.id === id);
    if (i < 0) throw new Error('noExiste');
    estado.tareas.splice(i, 1);
  }

  /**
   * Mueve una tarea a otra columna y, si se indica, justo delante de otra tarea.
   * Las columnas del tablero solo existen con un sprint en curso.
   */
  function mover(estado, id, destino, antesDe = null, ahora = new Date()) {
    if (!ESTADOS.includes(destino)) throw new Error('destinoRaro');
    const t = buscar(estado, id);
    if (!t) throw new Error('noExiste');
    if (destino !== 'backlog' && !estado.activo) throw new Error('sinSprint');

    t.estado = destino;
    t.sprint = destino === 'backlog' ? null : estado.activo;
    t.hecha = destino === 'done' ? (t.hecha || ahora.toISOString()) : null;

    // Reordenar: se saca y se vuelve a meter delante de "antesDe" o al final
    const lista = estado.tareas;
    lista.splice(lista.indexOf(t), 1);
    const j = antesDe && antesDe !== id ? lista.findIndex((x) => x.id === antesDe) : -1;
    if (j >= 0) lista.splice(j, 0, t);
    else lista.push(t);
    return t;
  }

  /** Tareas de una columna en su orden. El tablero enseña solo las del sprint en curso. */
  function columna(estado, nombre) {
    if (nombre === 'backlog') return estado.tareas.filter((t) => t.estado === 'backlog');
    if (!estado.activo) return [];
    return estado.tareas.filter((t) => t.estado === nombre && t.sprint === estado.activo);
  }

  /* ---------- Sprints ---------- */

  const siguienteNombre = (estado) => `Sprint ${estado.sprints.length + 1}`;

  function empezarSprint(estado, datos = {}, hoy = new Date()) {
    if (estado.activo) throw new Error('yaHaySprint');
    const dias = DURACIONES.includes(Number(datos.dias)) ? Number(datos.dias) : 14;
    const inicio = fechaLocal(hoy);
    const sprint = {
      id: nuevoId(),
      nombre: String(datos.nombre || '').trim().slice(0, 80) || siguienteNombre(estado),
      objetivo: String(datos.objetivo || '').trim().slice(0, 300),
      inicio,
      fin: sumarDias(inicio, dias - 1),
      cerrado: false,
      resumen: null,
    };
    estado.sprints.push(sprint);
    estado.activo = sprint.id;
    return sprint;
  }

  /** Cuenta tareas y puntos del sprint en curso, y los días que le quedan contando hoy. */
  function resumen(estado, hoy = new Date()) {
    const s = sprintActivo(estado);
    if (!s) return null;
    const suyas = estado.tareas.filter((t) => t.sprint === s.id && t.estado !== 'backlog');
    const hechas = suyas.filter((t) => t.estado === 'done');
    const pts = (lista) => lista.reduce((n, t) => n + (t.puntos || 0), 0);
    return {
      total: suyas.length,
      hechas: hechas.length,
      puntos: pts(suyas),
      puntosHechos: pts(hechas),
      diasRestantes: Math.max(0, diasEntre(fechaLocal(hoy), s.fin) + 1),
      duracion: diasEntre(s.inicio, s.fin) + 1,
    };
  }

  /** Cierra el sprint: lo hecho se queda en él y lo que falta vuelve al backlog, arriba del todo. */
  function cerrarSprint(estado, hoy = new Date()) {
    const s = sprintActivo(estado);
    if (!s) throw new Error('sinSprint');
    s.resumen = resumen(estado, hoy);
    s.cerrado = true;
    s.cerradoEl = fechaLocal(hoy);

    const pendientes = estado.tareas.filter((t) => t.sprint === s.id && t.estado !== 'done');
    pendientes.forEach((t) => { t.estado = 'backlog'; t.sprint = null; t.hecha = null; });
    // Lo que no dio tiempo suele ser lo más urgente del siguiente sprint
    estado.tareas = [...pendientes, ...estado.tareas.filter((t) => !pendientes.includes(t))];
    estado.activo = null;
    return { sprint: s, devueltas: pendientes.length };
  }

  /* ---------- Copias de seguridad ---------- */

  const exportar = (estado) => JSON.stringify({ app: 'sprint.exe', ...estado }, null, 2);

  /** Lee una copia y la limpia entera: nunca se confía en lo que venga de un archivo. */
  function importar(texto) {
    let datos;
    try { datos = JSON.parse(texto); } catch { throw new Error('noEsJson'); }
    if (!datos || typeof datos !== 'object' || !Array.isArray(datos.tareas) || !Array.isArray(datos.sprints)) {
      throw new Error('noEsCopia');
    }
    const fecha = (f) => (typeof f === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(f) ? f : null);
    const numero = (n) => (Number.isFinite(n) && n >= 0 ? Math.round(n) : 0);
    const sprints = datos.sprints
      .filter((s) => s && typeof s.id === 'string' && fecha(s.inicio) && fecha(s.fin))
      .map((s) => ({
        id: s.id.slice(0, 64),
        nombre: String(s.nombre || 'Sprint').slice(0, 80),
        objetivo: String(s.objetivo || '').slice(0, 300),
        inicio: s.inicio,
        fin: s.fin,
        cerrado: Boolean(s.cerrado),
        resumen: s.resumen && typeof s.resumen === 'object'
          ? Object.fromEntries(['total', 'hechas', 'puntos', 'puntosHechos', 'diasRestantes', 'duracion']
            .map((k) => [k, numero(s.resumen[k])]))
          : null,
        ...(fecha(s.cerradoEl) ? { cerradoEl: s.cerradoEl } : {}),
      }));
    const idsSprint = new Set(sprints.map((s) => s.id));
    const activo = typeof datos.activo === 'string' && sprints.some((s) => s.id === datos.activo && !s.cerrado)
      ? datos.activo : null;

    const tareas = [];
    const vistos = new Set();
    datos.tareas.forEach((t) => {
      if (!t || typeof t.id !== 'string' || vistos.has(t.id)) return;
      let titulo;
      try { titulo = limpiarTitulo(t.titulo); } catch { return; }
      let est = ESTADOS.includes(t.estado) ? t.estado : 'backlog';
      let sprint = typeof t.sprint === 'string' && idsSprint.has(t.sprint) ? t.sprint : null;
      // Una tarea del tablero sin sprint válido vuelve al backlog
      if (est !== 'backlog' && !sprint) est = 'backlog';
      if (est === 'backlog') sprint = null;
      vistos.add(t.id);
      tareas.push({
        id: t.id.slice(0, 64),
        titulo,
        notas: limpiarNotas(t.notas),
        prioridad: limpiarPrioridad(t.prioridad),
        puntos: limpiarPuntos(t.puntos),
        estado: est,
        sprint,
        creada: typeof t.creada === 'string' ? t.creada.slice(0, 40) : new Date().toISOString(),
        hecha: est === 'done' && typeof t.hecha === 'string' ? t.hecha.slice(0, 40) : null,
      });
    });
    return { version: VERSION, tareas, sprints, activo };
  }

  return {
    VERSION, ESTADOS, PRIORIDADES, PUNTOS, DURACIONES,
    estadoVacio, nuevaTarea, editarTarea, borrarTarea, mover, columna, buscar,
    empezarSprint, cerrarSprint, resumen, sprintActivo, siguienteNombre,
    exportar, importar, fechaLocal, sumarDias, diasEntre,
  };
});
