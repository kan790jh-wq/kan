/* KAN V7.0 · Núcleo de la app: utilidades, navegación, estructura, mascota, avisos, sincronización.
   Las vistas de negocio están en vistas.js. Ningún permiso se decide aquí: la app solo muestra
   lo que el servidor entrega y el servidor vuelve a validar cada operación. */
(function () {
  var api = window.KANApi;
  var K = window.KAN = { api: api, S: { perfil: null, meta: null, noLeidas: 0, rev: 0 }, vistas: {}, acciones: {}, fotos: {} };
  var S = K.S;

  /* ---------- Utilidades ---------- */
  var esc = K.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  K.$ = function (s, r) { return (r || document).querySelector(s); };
  K.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  K.dinero = function (n) { return n === null || n === undefined || n === '' ? '—' : '$' + Math.round(Number(n)).toLocaleString('es-MX'); };
  K.pct = function (x) { return (Math.round(x * 1000) / 10).toLocaleString('es-MX') + '%'; };
  K.fecha = function (t) { return t ? new Date(t).toLocaleString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'; };
  K.dia = function (t) { return t ? new Date(t).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : '—'; };
  K.hace = function (t) {
    if (!t) return 'nunca';
    var s = Math.round((Date.now() - t) / 1000);
    if (s < 0) { var f = -s; if (f < 3600) return 'en ' + Math.ceil(f / 60) + ' min'; if (f < 86400) return 'en ' + Math.round(f / 3600) + ' h'; return 'en ' + Math.round(f / 86400) + ' días'; }
    if (s < 45) return 'hace un momento'; if (s < 3600) return 'hace ' + Math.round(s / 60) + ' min';
    if (s < 86400) return 'hace ' + Math.round(s / 3600) + ' h'; return 'hace ' + Math.round(s / 86400) + ' días';
  };
  K.NOMBRE_ESTADO = { DISPONIBLE: 'Disponible', APARTADO: 'Apartado', REVISION: 'En revisión', VENDIDO: 'Vendido', RETIRADO: 'Retirado' };
  K.estado = function (e) { return '<span class="estado e-' + esc(e) + '">' + esc(K.NOMBRE_ESTADO[e] || e) + '</span>'; };
  K.puede = function (p) { var l = (S.perfil && S.perfil.permisos) || []; return l.indexOf('*') >= 0 || l.indexOf(p) >= 0; };
  K.rol = function () { return S.perfil ? S.perfil.rol : ''; };

  var IC = {
    inicio: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>', catalogo: '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
    caja: '<path d="M3 8l9-5 9 5v8l-9 5-9-5V8zM3 8l9 5 9-5M12 13v8"/>', mas: '<path d="M12 5v14M5 12h14"/>', campana: '<path d="M6 8a6 6 0 0112 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 004 0"/>',
    usuario: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>', estrella: '<path d="M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4 6.5 20.3l1-6.2L3 9.7l6.2-.9z"/>',
    calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2M12 11h2M16 11v6M8 15h2M12 15h2M8 19h2M12 19h2"/>', buscar: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    filtro: '<path d="M4 5h16l-6 8v6l-4-2v-4z"/>', tabla: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/>', rejilla: '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
    izq: '<path d="M15 6l-6 6 6 6"/>', der: '<path d="M9 6l6 6-6 6"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', check: '<path d="M5 12l5 5 9-10"/>', editar: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/>',
    copiar: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 011-1h10"/>', enviar: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>', camara: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    basura: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', candado: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
    escudo: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>', salir: '<path d="M15 4h4v16h-4"/><path d="M10 8l-4 4 4 4M6 12h11"/>', descargar: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    deshacer: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 010 10h-3"/>', ojo: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', telefono: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
    tablet: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M11 18h2"/>', laptop: '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/>', audifonos: '<path d="M4 14v-2a8 8 0 0116 0v2"/><path d="M4 14h3v6H4zM17 14h3v6h-3z"/>',
    enlace: '<path d="M10 14a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1"/><path d="M14 10a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1"/>', comparar: '<path d="M8 3v18M16 3v18M3 8h5M16 16h5"/>',
    sonido: '<path d="M11 5L6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 010 7"/>', respaldo: '<path d="M4 7c0-2 4-3 8-3s8 1 8 3-4 3-8 3-8-1-8-3zM4 7v10c0 2 4 3 8 3s8-1 8-3V7M4 12c0 2 4 3 8 3s8-1 8-3"/>'
  };
  var ic = K.ic = function (n) { return '<svg class="i" viewBox="0 0 24 24" aria-hidden="true">' + (IC[n] || '') + '</svg>'; };
  K.icCategoria = function (c) { return { Celulares: 'telefono', Tablets: 'tablet', Computadoras: 'laptop', Accesorios: 'audifonos' }[c] || 'caja'; };
  K.arte = function (cat) { return '<svg class="arte" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" aria-hidden="true">' + IC[K.icCategoria(cat)] + '</svg>'; };

  /* ---------- Mascota contextual ---------- */
  var POSES = { entusiasmo: 'img/m_pulgar.webp', inteligencia: 'img/m_tablet.webp', confianza: 'img/m2_cool.webp', pensamiento: 'img/m2_duda.webp',
    trabajo: 'img/m2_laptop.webp', advertencia: 'img/m2_sorpresa.webp', carino: 'img/m_heart.webp', exito: 'img/m2_fiesta.webp',
    saludo: 'img/m2_saludo.webp', fiesta: 'img/m2_fiesta.webp', lupa: 'img/m2_lupa.webp', caja: 'img/m2_caja.webp', escudo: 'img/m2_escudo.webp',
    dormido: 'img/m2_dormido.webp', confuso: 'img/m2_confuso.webp', risa: 'img/m2_risa.webp', fuerza: 'img/m2_fuerza.webp', selfie: 'img/m2_selfie.webp',
    tablet: 'img/m2_sentado.webp', airpods: 'img/m2_airpods.webp', sorpresa: 'img/m2_sorpresa.webp', duda: 'img/m2_duda.webp', cool: 'img/m2_cool.webp' };
  K.pose = function (t) { return POSES[t] || POSES.confianza; };
  K.mascota = function (tipo, texto, clase) {
    return '<div class="mascota ' + (clase || '') + (tipo === 'advertencia' ? ' advertencia' : '') + '"><img src="' + K.pose(tipo) + '" alt="">' + (texto ? '<div class="globo">' + texto + '</div>' : '') + '</div>';
  };
  K.vacio = function (tipo, titulo, texto, extra) {
    return '<div class="vacio entra">' + K.mascota(tipo, '', 'vertical') + '<h2>' + esc(titulo) + '</h2>' + (texto ? '<p class="mut" style="margin:0;max-width:420px">' + texto + '</p>' : '') + (extra || '') + '</div>';
  };
  K.cargando = function (texto) {
    var p = ['trabajo', 'tablet', 'lupa'][Math.floor(Math.random() * 3)];
    return '<div class="cargando"><img class="m-flota" src="' + K.pose(p) + '" alt=""><span>' + esc(texto || 'Cargando…') + '</span><i class="puntos"><b></b><b></b><b></b></i></div>';
  };

  /* ---------- Logos de tienda (se piden al servidor una vez y se recuerdan en el dispositivo) ---------- */
  K.logos = {};
  try { K.logos = JSON.parse(localStorage.getItem('kan_v7_logos') || '{}'); } catch (e) { K.logos = {}; }
  var logosPend = {}, logosTimer = null;
  function iniciales(n) { return esc(String(n || '?').split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase()); }
  K.logoTienda = function (tiendaId, logoId, nombre, tam) {
    var cls = 'logo-t ' + (tam || 'md');
    if (!logoId) return '<span class="' + cls + ' ini" aria-hidden="true">' + iniciales(nombre) + '</span>';
    if (K.logos[logoId]) return '<span class="' + cls + '"><img src="' + K.logos[logoId] + '" alt="Logo de ' + esc(nombre) + '"></span>';
    logosPend[tiendaId] = logoId;
    clearTimeout(logosTimer); logosTimer = setTimeout(cargarLogos, 30);
    return '<span class="' + cls + ' cargando-logo" data-logo-t="' + esc(tiendaId) + '" data-logo-id="' + esc(logoId) + '"><img alt="Logo de ' + esc(nombre) + '"></span>';
  };
  function cargarLogos() {
    var ids = Object.keys(logosPend); if (!ids.length || !S.perfil) return;
    var mapa = logosPend; logosPend = {};
    api.llamar('logos', { ids: ids }).then(function (r) {
      ids.forEach(function (tid) {
        if (!r[tid]) return;
        K.logos[mapa[tid]] = r[tid];
        K.$$('[data-logo-id="' + mapa[tid] + '"]').forEach(function (el) { el.querySelector('img').src = r[tid]; el.classList.remove('cargando-logo'); });
      });
      try { localStorage.setItem('kan_v7_logos', JSON.stringify(K.logos)); } catch (e) { }
    }).catch(function () { });
  }
  K.bannerTienda = function (t, sub, extra) {
    return '<div class="banner-tienda entra">' + K.logoTienda(t.id, t.logo, t.nombre, 'lg') +
      '<div class="bt-texto"><div class="ceja">' + esc(sub || 'Tienda en KAN Distribuidora') + '</div><h2>' + esc(t.nombre) + '</h2></div>' + (extra || '') + '</div>';
  };
  K.avisoDistribuidora = function (tienda) {
    return '<p class="aviso-legal">' + ic('escudo') + '<span><b>KAN Distribuidora</b> es la plataforma que conecta tiendas, vendedores y clientes. ' +
      (tienda ? 'Los equipos pertenecen a <b>' + esc(tienda) + '</b>' : 'Los equipos pertenecen a cada tienda') + '; KAN no es propietaria de las tiendas ni de los equipos.</span></p>';
  };

  /* ---------- Sonidos opcionales (desactivados por defecto) ---------- */
  var sonidoOn = false;
  try { sonidoOn = localStorage.getItem('kan_v7_sonido') === 'on'; } catch (e) { }
  var actx = null;
  K.sonido = function (tipo) {
    if (!sonidoOn) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      actx = actx || new AC(); var t0 = actx.currentTime;
      var notas = { exito: [[659.25, 0, .23], [880, .115, .31]], error: [[392, 0, .17], [293.66, .105, .22]], toque: [[587.33, 0, .065]] }[tipo] || [[587.33, 0, .065]];
      notas.forEach(function (n) {
        var o = actx.createOscillator(), g = actx.createGain(), s = t0 + n[1];
        o.type = 'sine'; o.frequency.setValueAtTime(n[0], s);
        g.gain.setValueAtTime(.0001, s); g.gain.exponentialRampToValueAtTime(.03, s + .012); g.gain.exponentialRampToValueAtTime(.0001, s + n[2]);
        o.connect(g); g.connect(actx.destination); o.start(s); o.stop(s + n[2] + .02);
      });
    } catch (e) { }
  };
  K.sonidoActivo = function () { return sonidoOn; };
  K.alternarSonido = function () { sonidoOn = !sonidoOn; try { localStorage.setItem('kan_v7_sonido', sonidoOn ? 'on' : 'off'); } catch (e) { } if (sonidoOn) K.sonido('exito'); };

  /* ---------- Avisos ---------- */
  K.toast = function (msg, tipo, pose) {
    var caja = document.getElementById('toasts');
    var e = document.createElement('div');
    e.className = 'toast' + (tipo === 'err' ? ' err' : '');
    e.setAttribute('role', tipo === 'err' ? 'alert' : 'status');
    e.innerHTML = '<img src="' + K.pose(pose || (tipo === 'err' ? 'advertencia' : 'exito')) + '" alt=""><span>' + esc(msg) + '</span>';
    caja.appendChild(e);
    K.sonido(tipo === 'err' ? 'error' : 'exito');
    setTimeout(function () { e.remove(); }, tipo === 'err' ? 5200 : 3200);
  };
  K.error = function (e) { K.toast(e && e.message ? e.message : 'Algo salió mal. Intenta de nuevo.', 'err'); };

  K.modal = function (o) {
    return new Promise(function (resolver) {
      var capa = document.createElement('div');
      capa.className = 'capa';
      capa.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="mtit">' + (o.pose ? K.mascota(o.pose, '', '') : '') +
        '<h2 id="mtit">' + esc(o.titulo) + '</h2>' + (o.html || '') +
        '<div class="botones">' + (o.botones || [{ txt: 'Cerrar', valor: null }]).map(function (b, i) {
          return '<button type="button" class="btn ' + (b.clase || '') + '" data-modal="' + i + '">' + esc(b.txt) + '</button>';
        }).join('') + '</div></div>';
      var anterior = document.activeElement;
      function cerrar(v) { capa.remove(); document.removeEventListener('keydown', tecla); if (anterior && anterior.focus) anterior.focus(); resolver(v); }
      function tecla(ev) { if (ev.key === 'Escape') cerrar(null); }
      capa.addEventListener('click', function (ev) {
        var b = ev.target.closest('[data-modal]');
        if (b) { var bt = o.botones[Number(b.dataset.modal)]; if (bt.antes && bt.antes(capa) === false) return; cerrar(typeof bt.valor === 'function' ? bt.valor(capa) : bt.valor); }
        else if (ev.target === capa) cerrar(null);
      });
      document.addEventListener('keydown', tecla);
      document.body.appendChild(capa);
      if (o.alAbrir) o.alAbrir(capa);
      var f = capa.querySelector('input,select,textarea,[data-modal]'); if (f) f.focus();
    });
  };
  K.confirmar = function (titulo, texto, opciones) {
    opciones = opciones || {};
    return K.modal({ titulo: titulo, pose: opciones.pose, html: '<p class="mut" style="margin:6px 0 0">' + texto + '</p>' + (opciones.html || ''),
      botones: [{ txt: 'Cancelar', valor: false }, { txt: opciones.si || 'Confirmar', clase: opciones.peligro ? 'peligro' : 'p', valor: opciones.valor || true, antes: opciones.antes }] });
  };
  K.copiar = function (texto, aviso) {
    var hecho = function () { K.toast(aviso || 'Copiado'); };
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(texto).then(hecho, function () { K.toast('No se pudo copiar automáticamente.', 'err'); });
    var t = document.createElement('textarea'); t.value = texto; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select();
    try { document.execCommand('copy'); hecho(); } catch (e) { K.toast('No se pudo copiar automáticamente.', 'err'); }
    t.remove();
  };
  K.visor = function (srcs, i) {
    var v = document.createElement('div'); v.className = 'visor'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-label', 'Foto ampliada');
    function pintar() { v.innerHTML = '<img src="' + srcs[i] + '" alt="Foto ' + (i + 1) + '"><div class="fila"><button class="btn-icono" data-v="-1" aria-label="Anterior">' + ic('izq') + '</button><span class="mut">' + (i + 1) + ' / ' + srcs.length + '</span><button class="btn-icono" data-v="1" aria-label="Siguiente">' + ic('der') + '</button><button class="btn-icono" data-v="x" aria-label="Cerrar">' + ic('x') + '</button></div>'; }
    function tecla(e) { if (e.key === 'Escape') cerrar(); if (e.key === 'ArrowRight') mover(1); if (e.key === 'ArrowLeft') mover(-1); }
    function mover(d) { i = (i + d + srcs.length) % srcs.length; pintar(); }
    function cerrar() { v.remove(); document.removeEventListener('keydown', tecla); }
    v.addEventListener('click', function (e) { var b = e.target.closest('[data-v]'); if (b) { if (b.dataset.v === 'x') cerrar(); else mover(Number(b.dataset.v)); } else if (e.target === v) cerrar(); });
    document.addEventListener('keydown', tecla);
    pintar(); document.body.appendChild(v);
  };

  /* ---------- Fotos: se piden al servidor solo cuando se van a ver ---------- */
  var pendientes = {};
  K.hidratarFotos = function (raiz) {
    var porTam = { mini: [], full: [] };
    K.$$('img[data-foto]', raiz).forEach(function (img) {
      var id = img.dataset.foto, tam = img.dataset.tam === 'full' ? 'full' : 'mini', k = tam + ':' + id;
      if (K.fotos[k]) { img.src = K.fotos[k]; img.removeAttribute('data-foto'); }
      else if (!pendientes[k]) { pendientes[k] = 1; porTam[tam].push(id); }
    });
    ['mini', 'full'].forEach(function (tam) {
      var ids = porTam[tam];
      for (var i = 0; i < ids.length; i += 20) (function (lote) {
        api.llamar('fotos', { ids: lote, tamano: tam }).then(function (r) {
          lote.forEach(function (id) { delete pendientes[tam + ':' + id]; if (r[id]) K.fotos[tam + ':' + id] = r[id]; });
          K.$$('img[data-foto]').forEach(function (img) { var k = (img.dataset.tam === 'full' ? 'full' : 'mini') + ':' + img.dataset.foto; if (K.fotos[k]) { img.src = K.fotos[k]; img.removeAttribute('data-foto'); } });
        }).catch(function () { lote.forEach(function (id) { delete pendientes[tam + ':' + id]; }); });
      })(ids.slice(i, i + 20));
    });
  };
  K.foto = function (fotoId, categoria, tam, alt) {
    if (!fotoId) return K.arte(categoria);
    var k = (tam || 'mini') + ':' + fotoId;
    return '<img ' + (K.fotos[k] ? 'src="' + K.fotos[k] + '"' : 'data-foto="' + esc(fotoId) + '" data-tam="' + (tam || 'mini') + '" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="') + ' alt="' + esc(alt || 'Foto del equipo') + '" loading="lazy">';
  };

  /* ---------- Navegación ---------- */
  K.ir = function (ruta) { if (location.hash === '#' + ruta) K.mostrar(); else location.hash = ruta; };
  function menu() {
    var r = K.rol(), m = [];
    if (r === 'CLIENTE') return [['tienda', 'catalogo', 'Equipos', 'Vitrina'], ['perfil', 'usuario', 'Mi cuenta', 'Cuenta']];
    if (r === 'ADMIN') m.push(['admin', 'inicio', 'Panel', 'General']);
    if (K.puede('catalogo.ver')) m.push(['catalogo', 'catalogo', 'Catálogo', 'Comercial']);
    if (K.puede('inventario.ver')) m.push(['inventario', 'caja', 'Inventario', r === 'ADMIN' ? null : 'Mi tienda']);
    if (K.puede('inventario.crear')) m.push(['registro', 'mas', 'Registrar', null]);
    if (r === 'PROVEEDOR' || r === 'ADMIN') m.push(['tienda', 'ojo', 'Vitrina', null]);
    if (K.puede('oportunidades')) m.push(['oportunidades', 'calc', 'Oportunidades', null]);
    if (r === 'PROVEEDOR' && (S.perfil.tiendas || []).some(function (t) { return t.gestionaVendedores; })) m.push(['vendedores', 'usuario', 'Vendedores', null]);
    m.push(['notificaciones', 'campana', 'Avisos', 'Cuenta']);
    m.push(['perfil', 'usuario', 'Perfil', null]);
    return m;
  }
  K.inicioRol = function () { var r = K.rol(); return r === 'ADMIN' ? 'admin' : r === 'PROVEEDOR' ? 'inventario' : r === 'CLIENTE' ? 'tienda' : 'catalogo'; };

  function pintarEstructura() {
    var m = menu();
    var movil = m.filter(function (x) { return x[0] !== 'perfil' || K.rol() !== 'ADMIN'; }).slice(0, 5);
    document.getElementById('raiz').innerHTML =
      '<div class="app">' +
      '<header class="barra-sup"><button class="marca" data-act="ir" data-ruta="' + K.inicioRol() + '" aria-label="Inicio de KAN Distribuidora"><img src="img/mark_dark.png" alt=""><span class="marca-txt"><b>KAN</b><small>Distribuidora</small></span></button>' +
      '<form class="buscador-sup" data-form="buscar-sup" role="search"><label class="sr" for="q-sup">Buscar equipos</label><input id="q-sup" type="search" placeholder="' + (K.rol() === 'CLIENTE' ? 'Busca: iPhone 13 128 GB, laptop, AirPods…' : 'Busca: iPhone 13 128 GB batería mayor a 85%') + '" autocomplete="off"></form>' +
      '<div class="acciones"><span class="estado-red solo-escritorio" id="estado-red"><i></i><span>Conectado</span></span>' +
      (K.rol() === 'CLIENTE' ? '' : '<a class="btn-icono" href="#/notificaciones" aria-label="Avisos">' + ic('campana') + '<span class="punto oculto" id="badge-sup"></span></a>') +
      '<a class="btn-icono" href="#/perfil" aria-label="Perfil" title="' + esc(S.perfil.nombre) + '">' + ic('usuario') + '</a></div></header>' +
      (api.modoPrueba ? '<div class="banda-prueba"><b>Modo de prueba.</b> Datos ficticios guardados solo en este navegador. Para usar datos reales, conecta el servidor (ver LEEME).</div>' : '') +
      '<div class="aviso-red oculto" id="aviso-red">Sin conexión. Mostrando la última información recibida; reintentaremos en automático.</div>' +
      '<nav class="lado" aria-label="Menú principal">' + m.map(function (x) {
        return (x[3] ? '<div class="sec">' + esc(x[3]) + '</div>' : '') + '<a href="#/' + x[0] + '" data-nav="' + x[0] + '">' + ic(x[1]) + '<span>' + x[2] + '</span>' + (x[0] === 'notificaciones' ? '<span class="punto oculto" data-badge></span>' : '') + '</a>';
      }).join('') + '<div class="pie-lado mini mut solo-escritorio" id="sync-lado" style="padding:10px 14px"></div></nav>' +
      '<main class="contenido" id="vista" tabindex="-1"></main>' +
      '<nav class="nav-inf" aria-label="Menú">' + movil.map(function (x) {
        return '<a href="#/' + x[0] + '" data-nav="' + x[0] + '">' + ic(x[1]) + '<span>' + x[2] + '</span>' + (x[0] === 'notificaciones' ? '<span class="punto oculto" data-badge></span>' : '') + '</a>';
      }).join('') + '</nav></div>';
    actualizarBadge();
    pintarRed(api.estadoRed());
  }

  function actualizarBadge() {
    K.$$('[data-badge],#badge-sup').forEach(function (b) { b.textContent = S.noLeidas > 9 ? '9+' : S.noLeidas; b.classList.toggle('oculto', !S.noLeidas); });
  }
  K.actualizarBadge = actualizarBadge;
  function pintarRed(e) {
    var r = document.getElementById('estado-red'), a = document.getElementById('aviso-red'), l = document.getElementById('sync-lado');
    if (r) { r.classList.toggle('fuera', !e.enLinea); r.lastChild.textContent = e.enLinea ? 'Sincronizado' : 'Sin conexión'; }
    if (a) a.classList.toggle('oculto', e.enLinea);
    if (l) l.textContent = e.ultimaSync ? 'Última sincronización: ' + K.hace(e.ultimaSync) : '';
  }
  api.alCambiar(pintarRed);

  var vistaActual = null;
  K.mostrar = function () {
    var h = (location.hash || '').replace(/^#\/?/, '');
    var partes = h.split('?')[0].split('/').filter(Boolean);
    var params = {}; (h.split('?')[1] || '').split('&').forEach(function (kv) { if (kv) { var p = kv.split('='); params[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); } });
    if (!S.perfil) { K.vistas.acceso(); return; }
    var nombre = partes[0] || K.inicioRol();
    if (!K.vistas[nombre] || nombre === 'acceso') nombre = K.inicioRol();
    if (K.rol() === 'CLIENTE' && ['tienda', 'equipo', 'perfil'].indexOf(nombre) < 0) nombre = 'tienda';
    if (!document.getElementById('vista')) pintarEstructura();
    K.$$('[data-nav]').forEach(function (a) { a.classList.toggle('on', a.dataset.nav === nombre || (nombre === 'grupo' || nombre === 'unidad') && a.dataset.nav === (K.rol() === 'PROVEEDOR' ? 'inventario' : 'catalogo') || nombre === 'equipo' && a.dataset.nav === 'tienda'); });
    var v = document.getElementById('vista');
    if (vistaActual !== h) window.scrollTo(0, 0);
    vistaActual = h;
    K.ruta = { nombre: nombre, id: partes[1], params: params };
    K.sucio = false; K.accionesVista = {}; K.refrescar = null;
    v.innerHTML = K.cargando();
    Promise.resolve(K.vistas[nombre](K.ruta, v)).catch(function (e) {
      v.innerHTML = K.vacio('advertencia', 'No pudimos abrir esta sección', esc(e.message || ''), '<button class="btn p" data-act="recargar">Reintentar</button>');
    });
  };
  K.repintar = function () { if (S.perfil) K.mostrar(); };
  window.addEventListener('hashchange', function () {
    if (K.sucio && !confirm('Tienes cambios sin guardar. ¿Salir de todas formas?')) { K.sucio = false; history.back(); return; }
    K.mostrar();
  });

  /* ---------- Delegación de eventos ---------- */
  K.acciones.ir = function (el) { K.ir(el.dataset.ruta); };
  K.acciones.recargar = function () { K.mostrar(); };
  K.acciones.copiarId = function (el) { K.copiar(el.dataset.id, 'Identificador ' + el.dataset.id + ' copiado'); };
  K.acciones.salir = function () {
    K.confirmar('¿Cerrar sesión?', 'Tendrás que volver a entrar con tu cuenta de Google.', { si: 'Cerrar sesión' }).then(function (si) {
      if (!si) return;
      api.cerrarSesion().then(function () { S.perfil = null; location.hash = ''; K.mostrar(); });
    });
  };
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    var f = (K.accionesVista && K.accionesVista[el.dataset.act]) || K.acciones[el.dataset.act];
    if (f) { e.preventDefault(); K.sonido('toque'); f(el, e); }
  });
  document.addEventListener('submit', function (e) {
    var f = e.target.closest('form[data-form]');
    if (!f) return;
    e.preventDefault();
    if (f.dataset.form === 'buscar-sup') {
      var q = f.querySelector('input').value.trim();
      K.ir((K.rol() === 'CLIENTE' ? '/tienda' : K.puede('catalogo.ver') ? '/catalogo' : '/inventario') + '?q=' + encodeURIComponent(q));
      return;
    }
    var h = (K.accionesVista && K.accionesVista['form:' + f.dataset.form]) || K.acciones['form:' + f.dataset.form];
    if (h) h(f, e);
  });
  ['input', 'change'].forEach(function (tipo) {
    document.addEventListener(tipo, function (e) {
      var el = e.target.closest('[data-' + tipo + ']');
      if (!el) return;
      var h = K.accionesVista && K.accionesVista[tipo + ':' + el.getAttribute('data-' + tipo)];
      if (h) h(el, e);
    });
  });

  /* Brillo por proximidad del cursor (identidad de KAN Lite) */
  (function () {
    var raf = 0, ev = null;
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return; ev = e; if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        K.$$('.btn.p,.btn.neon').forEach(function (b) {
          var r = b.getBoundingClientRect();
          b.style.setProperty('--mx', (ev.clientX - r.left) + 'px'); b.style.setProperty('--my', (ev.clientY - r.top) + 'px');
          var dx = Math.max(r.left - ev.clientX, 0, ev.clientX - r.right), dy = Math.max(r.top - ev.clientY, 0, ev.clientY - r.bottom), d = Math.hypot(dx, dy);
          b.style.setProperty('--prox', d < 90 ? (1 - d / 90).toFixed(2) : 0);
        });
      });
    }, { passive: true });
  })();

  /* ---------- Sincronización entre dispositivos ---------- */
  function sondear() {
    if (!S.perfil || document.hidden) return;
    api.llamar('estado').then(function (r) {
      var cambio = S.rev && r.rev !== S.rev;
      S.rev = r.rev;
      if (r.noLeidas !== S.noLeidas) { S.noLeidas = r.noLeidas; actualizarBadge(); }
      if (cambio && !K.sucio && !document.querySelector('.capa') && K.ruta && ['catalogo', 'inventario', 'grupo', 'unidad', 'admin', 'oportunidades', 'vendedores', 'tienda'].indexOf(K.ruta.nombre) >= 0) {
        K.refrescar ? K.refrescar() : K.mostrar();
      }
      /* Si el admin cambió tus tiendas o tu delegación, el menú se actualiza sin cerrar sesión. */
      if (cambio && S.perfil.rol !== 'ADMIN') api.llamar('perfil').then(function (p) {
        if (JSON.stringify(p.tiendas) !== JSON.stringify(S.perfil.tiendas)) { S.perfil = p; if (!K.sucio && !document.querySelector('.capa')) { pintarEstructura(); K.mostrar(); } }
      }).catch(function () { });
    }).catch(function () { });
  }
  setInterval(sondear, 30000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) sondear(); });
  window.addEventListener('kan:sesion-terminada', function () { S.perfil = null; K.toast('Tu sesión terminó. Vuelve a iniciar sesión.', 'err'); K.mostrar(); });

  /* ---------- Arranque ---------- */
  K.entrar = function (perfil) {
    S.perfil = perfil;
    return api.llamar('categorias').then(function (m) {
      S.meta = m;
      document.getElementById('raiz').innerHTML = '';
      pintarEstructura();
      sondear();
      var h = (location.hash || '').replace(/^#\/?/, '');
      if (!h || h.indexOf('acceso') === 0) location.hash = '/' + K.inicioRol(); else K.mostrar();
    });
  };
  K.arrancar = function () {
    if (!api.tieneSesion()) { K.vistas.acceso(); return; }
    api.llamar('perfil').then(K.entrar).catch(function () { K.vistas.acceso(); });
  };
  document.addEventListener('DOMContentLoaded', function () { setTimeout(K.arrancar, 0); });
})();
