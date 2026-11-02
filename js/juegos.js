// Apartado de juegos (Módulo 04): patrones, burbujas y respiración.

const CLAVE_SESION_J = 'kint_sesion';
const INACTIVIDAD_MS = 30 * 60 * 1000; // RNF-06: 30 minutos

/* ---------- Sesión ---------- */
function leerSesion() {
  try { return JSON.parse(sessionStorage.getItem(CLAVE_SESION_J)); } catch (e) { return null; }
}
function cerrarSesion(expirada) {
  try { sessionStorage.removeItem(CLAVE_SESION_J); } catch (e) {}
  window.location.href = 'login.html' + (expirada ? '?expirada=1' : '');
}
function tocarActividad() {
  const s = leerSesion();
  if (!s) return;
  s.ultimo = Date.now();
  try { sessionStorage.setItem(CLAVE_SESION_J, JSON.stringify(s)); } catch (e) {}
}

const sesion = leerSesion();
if (!sesion) {
  window.location.href = 'login.html';
} else if (Date.now() - sesion.ultimo > INACTIVIDAD_MS) {
  cerrarSesion(true);
}

['click', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, tocarActividad, { passive: true }));
setInterval(() => {
  const s = leerSesion();
  if (!s || Date.now() - s.ultimo > INACTIVIDAD_MS) cerrarSesion(true);
}, 30000);

/* ---------- Registro de uso anónimo (RF 04-05) ---------- */
function registrarUso(juego, segundos) {
  if (segundos < 1) return;
  let uso;
  try { uso = JSON.parse(leer('kint_uso', '{}')); } catch (e) { uso = {}; }
  if (!uso[juego]) uso[juego] = { veces: 0, segundos: 0 };
  uso[juego].veces += 1;
  uso[juego].segundos += Math.round(segundos);
  guardar('kint_uso', JSON.stringify(uso)); // sin identificar al usuario
}

/* ---------- Control del juego activo ---------- */
const panel = document.getElementById('panel');
let limpiarJuego = null;
let inicioJuego = 0;
let juegoActual = null;

function detenerJuego() {
  if (limpiarJuego) { limpiarJuego(); limpiarJuego = null; }
  if (juegoActual) registrarUso(juegoActual, (Date.now() - inicioJuego) / 1000);
  juegoActual = null;
}

function abrirJuego(nombre) {
  detenerJuego();
  document.querySelectorAll('.opcion').forEach(b => {
    const activa = b.dataset.juego === nombre;
    b.classList.toggle('activa', activa);
    b.setAttribute('aria-selected', activa ? 'true' : 'false');
  });
  juegoActual = nombre;
  inicioJuego = Date.now();
  if (nombre === 'patrones') juegoPatrones();
  if (nombre === 'burbujas') juegoBurbujas();
  if (nombre === 'respiracion') juegoRespiracion();
}

function botonTerminar() {
  return '<button type="button" class="btn btn-sec" id="terminar">Terminar</button>';
}
function activarTerminar() {
  document.getElementById('terminar').addEventListener('click', () => {
    detenerJuego();
    document.querySelectorAll('.opcion').forEach(b => { b.classList.remove('activa'); b.setAttribute('aria-selected', 'false'); });
    panel.innerHTML = '<div class="vacio">¡Bien hecho por tomarte un momento para ti! 🌷<br>Elige otro juego cuando quieras.</div>';
  });
}

/* ---------- 1. Ordenar patrones ---------- */
function juegoPatrones() {
  const nombres = ['rosa claro', 'azul claro', 'rosa fuerte', 'azul fuerte'];
  let secuencia = [];
  let pos = 0;
  let nivel = 1;
  let aceptaClics = false;
  const timers = [];

  panel.innerHTML = `
    <h2>Ordenar patrones</h2>
    <p class="instr">Mira la secuencia de colores y repítela en el mismo orden. Si te equivocas, no pasa nada: la vemos de nuevo.</p>
    <div class="marcador"><span>Nivel: <b id="p-nivel">1</b></span></div>
    <div class="pad-patron">
      ${nombres.map((n, i) => `<button type="button" class="pad" data-i="${i}" aria-label="Color ${n}" disabled></button>`).join('')}
    </div>
    <div class="estado-patron" id="p-estado"></div>
    <div class="controles">
      <button type="button" class="btn" id="p-inicio">Empezar</button>
      ${botonTerminar()}
    </div>`;
  activarTerminar();

  const pads = Array.from(panel.querySelectorAll('.pad'));
  const estado = document.getElementById('p-estado');

  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function encender(i, ms) {
    pads[i].classList.add('encendido');
    later(() => pads[i].classList.remove('encendido'), ms);
  }
  function mostrar() {
    aceptaClics = false;
    pads.forEach(p => p.disabled = true);
    estado.textContent = 'Observa con calma…';
    pos = 0;
    secuencia.forEach((c, idx) => {
      later(() => encender(c, 500), 800 + idx * 800);
    });
    later(() => {
      aceptaClics = true;
      pads.forEach(p => p.disabled = false);
      estado.textContent = 'Tu turno 💗';
    }, 800 + secuencia.length * 800);
  }
  function nuevaRonda() {
    secuencia.push(Math.floor(Math.random() * 4));
    document.getElementById('p-nivel').textContent = secuencia.length;
    nivel = secuencia.length;
    mostrar();
  }

  document.getElementById('p-inicio').addEventListener('click', () => {
    timers.forEach(clearTimeout);
    secuencia = [];
    nuevaRonda();
  });

  pads.forEach(p => p.addEventListener('click', () => {
    if (!aceptaClics) return;
    const i = parseInt(p.dataset.i, 10);
    encender(i, 250);
    if (i === secuencia[pos]) {
      pos++;
      if (pos === secuencia.length) {
        aceptaClics = false;
        estado.textContent = '¡Muy bien! ✨';
        later(nuevaRonda, 900);
      }
    } else {
      aceptaClics = false;
      estado.textContent = 'Casi. Respira y miremos la secuencia otra vez.';
      later(mostrar, 1400);
    }
  }));

  limpiarJuego = () => timers.forEach(clearTimeout);
}

/* ---------- 2. Estallar burbujas ---------- */
function juegoBurbujas() {
  let estalladas = 0;
  let generador = null;

  panel.innerHTML = `
    <h2>Estallar burbujas</h2>
    <p class="instr">Toca las burbujas para estallarlas. Sin tiempo ni puntos que perder: solo disfruta.</p>
    <div class="marcador"><span>Burbujas estalladas: <b id="b-cont">0</b></span></div>
    <div class="area-burbujas" id="area"></div>
    <div class="controles">${botonTerminar()}</div>`;
  activarTerminar();

  const area = document.getElementById('area');
  const colores = [
    'rgba(248, 200, 220, 0.75)', 'rgba(189, 224, 254, 0.75)',
    'rgba(238, 159, 192, 0.65)', 'rgba(142, 197, 242, 0.65)'
  ];

  function crear() {
    const tam = 36 + Math.random() * 44;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'burbuja';
    b.setAttribute('aria-label', 'Burbuja');
    b.style.width = b.style.height = tam + 'px';
    b.style.left = Math.random() * Math.max(10, area.clientWidth - tam) + 'px';
    b.style.background = colores[Math.floor(Math.random() * colores.length)];
    b.style.animationDuration = (5 + Math.random() * 4) + 's';
    b.addEventListener('click', () => {
      if (b.classList.contains('estalla')) return;
      b.classList.add('estalla');
      estalladas++;
      document.getElementById('b-cont').textContent = estalladas;
      setTimeout(() => b.remove(), 250);
    });
    b.addEventListener('animationend', e => { if (e.animationName === 'subir') b.remove(); });
    area.appendChild(b);
  }

  for (let i = 0; i < 5; i++) setTimeout(crear, i * 300);
  generador = setInterval(crear, 900);
  limpiarJuego = () => clearInterval(generador);
}

/* ---------- 3. Respiración interactiva ---------- */
function juegoRespiracion() {
  let ciclos = 0;
  let corriendo = true;
  const timers = [];

  panel.innerHTML = `
    <h2>Respiración interactiva</h2>
    <p class="instr">Sigue el círculo: inhala mientras crece, sostén, y exhala despacio mientras se encoge.</p>
    <div class="marcador"><span>Respiraciones: <b id="r-cont">0</b></span></div>
    <div class="resp-caja">
      <div class="circulo-resp" id="circulo" aria-hidden="true"></div>
      <div class="texto-resp" id="r-texto" role="status">Prepárate…</div>
    </div>
    <div class="controles">${botonTerminar()}</div>`;
  activarTerminar();

  const circulo = document.getElementById('circulo');
  const texto = document.getElementById('r-texto');

  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

  function ciclo() {
    if (!corriendo) return;
    circulo.className = 'circulo-resp inhala';
    texto.textContent = 'Inhala por la nariz… (4 s)';
    later(() => {
      circulo.className = 'circulo-resp sostiene';
      texto.textContent = 'Sostén el aire… (4 s)';
    }, 4000);
    later(() => {
      circulo.className = 'circulo-resp exhala';
      texto.textContent = 'Exhala despacio por la boca… (6 s)';
    }, 8000);
    later(() => {
      ciclos++;
      document.getElementById('r-cont').textContent = ciclos;
      ciclo();
    }, 14000);
  }

  later(ciclo, 1500);
  limpiarJuego = () => { corriendo = false; timers.forEach(clearTimeout); };
}

/* ---------- Inicio ---------- */
document.addEventListener('DOMContentLoaded', () => {
  if (sesion) document.getElementById('saludo').textContent = 'Hola, ' + sesion.nombre.split(' ')[0] + ' 🌸';
  document.querySelectorAll('.opcion').forEach(b => b.addEventListener('click', () => abrirJuego(b.dataset.juego)));
  document.getElementById('salir').addEventListener('click', () => { detenerJuego(); cerrarSesion(false); });
  window.addEventListener('beforeunload', detenerJuego);
});
