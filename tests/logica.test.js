// Tests de la lógica de Sprint.exe: npm test (usa el runner que ya trae Node, sin instalar nada)
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../web/logica.js');

const LUNES = new Date(2026, 8, 21); // 21 de septiembre de 2026, en hora local

function conSprint() {
  const e = L.estadoVacio();
  const a = L.nuevaTarea(e, { titulo: 'Estudiar Docker', prioridad: 'alta', puntos: 3 });
  const b = L.nuevaTarea(e, { titulo: 'Preparar entrevista', puntos: 5 });
  const c = L.nuevaTarea(e, { titulo: 'Leer un libro', prioridad: 'baja' });
  const s = L.empezarSprint(e, { objetivo: 'Encontrar trabajo', dias: 7 }, LUNES);
  return { e, a, b, c, s };
}

test('una tarea nueva va al backlog y se limpia', () => {
  const e = L.estadoVacio();
  const t = L.nuevaTarea(e, { titulo: '  Hacer   la compra ', prioridad: 'rarísima', puntos: 4 });
  assert.equal(t.titulo, 'Hacer la compra');
  assert.equal(t.estado, 'backlog');
  assert.equal(t.prioridad, 'media', 'una prioridad desconocida se queda en media');
  assert.equal(t.puntos, null, '4 no es un punto de Fibonacci válido');
  assert.deepEqual(L.columna(e, 'backlog').map((x) => x.id), [t.id]);
});

test('no se puede crear una tarea sin título', () => {
  const e = L.estadoVacio();
  assert.throws(() => L.nuevaTarea(e, { titulo: '   ' }), /tituloVacio/);
  assert.equal(e.tareas.length, 0);
});

test('editar con un título vacío no estropea la tarea', () => {
  const e = L.estadoVacio();
  const t = L.nuevaTarea(e, { titulo: 'Original', puntos: 3 });
  assert.throws(() => L.editarTarea(e, t.id, { titulo: '', puntos: 8 }), /tituloVacio/);
  assert.equal(t.titulo, 'Original');
  assert.equal(t.puntos, 3);
});

test('sin sprint no se puede pasar nada al tablero', () => {
  const e = L.estadoVacio();
  const t = L.nuevaTarea(e, { titulo: 'Algo' });
  assert.throws(() => L.mover(e, t.id, 'todo'), /sinSprint/);
  assert.deepEqual(L.columna(e, 'todo'), []);
});

test('un sprint de una semana termina el domingo', () => {
  const { s } = conSprint();
  assert.equal(s.nombre, 'Sprint 1');
  assert.equal(s.inicio, '2026-09-21');
  assert.equal(s.fin, '2026-09-27');
});

test('no puede haber dos sprints a la vez', () => {
  const { e } = conSprint();
  assert.throws(() => L.empezarSprint(e, {}, LUNES), /yaHaySprint/);
});

test('mover tareas por el tablero y reordenarlas', () => {
  const { e, a, b, c } = conSprint();
  L.mover(e, a.id, 'todo');
  L.mover(e, b.id, 'todo');
  L.mover(e, c.id, 'todo', a.id); // delante de "a"
  assert.deepEqual(L.columna(e, 'todo').map((t) => t.titulo), ['Leer un libro', 'Estudiar Docker', 'Preparar entrevista']);

  L.mover(e, a.id, 'done', null, LUNES);
  assert.equal(a.hecha, LUNES.toISOString());
  L.mover(e, a.id, 'doing');
  assert.equal(a.hecha, null, 'si vuelve atrás deja de estar hecha');
  assert.equal(a.sprint, e.activo);
});

test('el resumen cuenta tareas, puntos y días restantes', () => {
  const { e, a, b } = conSprint();
  L.mover(e, a.id, 'done');
  L.mover(e, b.id, 'doing');
  const r = L.resumen(e, new Date(2026, 8, 25)); // viernes
  assert.deepEqual(r, { total: 2, hechas: 1, puntos: 8, puntosHechos: 3, diasRestantes: 3, duracion: 7 });
  assert.equal(L.resumen(e, new Date(2026, 9, 3)).diasRestantes, 0, 'pasado el final no hay días negativos');
});

test('cerrar el sprint devuelve lo pendiente al principio del backlog', () => {
  const { e, a, b, c } = conSprint();
  L.mover(e, a.id, 'done');
  L.mover(e, b.id, 'doing');
  const { sprint, devueltas } = L.cerrarSprint(e, new Date(2026, 8, 27));

  assert.equal(devueltas, 1);
  assert.equal(e.activo, null);
  assert.equal(sprint.cerrado, true);
  assert.equal(sprint.resumen.hechas, 1);
  assert.deepEqual(L.columna(e, 'backlog').map((t) => t.id), [b.id, c.id]);
  assert.equal(a.estado, 'done', 'lo hecho se queda en su sprint');
  assert.equal(L.siguienteNombre(e), 'Sprint 2');
});

test('exportar e importar deja todo igual', () => {
  const { e, a } = conSprint();
  L.mover(e, a.id, 'doing');
  const copia = L.importar(L.exportar(e));
  assert.deepEqual(copia, e);
});

test('importar rechaza archivos que no son copias', () => {
  assert.throws(() => L.importar('esto no es json'), /noEsJson/);
  assert.throws(() => L.importar('{"hola": 1}'), /noEsCopia/);
});

test('importar limpia datos raros o peligrosos', () => {
  const texto = JSON.stringify({
    tareas: [
      { id: 'x1', titulo: '<img src=x onerror=alert(1)>', estado: 'doing', sprint: 'no-existe', puntos: 999 },
      { id: 'x1', titulo: 'Duplicada' },
      { id: 'x2', titulo: '' },
      { titulo: 'Sin id' },
    ],
    sprints: [{ id: 's1', inicio: 'ayer', fin: '2026-01-01' }],
    activo: 's1',
  });
  const e = L.importar(texto);
  assert.equal(e.tareas.length, 1, 'fuera duplicadas, vacías y sin id');
  assert.equal(e.tareas[0].estado, 'backlog', 'sin sprint válido vuelve al backlog');
  assert.equal(e.tareas[0].puntos, null);
  assert.equal(e.sprints.length, 0, 'un sprint con fechas rotas se descarta');
  assert.equal(e.activo, null);
  // El texto se guarda tal cual: es la pantalla la que lo escapa al pintarlo
  assert.equal(e.tareas[0].titulo, '<img src=x onerror=alert(1)>');
});
