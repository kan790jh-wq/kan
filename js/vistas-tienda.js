/* KAN Distribuidora V7.2 · Vitrina de clientes por tienda, logos y ajustes de tienda, celebraciones.
   Todo lo que ve un cliente lo decide el servidor (09_Clientes.gs): aquí solo se pinta. */
(function () {
  var K = window.KAN, api = K.api, S = K.S, esc = K.esc, ic = K.ic, $ = K.$, $$ = K.$$;
  var V = K.vistas;

  /* ---------- Celebración (confeti con los colores de KAN) ---------- */
  K.celebrar = function () {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var c = document.createElement('div'); c.className = 'confeti'; c.setAttribute('aria-hidden', 'true');
    var col = ['#24c8ff', '#087bff', '#5edaff', '#ffd27b', '#ffffff', '#35d69a'];
    for (var i = 0; i < 34; i++) {
      var p = document.createElement('i');
      p.style.left = (Math.random() * 100) + '%'; p.style.background = col[i % col.length];
      p.style.animationDelay = (Math.random() * .35) + 's'; p.style.animationDuration = (1.1 + Math.random() * .9) + 's';
      p.style.setProperty('--giro', (Math.random() * 720 - 360) + 'deg'); p.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px');
      c.appendChild(p);
    }
    document.body.appendChild(c); setTimeout(function () { c.remove(); }, 2400);
  };

  function ini(n) { return esc(String(n || '?').split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase()); }
  function iniciarGoogle(cb, id) {
    (function esperar(n) {
      if (window.google && google.accounts && google.accounts.id) {
        google.accounts.id.initialize({ client_id: window.KAN_CONFIG.GOOGLE_CLIENT_ID, callback: function (r) { cb(r.credential); }, ux_mode: 'popup' });
        var el = document.getElementById(id); if (el) google.accounts.id.renderButton(el, { theme: 'filled_blue', size: 'large', shape: 'pill', text: 'continue_with', locale: 'es', width: 300 });
      } else if (n < 60) setTimeout(function () { esperar(n + 1); }, 200);
    })(0);
  }

  /* ---------- Portada pública de la vitrina (antes de iniciar sesión) ---------- */
  var accesoBase = V.acceso;
  V.acceso = function (modo) {
    var m = /^#\/tienda\/([^/?#]+)/.exec(location.hash || '');
    if (m && !(modo && modo.html)) return vitrinaAcceso(decodeURIComponent(m[1]));
    var r = accesoBase(modo);
    var p = document.getElementById('panel-acceso');
    if (p && api.modoPrueba && !(modo && modo.html)) p.insertAdjacentHTML('beforeend', '<a class="btn fant chico" style="margin-top:8px" href="#/tienda/compushop">' + ic('ojo') + 'Ver la vitrina de clientes de CompuShop</a>');
    return r;
  };

  function vitrinaAcceso(slug) {
    var raiz = document.getElementById('raiz');
    K.accionesVista = {
      clientePrueba: function () { entrarCliente(api.tokenPrueba('cliente@prueba.kan', 'Cliente de prueba'), slug); },
      irKan: function () { location.hash = ''; V.acceso(); }
    };
    raiz.innerHTML = '<section class="vitrina-acceso">' + K.cargando('Abriendo la vitrina…') + '</section>';
    api.llamar('tiendaPublica', { slug: slug }).then(function (t) {
      if (t.estado === 'NO_EXISTE') {
        raiz.innerHTML = '<section class="vitrina-acceso"><div class="va-tarjeta entra">' + K.mascota('confuso', 'No encontramos esta vitrina. Revisa el enlace que te compartieron.', 'vertical') +
          '<button class="btn" data-act="irKan">Ir a KAN Distribuidora</button></div></section>';
        return;
      }
      var logo = t.logo ? '<img src="' + t.logo + '" alt="Logo de ' + esc(t.nombre) + '">' : '<span class="ini">' + ini(t.nombre) + '</span>';
      raiz.innerHTML = '<section class="vitrina-acceso"><div class="va-fondo" aria-hidden="true"><i></i><i></i><i></i></div>' +
        '<div class="va-tarjeta entra"><div class="va-logo">' + logo + '<span class="anillo"></span><span class="anillo b"></span></div>' +
        '<div class="ceja">Vitrina oficial</div><h1>' + esc(t.nombre) + '</h1>' +
        (t.estado === 'CERRADA' ? K.mascota('dormido', 'Esta vitrina está cerrada por ahora. ¡Vuelve pronto!', 'vertical') :
          '<p class="va-sub">' + (t.disponibles ? '<b class="cuenta" data-contar="' + t.disponibles + '">' + t.disponibles + '</b> equipo' + (t.disponibles === 1 ? '' : 's') + ' disponible' + (t.disponibles === 1 ? '' : 's') + ' te esperan.' : 'Muy pronto verás aquí sus equipos.') +
          ' Entra con tu cuenta de Google para verlos con sus precios.</p>' +
          '<div id="g-boton" class="va-google"></div>' + (api.modoPrueba ? '<button class="btn p" data-act="clientePrueba">' + ic('usuario') + 'Entrar como cliente de prueba</button>' : '') +
          '<p class="mini mut" style="margin:4px 0 0">No necesitas registrarte ni esperar aprobación. Solo usamos tu nombre y correo.</p>') +
        '</div><img class="va-mascota m-saluda" src="' + K.pose('saludo') + '" alt="">' +
        '<div class="va-pie"><img src="img/logo_dark.png" alt="KAN Distribuidora"><span>Vitrina distribuida por <b>KAN Distribuidora</b></span></div>' +
        K.avisoDistribuidora(t.nombre) + '</section>';
      if (t.estado === 'OK' && !api.modoPrueba) iniciarGoogle(function (cred) { entrarCliente(cred, slug); }, 'g-boton');
    }).catch(function (e) { K.error(e); raiz.innerHTML = '<section class="vitrina-acceso"><div class="va-tarjeta">' + K.mascota('confuso', 'No pudimos abrir la vitrina. Revisa tu conexión y recarga.', 'vertical') + '</div></section>'; });
  }

  function entrarCliente(idToken, slug) {
    var caja = $('.va-tarjeta'); if (caja) caja.insertAdjacentHTML('beforeend', '<div class="va-cargando">' + K.cargando('Preparando tu vitrina…') + '</div>');
    api.llamar('entrarCliente', { idToken: idToken, slug: slug }).then(function (r) {
      if (r.estado === 'SUSPENDIDA') { K.toast('Tu cuenta está suspendida. Contacta a la tienda.', 'err'); vitrinaAcceso(slug); return; }
      api.guardarSesion(r.token);
      K.toast('¡Bienvenido, ' + r.perfil.nombre.split(' ')[0] + '!', 'ok', 'saludo');
      if (r.nuevo) setTimeout(K.celebrar, 500);
      location.hash = '#/tienda/' + slug;
      return K.entrar(r.perfil);
    }).catch(function (e) { K.error(e); vitrinaAcceso(slug); });
  }

  /* ---------- Vitrina (cliente, o vista previa del proveedor/admin) ---------- */
  var CATS = { Celulares: 'Celulares', Computadoras: 'Laptops', Tablets: 'Tablets', Accesorios: 'Accesorios' };
  V.tienda = function (ruta, v) {
    var p = S.perfil, F = { texto: ruta.params.q || '', categoria: '', orden: '' };
    var tiendaId = ruta.params.t || '';
    if (ruta.id) { var s = (p.tiendas || []).filter(function (t) { return t.slug === ruta.id; })[0]; if (s) tiendaId = s.id; }
    var d = null;
    function cargar() { return api.llamar('clienteCatalogo', { tiendaId: tiendaId || undefined, texto: F.texto, categoria: F.categoria, orden: F.orden }).then(function (r) { d = r; tiendaId = r.tienda.id; pintar(); }); }
    K.refrescar = function () { if (!$('.capa') && document.activeElement !== $('#v-q')) cargar().catch(function () { }); };
    K.accionesVista = {
      cat: function (el) { F.categoria = el.dataset.c; cargar().catch(K.error); },
      'change:ordenV': function (el) { F.orden = el.value; cargar().catch(K.error); },
      'form:vbuscar': function () { F.texto = $('#v-q').value.trim(); cargar().catch(K.error); },
      limpiarV: function () { F.texto = ''; F.categoria = ''; cargar().catch(K.error); },
      tiendaC: function (el) { K.ir('/tienda?t=' + el.dataset.t); },
      copiarEnlaceV: function (el) { K.copiar(el.dataset.url, 'Enlace de la vitrina copiado. Compártelo con tus clientes.'); },
      ajustesV: function () { K.ajustesTienda(tiendaId, function () { cargar().catch(K.error); }); },
      escribirV: function () { window.open('https://wa.me/' + d.tienda.whatsapp + '?text=' + encodeURIComponent('Hola ' + d.tienda.nombre + ', vi su vitrina en KAN Distribuidora y quiero información.'), '_blank', 'noopener'); }
    };
    function pintar() {
      var t = d.tienda, us = d.unidades, propia = (p.tiendas || []).filter(function (x) { return x.id === t.id; })[0] || {};
      var hola = p.rol === 'CLIENTE' ? '¡Hola, ' + esc(p.nombre.split(' ')[0]) + '! Estos son los equipos disponibles hoy.' : 'Así ven tu vitrina los clientes.';
      var cats = Object.keys(d.categorias);
      var html = (d.vistaPrevia ? '<div class="aviso info peq entra aviso-previa" style="margin-bottom:14px">' + ic('ojo') + '<span><b>Vista previa.</b> Así ven los clientes la vitrina de ' + esc(t.nombre) + '. Ellos ven el <b>precio para clientes</b>, nunca tu precio de proveedor.</span>' +
          (propia.enlaceClientes ? '<button class="btn chico" data-act="copiarEnlaceV" data-url="' + esc(propia.enlaceClientes) + '">' + ic('enlace') + 'Copiar enlace</button>' : '') +
          '<button class="btn chico" data-act="ajustesV">' + ic('editar') + 'Logo y vitrina</button></div>' : '') +
        '<section class="vitrina-hero entra">' + K.logoTienda(t.id, t.logo, t.nombre, 'xl') +
        '<div class="vh-texto"><div class="ceja">Vitrina oficial · KAN Distribuidora</div><h1>' + esc(t.nombre) + '</h1><p>' + hola + '</p>' +
        '<div class="vh-datos"><span><b data-contar="' + us.length + '">' + us.length + '</b> disponibles' + (F.texto || F.categoria ? ' en tu búsqueda' : '') + '</span>' +
        (t.whatsapp ? '<button class="btn wa chico" data-act="escribirV">' + ic('enviar') + 'Escríbele a la tienda</button>' : '') + '</div></div>' +
        '<img class="vh-mascota m-flota" src="' + K.pose(us.length ? 'selfie' : 'dormido') + '" alt=""></section>' +
        (d.tiendas.length > 1 ? '<div class="chips" style="margin:4px 0 14px">' + d.tiendas.map(function (x) { return '<button class="chip-f con-logo' + (x.id === t.id ? ' on' : '') + '" data-act="tiendaC" data-t="' + esc(x.id) + '">' + K.logoTienda(x.id, x.logo, x.nombre, 'xs') + esc(x.nombre) + '</button>'; }).join('') + '</div>' : '') +
        '<form class="vitrina-busca entra" data-form="vbuscar" role="search"><span class="lupa">' + ic('buscar') + '</span><input id="v-q" type="search" placeholder="¿Qué buscas? Ej. iPhone 13 128 GB" value="' + esc(F.texto) + '" autocomplete="off">' +
        '<select data-change="ordenV" aria-label="Ordenar"><option value="">Más recientes</option><option value="precioAsc"' + (F.orden === 'precioAsc' ? ' selected' : '') + '>Menor precio</option><option value="precioDesc"' + (F.orden === 'precioDesc' ? ' selected' : '') + '>Mayor precio</option></select></form>' +
        (cats.length > 1 ? '<div class="chips entra" style="margin:12px 0 4px"><button class="chip-f' + (!F.categoria ? ' on' : '') + '" data-act="cat" data-c="">Todo</button>' + cats.map(function (c) {
          return '<button class="chip-f' + (F.categoria === c ? ' on' : '') + '" data-act="cat" data-c="' + esc(c) + '">' + ic(K.icCategoria(c)) + esc(CATS[c] || c) + ' <span class="mut">' + d.categorias[c] + '</span></button>'; }).join('') + '</div>' : '') +
        (d.interpretacion.length ? '<div class="chips" style="margin-top:8px">' + d.interpretacion.map(function (x) { return '<span class="etiqueta cian">' + esc(x) + '</span>'; }).join('') + '</div>' : '');
      if (!us.length) {
        html += F.texto || F.categoria
          ? K.vacio('lupa', 'No encontramos ese equipo', 'Prueba con otra búsqueda o mira todo el catálogo.', '<button class="btn" data-act="limpiarV">Ver todos los equipos</button>')
          : K.vacio('dormido', 'Por ahora no hay equipos disponibles', 'La tienda está preparando nuevos equipos. ¡Vuelve pronto!');
      } else {
        html += '<div class="rejilla-prod">' + us.map(function (u, i) {
          var tags = [u.color, u.bateria !== null ? 'Batería ' + u.bateria + '%' : '', u.condicion].filter(Boolean).map(esc).join(' · ');
          return '<a class="prod entra" style="animation-delay:' + Math.min(i * .045, .6).toFixed(2) + 's" href="#/equipo/' + esc(u.id) + '"><div class="foto">' + K.foto(u.fotos[0], u.categoria, 'mini', u.nombre) +
            '<span class="chip-cat">' + ic(K.icCategoria(u.categoria)) + esc(CATS[u.categoria] || u.categoria) + '</span></div>' +
            '<div class="cuerpo"><div class="t">' + esc(u.nombre) + '</div><div class="mini mut">' + esc(u.detalle) + '</div>' + (tags ? '<div class="tags">' + tags + '</div>' : '') +
            '<div class="precio-fila"><b class="precio">' + K.dinero(u.precio) + '</b><span class="ver">Ver ' + ic('der') + '</span></div></div></a>';
        }).join('') + '</div>';
      }
      html += K.avisoDistribuidora(t.nombre);
      v.innerHTML = html;
      K.hidratarFotos(v);
    }
    v.innerHTML = K.cargando('Cargando la vitrina…');
    return cargar();
  };

  /* ---------- Ficha del equipo para el cliente ---------- */
  V.equipo = function (ruta, v) {
    var u = null, foto = 0;
    K.accionesVista = {
      fotoE: function (el) { foto = Number(el.dataset.i); pintar(); },
      ampliarE: function () {
        var faltan = u.fotos.filter(function (f) { return !K.fotos['full:' + f]; });
        (faltan.length ? api.llamar('fotos', { ids: faltan, tamano: 'full' }).then(function (r) { Object.keys(r).forEach(function (k) { if (r[k]) K.fotos['full:' + k] = r[k]; }); }) : Promise.resolve())
          .then(function () { K.visor(u.fotos.map(function (f) { return K.fotos['full:' + f]; }).filter(Boolean), foto); });
      },
      interesa: function () {
        var msg = 'Hola ' + u.tienda.nombre + ', me interesa este equipo que vi en su vitrina de KAN Distribuidora:\n\n' + u.nombre + (u.detalle ? ' · ' + u.detalle : '') +
          '\nReferencia: ' + u.id + '\nPrecio: ' + K.dinero(u.precio) + ' MXN\n\n¿Sigue disponible?';
        window.open('https://wa.me/' + u.tienda.whatsapp + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
      },
      copiarRef: function () { K.copiar(u.id, 'Referencia copiada'); }
    };
    function pintar() {
      v.innerHTML = '<div class="entre" style="margin-bottom:12px"><a href="#/tienda?t=' + esc(u.tienda.id) + '" class="btn fant chico">' + ic('izq') + 'Volver a la vitrina</a>' +
        '<span class="etiqueta con-logo">' + K.logoTienda(u.tienda.id, u.tienda.logo, u.tienda.nombre, 'xs') + esc(u.tienda.nombre) + '</span></div>' +
        '<div class="ficha"><section class="galeria entra" aria-label="Fotografías"><div class="foto principal" ' + (u.fotos.length ? 'data-act="ampliarE" role="button" tabindex="0" aria-label="Ampliar foto"' : '') + '>' + K.foto(u.fotos[foto], u.categoria, 'full', u.nombre) +
        '<div class="sobre"><span class="estado e-DISPONIBLE">Disponible</span></div>' + (u.fotos.length > 1 ? '<span class="sobre-der">Foto ' + (foto + 1) + ' de ' + u.fotos.length + '</span>' : '') + '</div>' +
        (u.fotos.length > 1 ? '<div class="miniaturas">' + u.fotos.map(function (f, i) { return '<button class="' + (i === foto ? 'on' : '') + '" data-act="fotoE" data-i="' + i + '" aria-label="Foto ' + (i + 1) + '">' + K.foto(f, u.categoria, 'mini') + '</button>'; }).join('') + '</div>' : '') +
        (!u.fotos.length ? '<p class="mini mut" style="margin:8px 2px">Pide fotos de este equipo a la tienda por WhatsApp.</p>' : '') + '</section>' +
        '<section class="pila entra" style="animation-delay:.08s"><div><div class="ceja">' + esc(CATS[u.categoria] || u.categoria) + ' · ' + esc(u.marca) + '</div><h1 style="margin-top:6px">' + esc(u.nombre) + '</h1><div class="mut">' + esc(u.detalle) + '</div></div>' +
        '<div class="precio-cliente"><span>Precio</span><b>' + K.dinero(u.precio) + '</b><small>MXN</small></div>' +
        (u.tienda.whatsapp ? '<button class="btn wa grande" data-act="interesa">' + ic('enviar') + 'Me interesa · Escribir por WhatsApp</button>'
          : '<div class="aviso peq">' + ic('telefono') + 'La tienda aún no agrega su WhatsApp. Usa la referencia <b>' + esc(u.id) + '</b> para preguntar por este equipo.</div>') +
        '<div class="specs">' + u.campos.map(function (c) { return '<div class="spec"><span>' + esc(c.l) + '</span><b>' + esc(c.v) + '</b></div>'; }).join('') + '</div>' +
        (u.detalles ? '<div class="spec"><span>Detalles</span>' + esc(u.detalles) + '</div>' : '') +
        '<div class="fila mini mut" style="gap:8px">Referencia <button class="id-copia" data-act="copiarRef">' + esc(u.id) + ic('copiar') + '</button> · Actualizado ' + K.hace(u.actualizado) + '</div>' +
        K.mascota('escudo', 'Confirma la disponibilidad con la tienda antes de pagar. KAN Distribuidora nunca te pedirá pagos por esta página.') +
        K.avisoDistribuidora(u.tienda.nombre) + '</section></div>';
      K.hidratarFotos(v);
    }
    v.innerHTML = K.cargando('Abriendo el equipo…');
    return api.llamar('clienteUnidad', { id: ruta.id }).then(function (r) { u = r; pintar(); });
  };

  /* ---------- Ajustes de tienda: logo, WhatsApp y vitrina (admin o proveedor dueño) ---------- */
  function comprimirLogo(archivo) {
    return new Promise(function (ok, mal) {
      var lector = new FileReader();
      lector.onload = function () {
        var im = new Image();
        im.onload = function () {
          function hacer(max, q) {
            var k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas');
            c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
            c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
            var u = c.toDataURL('image/webp', q); if (u.indexOf('data:image/webp') !== 0) u = c.toDataURL('image/png');
            return u;
          }
          var u = hacer(512, .9); if (u.length > 380000) u = hacer(384, .82); if (u.length > 380000) u = hacer(256, .75);
          ok(u);
        };
        im.onerror = function () { mal(new Error('No se pudo leer la imagen.')); };
        im.src = lector.result;
      };
      lector.readAsDataURL(archivo);
    });
  }
  K.ajustesTienda = function (tiendaId, despues) {
    var fuente = K.rol() === 'ADMIN' ? api.llamar('resumenAdmin').then(function (r) { return r.tiendas.filter(function (t) { return t.id === tiendaId; })[0]; })
      : Promise.resolve((S.perfil.tiendas || []).filter(function (t) { return t.id === tiendaId; })[0]);
    fuente.then(function (t) {
      if (!t) throw new Error('No encontramos la tienda.');
      var nuevoLogo = null, quitar = false;
      return K.modal({ titulo: 'Tienda · ' + t.nombre, html:
        '<div class="form"><div class="logo-editor">' + K.logoTienda(t.id, t.logo, t.nombre, 'xl') +
        '<div class="pila" style="gap:8px"><b>Logo de la tienda</b><span class="mini mut">PNG, JPG o WEBP. Se ve en el inventario, el catálogo y la vitrina de clientes.</span>' +
        '<div class="fila"><label class="btn chico">' + ic('camara') + 'Elegir imagen<input type="file" accept="image/png,image/jpeg,image/webp" id="at-logo" hidden></label>' +
        (t.logo ? '<button type="button" class="btn fant chico" id="at-quitar">Quitar logo</button>' : '') + '</div></div></div>' +
        '<label class="campo">WhatsApp de la tienda (con lada)<input id="at-tel" inputmode="tel" value="' + esc(t.telefono || t.telefonoTienda || '') + '" placeholder="5215512345678"><small class="mini mut">Los clientes de la vitrina te escriben a este número. Si lo dejas vacío, se usa el del proveedor.</small></label>' +
        '<label class="check"><input type="checkbox" id="at-vit"' + (t.clientesActivo ? ' checked' : '') + '>Vitrina de clientes abierta</label>' +
        (t.enlaceClientes ? '<div class="campo">Enlace para tus clientes<div class="fila" style="flex-wrap:nowrap"><input readonly value="' + esc(t.enlaceClientes) + '" style="flex:1;min-width:0"><button type="button" class="btn chico" id="at-copiar">' + ic('copiar') + 'Copiar</button></div>' +
          '<small class="mini mut">Quien abra este enlace entra con Google y ve tus equipos disponibles con el precio para clientes. No necesita aprobación.</small></div>' : '') + '</div>',
        alAbrir: function (c) {
          $('#at-logo', c).addEventListener('change', function (e) {
            var f = e.target.files[0]; if (!f) return;
            comprimirLogo(f).then(function (u) { nuevoLogo = u; quitar = false; $('.logo-editor .logo-t', c).outerHTML = '<span class="logo-t xl"><img src="' + u + '" alt=""></span>'; }).catch(K.error);
          });
          var q = $('#at-quitar', c); if (q) q.addEventListener('click', function () { quitar = true; nuevoLogo = null; $('.logo-editor .logo-t', c).outerHTML = '<span class="logo-t xl ini">' + ini(t.nombre) + '</span>'; });
          var cp = $('#at-copiar', c); if (cp) cp.addEventListener('click', function () { K.copiar(t.enlaceClientes, 'Enlace de la vitrina copiado'); });
        },
        botones: [{ txt: 'Cancelar', valor: null }, { txt: 'Guardar', clase: 'p', valor: function (c) { return { telefono: $('#at-tel', c).value, clientesActivo: $('#at-vit', c).checked }; } }] })
        .then(function (d) {
          if (!d) return;
          var datos = { tiendaId: t.id, telefono: d.telefono, clientesActivo: d.clientesActivo };
          if (nuevoLogo) datos.logo = nuevoLogo; if (quitar) datos.quitarLogo = true;
          return api.llamar('tiendaAjustes', datos).then(function (r) {
            if (nuevoLogo && r.logo) K.logos[r.logo] = nuevoLogo;
            K.toast(nuevoLogo ? '¡Logo actualizado!' : 'Tienda actualizada', 'ok', nuevoLogo ? 'fiesta' : 'exito');
            if (nuevoLogo) K.celebrar();
            return api.llamar('perfil').then(function (p) { S.perfil = p; }).then(function () { if (despues) despues(); });
          });
        });
    }).catch(K.error);
  };
})();
