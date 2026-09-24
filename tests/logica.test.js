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

/* ---------- Tableros ---------- */

test('un espacio nuevo trae un tablero de Scrum y otro de post-its', () => {
  const esp = L.espacioVacio({ scrum: 'Mi sprint', notas: 'Post-its' });
  assert.deepEqual(esp.tableros.map((t) => [t.tipo, t.nombre]), [['scrum', 'Mi sprint'], ['notas', 'Post-its']]);
  assert.equal(L.tableroActual(esp).tipo, 'scrum');
});

test('varios sprints a la vez, uno por tablero', () => {
  const esp = L.espacioVacio();
  const trabajo = L.tableroActual(esp);
  const estudios = L.nuevoTablero(esp, { tipo: 'scrum', nombre: '  Estudios  ' });
  assert.equal(estudios.nombre, 'Estudios');
  assert.equal(esp.actual, estudios.id, 'el tablero nuevo se abre');
  L.empezarSprint(trabajo, { nombre: 'Trabajo 1' }, LUNES);
  L.empezarSprint(estudios, { nombre: 'Estudios 1', dias: 7 }, LUNES);
  assert.ok(trabajo.activo && estudios.activo && trabajo.activo !== estudios.activo);
  const t = L.nuevaTarea(estudios, { titulo: 'Repasar Docker' });
  L.mover(estudios, t.id, 'doing');
  assert.equal(L.columna(trabajo, 'doing').length, 0, 'las tareas no se mezclan entre tableros');
  assert.equal(L.columna(estudios, 'doing').length, 1);
});

test('renombrar, cambiar y borrar tableros', () => {
  const esp = L.espacioVacio();
  const [a, b] = esp.tableros;
  L.renombrarTablero(esp, b.id, '   ');
  assert.equal(b.nombre, 'Post-its', 'un nombre vacío no borra el que había');
  L.renombrarTablero(esp, b.id, 'Casa');
  L.elegirTablero(esp, b.id);
  L.borrarTablero(esp, b.id);
  assert.equal(esp.actual, a.id, 'al borrar el abierto se abre el de al lado');
  assert.throws(() => L.borrarTablero(esp, a.id), /ultimoTablero/);
  assert.throws(() => L.nuevoTablero(esp, { tipo: 'raro' }), /tipoRaro/);
});

/* ---------- Post-its ---------- */

test('post-its con lista de tareas por hacer y hechas', () => {
  const esp = L.espacioVacio();
  const tab = esp.tableros[1];
  const compra = L.nuevaNota(tab, { titulo: 'Compra', color: 'verde' });
  const ideas = L.nuevaNota(tab, { titulo: 'Ideas', color: 'fucsia' });
  assert.deepEqual(tab.notas.map((n) => n.titulo), ['Ideas', 'Compra'], 'el nuevo sale primero');
  assert.equal(ideas.color, 'amarillo', 'un color desconocido se queda en amarillo');

  const leche = L.nuevoItem(tab, compra.id, 'Leche');
  L.nuevoItem(tab, compra.id, 'Pan');
  L.marcarItem(tab, compra.id, leche.id, true);
  assert.deepEqual(compra.items.map((i) => [i.texto, i.hecho]), [['Leche', true], ['Pan', false]]);
  assert.throws(() => L.nuevoItem(tab, compra.id, '  '), /tituloVacio/);

  L.editarNota(tab, compra.id, { hecha: true, color: 'rosa' });
  assert.equal(compra.hecha, true);
  assert.equal(compra.color, 'rosa');
  L.moverNota(tab, compra.id, ideas.id);
  assert.deepEqual(tab.notas.map((n) => n.titulo), ['Compra', 'Ideas']);
  L.borrarItem(tab, compra.id, leche.id);
  L.borrarNota(tab, ideas.id);
  assert.deepEqual(tab.notas.map((n) => [n.titulo, n.items.length]), [['Compra', 1]]);
});

/* ---------- Copias de seguridad ---------- */

test('exportar e importar deja todo igual', () => {
  const esp = L.espacioVacio();
  const scrum = esp.tableros[0];
  const a = L.nuevaTarea(scrum, { titulo: 'A', puntos: 3 });
  L.empezarSprint(scrum, {}, LUNES);
  L.mover(scrum, a.id, 'doing');
  const nota = L.nuevaNota(esp.tableros[1], { titulo: 'Recados', color: 'lila' });
  L.nuevoItem(esp.tableros[1], nota.id, 'Correos');
  assert.deepEqual(L.importar(L.exportar(esp)), esp);
});

test('las copias de la versión 1 se convierten en un tablero de Scrum', () => {
  const { e, a } = conSprint();
  L.mover(e, a.id, 'doing');
  const v1 = JSON.stringify({ app: 'sprint.exe', version: 1, ...e });
  const esp = L.importar(v1, { scrum: 'Mi sprint' });
  assert.equal(esp.version, 2);
  assert.equal(esp.tableros.length, 1);
  const t = esp.tableros[0];
  assert.equal(t.tipo, 'scrum');
  assert.equal(t.nombre, 'Mi sprint');
  assert.equal(esp.actual, t.id);
  assert.deepEqual({ tareas: t.tareas, sprints: t.sprints, activo: t.activo }, { tareas: e.tareas, sprints: e.sprints, activo: e.activo });
});

test('importar rechaza archivos que no son copias', () => {
  assert.throws(() => L.importar('esto no es json'), /noEsJson/);
  assert.throws(() => L.importar('{"hola": 1}'), /noEsCopia/);
  assert.throws(() => L.importar('{"tableros": []}'), /noEsCopia/, 'sin ningún tablero válido');
});

test('importar limpia datos raros o peligrosos', () => {
  const texto = JSON.stringify({
    tableros: [
      {
        id: 'b1', tipo: 'scrum', nombre: 'Scrum',
        tareas: [
          { id: 'x1', titulo: '<img src=x onerror=alert(1)>', estado: 'doing', sprint: 'no-existe', puntos: 999 },
          { id: 'x1', titulo: 'Duplicada' },
          { id: 'x2', titulo: '' },
          { titulo: 'Sin id' },
        ],
        sprints: [{ id: 's1', inicio: 'ayer', fin: '2026-01-01' }],
        activo: 's1',
      },
      { id: 'b1', tipo: 'notas', nombre: 'Repetido', notas: [] },
      { id: 'b2', tipo: 'hackeo', nombre: 'Tipo raro' },
      {
        id: 'b3', tipo: 'notas', nombre: '',
        notas: [
          { id: 'n1', titulo: 'Bien', color: 'javascript:alert(1)', items: [{ id: 'i1', texto: 'ok', hecho: 'sí' }, { id: 'i1', texto: 'dup' }, { texto: 'sin id' }] },
          { id: 'n2', titulo: '   ' },
        ],
      },
    ],
    actual: 'no-existe',
  });
  const esp = L.importar(texto);
  assert.deepEqual(esp.tableros.map((t) => t.id), ['b1', 'b3'], 'fuera tableros repetidos y de tipo raro');
  assert.equal(esp.actual, 'b1', 'si el abierto no existe, se abre el primero');

  const [scrum, notas] = esp.tableros;
  assert.equal(scrum.tareas.length, 1, 'fuera tareas duplicadas, vacías y sin id');
  assert.equal(scrum.tareas[0].estado, 'backlog', 'sin sprint válido vuelve al backlog');
  assert.equal(scrum.tareas[0].puntos, null);
  assert.equal(scrum.sprints.length, 0, 'un sprint con fechas rotas se descarta');
  assert.equal(scrum.activo, null);
  // El texto se guarda tal cual: es la pantalla la que lo escapa al pintarlo
  assert.equal(scrum.tareas[0].titulo, '<img src=x onerror=alert(1)>');

  assert.equal(notas.nombre, 'Post-its');
  assert.equal(notas.notas.length, 1, 'fuera post-its sin título');
  assert.equal(notas.notas[0].color, 'amarillo', 'solo colores de la lista');
  assert.deepEqual(notas.notas[0].items, [{ id: 'i1', texto: 'ok', hecho: true }]);
});
