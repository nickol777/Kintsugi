// Utilidades compartidas: accesibilidad (RF 08-03) y almacenamiento seguro.

function guardar(clave, valor) {
  try { localStorage.setItem(clave, valor); } catch (e) { /* sin almacenamiento */ }
}
function leer(clave, porDefecto) {
  try {
    const v = localStorage.getItem(clave);
    return v === null ? porDefecto : v;
  } catch (e) { return porDefecto; }
}

(function iniciarAccesibilidad() {
  let tam = parseInt(leer('kint_tam', '16'), 10);
  if (isNaN(tam)) tam = 16;

  function aplicar() {
    document.documentElement.style.setProperty('--tam-base', tam + 'px');
    document.body.classList.toggle('alto-contraste', leer('kint_contraste', '0') === '1');
  }

  document.addEventListener('DOMContentLoaded', () => {
    aplicar();
    const mas = document.getElementById('acc-mas');
    const menos = document.getElementById('acc-menos');
    const contraste = document.getElementById('acc-contraste');
    if (mas) mas.addEventListener('click', () => { tam = Math.min(22, tam + 2); guardar('kint_tam', tam); aplicar(); });
    if (menos) menos.addEventListener('click', () => { tam = Math.max(12, tam - 2); guardar('kint_tam', tam); aplicar(); });
    if (contraste) contraste.addEventListener('click', () => {
      guardar('kint_contraste', leer('kint_contraste', '0') === '1' ? '0' : '1');
      aplicar();
    });
  });
})();
