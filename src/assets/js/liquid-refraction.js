/* =====================================================================
   LIQUID GLASS — refracción (experimental)
   ---------------------------------------------------------------------
   A cada elemento de SELECTOR (ver abajo) le genera un filtro SVG a su
   medida que dobla el fondo en los bordes (como un lente grueso) y separa
   los canales R/G/B para la franja de color (aberración cromática).

   Sólo Chromium (Chrome / Edge) soporta backdrop-filter: url(#filtro).
   En Safari / Firefox el elemento se queda con el respaldo del CSS.
   ===================================================================== */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  /* Elementos que reciben refracción: la clase .lg-clear, más los botones y
     las tarjetas KPI dentro de .lg-scope (así no hay que marcar cada botón). */
  var SELECTOR = [
    '.lg-clear',
    '.lg-scope .mat-mdc-raised-button',
    '.lg-scope .mat-mdc-unelevated-button',
    '.lg-scope .btn',
    '.lg-scope .kpi-card'
  ].join(', ');
  // En la app de Android no se usa: así se ve igual que en iPhone (donde Safari no la soporta) y ahorra GPU.
  // Para volver a activarla en Android, quitar la condición de esAndroidApp.
  var esAndroidApp = !!(window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform() === 'android');
  var supported = !esAndroidApp && !!window.chrome && CSS.supports('backdrop-filter', 'url(#lg)');
  var defs = null;
  var counter = 0;
  var tracked = new WeakMap();

  function getDefs() {
    if (defs) return defs;
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.position = 'absolute';
    defs = document.createElementNS(NS, 'defs');
    svg.appendChild(defs);
    document.body.appendChild(svg);
    return defs;
  }

  /* Mapa de desplazamiento: R = eje X, G = eje Y, 128 = sin desplazamiento.
     Se calcula con la distancia al borde redondeado: el centro queda neutro y
     sólo la franja del borde (edge) dobla la luz hacia adentro, como un
     cristal grueso. */
  function displacementMap(w, h, r, edge) {
    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext('2d');
    var img = ctx.createImageData(w, h);
    var data = img.data;
    var hw = w / 2, hh = h / 2;
    var bx = hw - r, by = hh - r;

    for (var y = 0; y < h; y++) {
      var py = y + 0.5 - hh, ay = Math.abs(py), sy = py < 0 ? -1 : 1;
      for (var x = 0; x < w; x++) {
        var px = x + 0.5 - hw, ax = Math.abs(px), sx = px < 0 ? -1 : 1;
        var qx = ax - bx, qy = ay - by;
        var nx, ny, dist;
        if (qx > 0 && qy > 0) {
          // Esquina redondeada: normal radial
          var len = Math.sqrt(qx * qx + qy * qy) || 1;
          dist = r - len;
          nx = (qx / len) * sx;
          ny = (qy / len) * sy;
        } else if (qx > qy) {
          dist = r - qx;
          nx = sx; ny = 0;
        } else {
          dist = r - qy;
          nx = 0; ny = sy;
        }
        var dx = 0, dy = 0;
        if (dist < edge) {
          var t = 1 - Math.max(dist, 0) / edge;   // 0 en el interior, 1 en el filo
          var mag = t * t;
          dx = -nx * mag;                          // muestrear hacia adentro
          dy = -ny * mag;
        }
        var i = (y * w + x) * 4;
        data[i] = 128 + dx * 127;
        data[i + 1] = 128 + dy * 127;
        data[i + 2] = 128;
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return canvas.toDataURL();
  }

  function channel(inName, map, scale, matrix, out) {
    return '<feDisplacementMap in="' + inName + '" in2="' + map + '" scale="' + scale +
      '" xChannelSelector="R" yChannelSelector="G" result="' + out + '_d"/>' +
      '<feColorMatrix in="' + out + '_d" type="matrix" values="' + matrix + '" result="' + out + '"/>';
  }

  function build(el) {
    var w = el.offsetWidth, h = el.offsetHeight;
    if (!w || !h) return;
    var cs = getComputedStyle(el);
    var r = Math.min(parseFloat(cs.borderTopLeftRadius) || 0, h / 2, w / 2);
    // Borde proporcional al lado corto: en barras delgadas un borde grueso estira el fondo
    var edge = parseFloat(cs.getPropertyValue('--lg-refract-edge')) || Math.min(Math.min(w, h) * 0.2, 22);
    var strength = parseFloat(cs.getPropertyValue('--lg-refract-strength')) || 1;
    var aberr = parseFloat(cs.getPropertyValue('--lg-refract-aberration')) || 0.10;
    var scale = edge * 1.3 * strength;

    var state = tracked.get(el);
    var id = state.id;
    var old = document.getElementById(id);
    if (old) old.remove();

    var f = document.createElementNS(NS, 'filter');
    f.setAttribute('id', id);
    f.setAttribute('x', '0');
    f.setAttribute('y', '0');
    f.setAttribute('width', w);
    f.setAttribute('height', h);
    f.setAttribute('filterUnits', 'userSpaceOnUse');
    f.setAttribute('color-interpolation-filters', 'sRGB');
    f.innerHTML =
      '<feImage href="' + displacementMap(w, h, r, edge) + '" x="0" y="0" width="' + w + '" height="' + h +
      '" preserveAspectRatio="none" result="map"/>' +
      channel('SourceGraphic', 'map', scale * (1 + aberr), '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0', 'red') +
      channel('SourceGraphic', 'map', scale, '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0', 'green') +
      channel('SourceGraphic', 'map', scale * (1 - aberr), '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0', 'blue') +
      '<feBlend in="red" in2="green" mode="screen" result="rg"/>' +
      '<feBlend in="rg" in2="blue" mode="screen"/>';
    getDefs().appendChild(f);

    var extra = cs.getPropertyValue('--lg-refract-extra').trim() || 'blur(0.6px) saturate(165%) brightness(1.05)';
    var value = 'url(#' + id + ') ' + extra;
    el.style.setProperty('backdrop-filter', value);
    el.style.setProperty('-webkit-backdrop-filter', value);
  }

  function attach(el) {
    if (tracked.has(el)) return;
    tracked.set(el, { id: 'lg-refract-' + (++counter) });
    build(el);
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () { build(el); });
      ro.observe(el);
      tracked.get(el).ro = ro;
    }
  }

  function scan(root) {
    if (!supported) return;
    (root || document).querySelectorAll(SELECTOR).forEach(attach);
  }

  function cleanup() {
    // Borra filtros cuyo elemento ya salió del DOM (cambio de ruta en Angular)
    if (!defs) return;
    Array.prototype.forEach.call(defs.children, function (f) {
      var alive = false;
      document.querySelectorAll(SELECTOR).forEach(function (el) {
        var s = tracked.get(el);
        if (s && s.id === f.id) alive = true;
      });
      if (!alive) f.remove();
    });
  }

  function start() {
    document.documentElement.classList.toggle('lg-refraction', supported);
    scan();
    if (!supported) return;
    var pending = false;
    new MutationObserver(function () {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () { pending = false; scan(); cleanup(); });
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  window.LiquidRefraction = {
    refresh: scan,
    rebuild: function (el) { if (tracked.has(el)) build(el); },
    supported: supported
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
