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
    '.lg-scope .kpi-card',
    '.lg-scope .mat-toolbar'
  ].join(', ');
  // Sólo en motores Chromium: Chrome / Edge (window.chrome) y el WebView de la app de Android, que es Chromium
  // pero no expone window.chrome. Safari / iPhone puede responder true a CSS.supports sin dibujar bien el filtro,
  // por eso no basta con CSS.supports; ahí se queda el vidrio esmerilado del CSS.
  var esAndroidApp = !!(window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform() === 'android');
  var supported = (!!window.chrome || esAndroidApp) && CSS.supports('backdrop-filter', 'url(#lg)');
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

  /* Crea (o reemplaza) el filtro SVG de lente de w×h y regresa su id. */
  function filtroLente(el, id, w, h, r) {
    var cs = getComputedStyle(el);
    // Borde proporcional al lado corto: en barras delgadas un borde grueso estira el fondo
    var edge = parseFloat(cs.getPropertyValue('--lg-refract-edge')) || Math.min(Math.min(w, h) * 0.2, 22);
    var strength = parseFloat(cs.getPropertyValue('--lg-refract-strength')) || 1;
    var aberr = parseFloat(cs.getPropertyValue('--lg-refract-aberration')) || 0.10;
    var scale = edge * 1.3 * strength;

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
    return cs.getPropertyValue('--lg-refract-extra').trim() || 'blur(0.6px) saturate(165%) brightness(1.05)';
  }

  function build(el) {
    var w = el.offsetWidth, h = el.offsetHeight;
    if (!w || !h) return;
    var r = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, h / 2, w / 2);
    var state = tracked.get(el);
    var extra = filtroLente(el, state.id, w, h, r);
    var value = 'url(#' + state.id + ') ' + extra;
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

  /* =====================================================================
     REFRACCIÓN SOBRE UNA COPIA DEL FONDO (iPhone / Safari)
     Safari no soporta backdrop-filter: url(#filtro), y en WebKit los filtros
     SVG de distorsión no sirven aquí (feImage con imagen embebida no se pinta).
     Cada superficie recibe dentro una copia de la foto de fondo del módulo
     (el ::before fijo de .kpis-bg, .registro-bg…), alineada con la de atrás:
       · base: la copia con blur leve y más saturación (filtros CSS, con GPU);
       · lente: otra copia ampliada desde el centro de la tarjeta, visible sólo
         en una banda del borde que se desvanece: el borde muestra el fondo
         "jalado" desde adentro, como el filtro de lente de Android.
     Sólo con fondos de foto fija: el login (video) queda fuera, y donde no
     hay foto se queda el cristal simulado del CSS.
     ===================================================================== */
  var copias = new WeakMap();
  var conCopia = [];
  // DESACTIVADO (prototipo 2026-11-18): en AdnPhone se trababa al desplazarse en KPIs (se recalcula cada cuadro)
  // y el lente ampliado, al moverse distinto que el fondo, mareaba. En iPhone se queda el cristal simulado del CSS.
  var COPIA_ACTIVADA = false;
  var usarCopia = COPIA_ACTIVADA && !supported && CSS.supports('-webkit-mask-image', 'linear-gradient(#000, transparent)');
  var AUMENTO = 1.12;   // cuánto amplía el lente en el borde

  /** Busca hacia arriba el ::before fijo con imagen de fondo (patrón de los módulos). */
  function fondoDe(el) {
    for (var a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      var b = getComputedStyle(a, '::before');
      if (b.position === 'fixed' && /url\(/.test(b.backgroundImage)) return b;
    }
    return null;
  }

  var tamanos = {};   // url → {w, h} natural de la foto (para replicar background-size: cover)
  function tamanoDe(url, listo) {
    if (tamanos[url]) return tamanos[url];
    tamanos[url] = { w: 0, h: 0 };
    var im = new Image();
    im.onload = function () { tamanos[url] = { w: im.naturalWidth, h: im.naturalHeight }; listo(); };
    im.src = url;
    return tamanos[url];
  }

  function copiaDe(fondo) {
    var img = document.createElement('div');
    img.className = 'lg-copia-img';
    // misma foto y mezcla que el fondo del módulo; el tamaño y la posición se calculan en alinear()
    ['backgroundImage', 'backgroundColor', 'backgroundBlendMode'].forEach(function (k) { img.style[k] = fondo[k]; });
    img.style.backgroundRepeat = 'no-repeat';
    return img;
  }

  function agregarCopia(el) {
    if (copias.has(el)) return;
    if (el.tagName === 'TABLE' || el.classList.contains('navbar') || el.closest('app-login')) return;
    var fondo = fondoDe(el);
    if (!fondo) return;

    var capa = document.createElement('div');
    capa.className = 'lg-copia';
    capa.setAttribute('aria-hidden', 'true');
    var base = copiaDe(fondo);
    var borde = document.createElement('div');
    borde.className = 'lg-copia-borde';
    var lente = copiaDe(fondo);
    borde.appendChild(lente);
    capa.appendChild(base);
    capa.appendChild(borde);
    el.insertBefore(capa, el.firstChild);
    el.classList.add('lg-con-copia');

    var url = (fondo.backgroundImage.match(/url\(["']?([^"')]+)["']?\)/) || [])[1];
    copias.set(el, { base: base, lente: lente, borde: borde, url: url });
    tamanoDe(url, function () { conCopia.forEach(function (e) { copias.get(e).x = null; }); alinear(); });
    conCopia.push(el);
    if (window.ResizeObserver) {
      new ResizeObserver(function () { var st = copias.get(el); st.x = null; alinear(); }).observe(el);
    }
  }

  /** El fondo es una foto fija con background-size: cover centrada en la pantalla. Cada copia mide lo que su
      tarjeta y muestra exactamente el pedazo de foto que hay detrás (calculando tamaño y posición). */
  function alinear() {
    var vw = window.innerWidth, vh = window.innerHeight;
    conCopia = conCopia.filter(function (el) { return el.isConnected; });
    conCopia.forEach(function (el) {
      var st = copias.get(el);
      var t = tamanos[st.url];
      if (!t || !t.w) return;
      var rc = el.getBoundingClientRect();
      var x = rc.left + el.clientLeft, y = rc.top + el.clientTop;
      var w = el.clientWidth, h = el.clientHeight;
      if (x === st.x && y === st.y && w === st.w && h === st.h && vw === st.vw && vh === st.vh) return;
      st.x = x; st.y = y; st.w = w; st.h = h; st.vw = vw; st.vh = vh;

      // background-size: cover + background-position: center sobre la pantalla
      var k = Math.max(vw / t.w, vh / t.h), dw = t.w * k, dh = t.h * k;
      var ox = (vw - dw) / 2, oy = (vh - dh) / 2;
      st.base.style.backgroundSize = dw + 'px ' + dh + 'px';
      st.base.style.backgroundPosition = (ox - x) + 'px ' + (oy - y) + 'px';

      // lente: la misma foto ampliada desde el centro de la tarjeta; en el borde se ve lo que está más adentro
      var cx = x + w / 2, cy = y + h / 2;
      st.lente.style.backgroundSize = (dw * AUMENTO) + 'px ' + (dh * AUMENTO) + 'px';
      st.lente.style.backgroundPosition = (cx + (ox - cx) * AUMENTO - x) + 'px ' + (cy + (oy - cy) * AUMENTO - y) + 'px';

      // banda del lente proporcional al lado corto (en barras delgadas no se come todo)
      st.borde.style.setProperty('--lg-banda', Math.round(Math.min(Math.min(w, h) * 0.25, 20)) + 'px');
    });
  }

  // Realinea cada cuadro mientras haya movimiento (scroll, animaciones de entrada) y se detiene después
  var hasta = 0, corriendo = false;
  function seguir(ms) {
    hasta = Math.max(hasta, Date.now() + (ms || 600));
    if (corriendo) return;
    corriendo = true;
    (function paso() {
      alinear();
      if (Date.now() < hasta) requestAnimationFrame(paso); else corriendo = false;
    })();
  }

  function escanearCopias() {
    if (!usarCopia) return;
    document.querySelectorAll(SELECTOR).forEach(agregarCopia);
    seguir(1500);   // las tarjetas entran con animación
  }

  function start() {
    document.documentElement.classList.toggle('lg-refraction', supported);
    document.documentElement.classList.toggle('lg-refraction-copia', usarCopia);
    scan();
    escanearCopias();
    if (!supported && !usarCopia) return;
    var pending = false;
    new MutationObserver(function () {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () { pending = false; scan(); escanearCopias(); cleanup(); });
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    if (usarCopia) {
      window.addEventListener('scroll', function () { seguir(); }, { passive: true, capture: true });
      window.addEventListener('resize', function () { seguir(); });
      document.addEventListener('touchmove', function () { seguir(); }, { passive: true });
    }
  }

  window.LiquidRefraction = {
    refresh: function () { scan(); escanearCopias(); },
    rebuild: function (el) { if (tracked.has(el)) build(el); if (copias.has(el)) { copias.get(el).x = null; alinear(); } },
    supported: supported
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
