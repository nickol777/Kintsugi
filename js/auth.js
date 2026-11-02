// Registro e inicio de sesión (Módulo 01).
// NOTA: es una simulación en el navegador (localStorage). En el sistema real
// las cuentas y el hash de contraseñas viven en el servidor (RNF-05).

const CLAVE_USUARIOS = 'kint_usuarios';
const CLAVE_SESION = 'kint_sesion';
const VERSION_CONSENTIMIENTO = '1.0';

function cargarUsuarios() {
  try { return JSON.parse(leer(CLAVE_USUARIOS, '[]')); } catch (e) { return []; }
}
function guardarUsuarios(lista) { guardar(CLAVE_USUARIOS, JSON.stringify(lista)); }

async function hashClave(texto) {
  const datos = new TextEncoder().encode('kintsugi|' + texto);
  if (window.crypto && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', datos);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Respaldo simple si el navegador no ofrece crypto.subtle.
  let h = 0;
  for (const c of texto) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return 'x' + h;
}

function correoValido(c) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c); }
function claveValida(p) { return p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p); }

function marcarError(input, mensaje) {
  const caja = input.closest('.campo');
  input.classList.add('invalido');
  input.setAttribute('aria-invalid', 'true');
  const m = caja.querySelector('.mensaje-error');
  if (m) m.textContent = mensaje;
}
function limpiarError(input) {
  const caja = input.closest('.campo');
  input.classList.remove('invalido');
  input.removeAttribute('aria-invalid');
  const m = caja.querySelector('.mensaje-error');
  if (m) m.textContent = '';
}
function mostrarAviso(tipo, texto) {
  const a = document.getElementById('aviso');
  a.className = 'aviso ' + tipo;
  a.textContent = texto;
}

function activarVerPassword() {
  document.querySelectorAll('.ver-pass').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      const oculto = input.type === 'password';
      input.type = oculto ? 'text' : 'password';
      btn.textContent = oculto ? 'Ocultar' : 'Ver';
      btn.setAttribute('aria-label', oculto ? 'Ocultar contraseña' : 'Mostrar contraseña');
    });
  });
}

/* ---------- REGISTRO ---------- */
function iniciarRegistro() {
  const form = document.getElementById('form-registro');
  const nombre = document.getElementById('nombre');
  const correo = document.getElementById('correo');
  const clave = document.getElementById('clave');
  const acepta = document.getElementById('acepta');
  const barra = document.querySelector('.fuerza span');
  const modal = document.getElementById('modal-consent');

  activarVerPassword();

  clave.addEventListener('input', () => {
    const p = clave.value;
    let puntos = 0;
    if (p.length >= 8) puntos++;
    if (/[A-Za-z]/.test(p) && /\d/.test(p)) puntos++;
    if (/[A-Z]/.test(p) && /[^A-Za-z0-9]/.test(p)) puntos++;
    const colores = ['#c2406b', '#ee9fc0', '#8ec5f2', '#3f8f6b'];
    barra.style.width = (puntos * 33.3) + '%';
    barra.style.background = colores[puntos];
  });

  [nombre, correo, clave].forEach(i => i.addEventListener('input', () => limpiarError(i)));

  document.getElementById('abrir-consent').addEventListener('click', e => {
    e.preventDefault();
    modal.classList.add('abierto');
    document.getElementById('cerrar-consent').focus();
  });
  document.getElementById('cerrar-consent').addEventListener('click', () => modal.classList.remove('abierto'));
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('abierto'); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') modal.classList.remove('abierto'); });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    let ok = true;

    if (nombre.value.trim().length < 2) { marcarError(nombre, 'Escribe tu nombre.'); ok = false; }
    if (!correoValido(correo.value.trim())) { marcarError(correo, 'Escribe un correo válido.'); ok = false; }
    if (!claveValida(clave.value)) {
      marcarError(clave, 'Mínimo 8 caracteres, con al menos una letra y un número.');
      ok = false;
    }
    const errConsent = document.getElementById('error-consent');
    if (!acepta.checked) {
      errConsent.textContent = 'Debes aceptar el consentimiento informado para crear tu cuenta.';
      ok = false;
    } else { errConsent.textContent = ''; }
    if (!ok) return;

    const usuarios = cargarUsuarios();
    const correoNorm = correo.value.trim().toLowerCase();
    if (usuarios.some(u => u.correo === correoNorm)) {
      marcarError(correo, 'Este correo ya está registrado. Inicia sesión o usa otro.');
      return;
    }

    usuarios.push({
      nombre: nombre.value.trim(),
      correo: correoNorm,
      hash: await hashClave(clave.value),
      activa: false, // RF 01-02: requiere activación por correo
      consentimiento: { fecha: new Date().toISOString(), version: VERSION_CONSENTIMIENTO }, // RF 01-03
      rol: 'usuario'
    });
    guardarUsuarios(usuarios);

    form.style.display = 'none';
    const exito = document.getElementById('exito');
    exito.style.display = 'block';
    document.getElementById('correo-enviado').textContent = correoNorm;
    document.getElementById('simular-activacion').addEventListener('click', () => {
      const lista = cargarUsuarios();
      const u = lista.find(x => x.correo === correoNorm);
      if (u) { u.activa = true; guardarUsuarios(lista); }
      window.location.href = 'login.html?activada=1';
    });
  });
}

/* ---------- INICIO DE SESIÓN ---------- */
function iniciarLogin() {
  const form = document.getElementById('form-login');
  const correo = document.getElementById('correo');
  const clave = document.getElementById('clave');

  activarVerPassword();
  if (new URLSearchParams(location.search).get('activada') === '1') {
    mostrarAviso('ok', 'Tu cuenta quedó activa. Ya puedes iniciar sesión.');
  }
  if (new URLSearchParams(location.search).get('expirada') === '1') {
    mostrarAviso('error', 'Tu sesión se cerró por inactividad. Inicia sesión de nuevo.');
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const c = correo.value.trim().toLowerCase();
    if (!c || !clave.value) {
      mostrarAviso('error', 'Escribe tu correo y tu contraseña.');
      return;
    }
    const usuario = cargarUsuarios().find(u => u.correo === c);
    const hash = await hashClave(clave.value);

    // Mensaje único para no revelar cuál dato falló (RF 01-05).
    if (!usuario || usuario.hash !== hash) {
      mostrarAviso('error', 'Correo o contraseña incorrectos.');
      return;
    }
    if (!usuario.activa) { // RF 01-02
      mostrarAviso('error', 'Tu cuenta aún no está activa. Abre el enlace que enviamos a tu correo.');
      return;
    }
    try {
      sessionStorage.setItem(CLAVE_SESION, JSON.stringify({ correo: usuario.correo, nombre: usuario.nombre, ultimo: Date.now() }));
    } catch (err) { /* sin sessionStorage */ }
    window.location.href = 'juegos.html';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('form-registro')) iniciarRegistro();
  if (document.getElementById('form-login')) iniciarLogin();
});
