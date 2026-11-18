/* KAN V7.0 · Vistas: acceso, panel, inventario, catálogo, grupo y unidades, registro, ficha comercial,
   oportunidades, avisos y perfil. Todas consultan al servidor; nada de inventario se guarda en el navegador. */
(function () {
  var K = window.KAN, api = K.api, S = K.S, esc = K.esc, ic = K.ic, $ = K.$, $$ = K.$$;
  var V = K.vistas;

  function preferencia(clave, valor) {
    try {
      if (valor === undefined) return JSON.parse(localStorage.getItem('kan_v7_' + clave) || 'null');
      localStorage.setItem('kan_v7_' + clave, JSON.stringify(valor));
    } catch (e) { return null; }
  }
  function contar(raiz) {
    $$('[data-contar]', raiz).forEach(function (el) {
      var fin = Number(el.dataset.contar) || 0, t0 = performance.now();
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = fin; return; }
      (function paso(t) { var p = Math.min(1, (t - t0) / 900); el.textContent = Math.round(fin * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(paso); })(t0);
    });
  }
  function delay(i) { return ' style="animation-delay:' + Math.min(i * 0.05, 0.6).toFixed(2) + 's"'; }
  function campoDef(cat, k) {
    var d = S.meta.categorias[cat]; if (!d) return null;
    return d.grupo.concat(d.unidad).filter(function (c) { return c.k === k; })[0] || null;
  }
  function specsLegibles(cat, grupo, specs, sinDetalles) {
    var d = S.meta.categorias[cat], out = [];
    if (!d) return out;
    d.grupo.forEach(function (c) { if (grupo && grupo[c.k]) out.push({ l: c.l, v: grupo[c.k] }); });
    d.unidad.forEach(function (c) {
      var v = specs ? specs[c.k] : undefined;
      if (v === undefined || v === '' || (sinDetalles && c.k === 'detalles')) return;
      out.push({ l: c.l.replace(' (%)', ''), v: c.k === 'bateria' ? v + '%' : v });
    });
    return out;
  }
  function resumenUnidad(u) {
    var s = u.specs || {};
    return [s.color, s.bateria !== undefined && s.bateria !== '' ? 'Batería ' + s.bateria + '%' : (s.ciclos !== undefined ? s.ciclos + ' ciclos' : ''), s.condicion].filter(Boolean).map(esc).join(' · ');
  }
  function idCopia(id) { return '<button type="button" class="id-copia" data-act="copiarId" data-id="' + esc(id) + '" title="Copiar identificador">' + esc(id) + ic('copiar') + '</button>'; }

  /* =============================== 01 · ACCESO =============================== */
  var idTokenPendiente = null;
  V.acceso = function (modo) {
    var raiz = document.getElementById('raiz');
    K.accionesVista = {
      cuentaPrueba: function (el) { entrarCon(api.tokenPrueba(el.dataset.email, el.dataset.nombre)); },
      reiniciarPrueba: function () {
        K.confirmar('¿Reiniciar los datos de prueba?', 'Se borran los cambios hechos en este navegador y se vuelven a crear los datos ficticios.', { si: 'Reiniciar', peligro: true })
          .then(function (si) { if (si) { api.reiniciarPrueba(); K.toast('Datos de prueba reiniciados'); V.acceso(); } });
      },
      'form:solicitud': function (f) {
        var d = Object.fromEntries(new FormData(f).entries());
        var b = f.querySelector('button[type=submit]'); b.disabled = true;
        api.llamar('solicitarAcceso', Object.assign(d, { idToken: idTokenPendiente })).then(function () {
          pintarPanel('<div class="pila">' + K.mascota('confianza', '<b>¡Solicitud enviada!</b><br>El administrador de KAN la revisará. Cuando la apruebe, entra con esta misma cuenta de Google.') + '<button class="btn" data-act="otraCuenta">Volver al inicio</button></div>');
        }).catch(function (e) { b.disabled = false; K.error(e); });
      },
      'form:codigo': function (f) {
        var d = Object.fromEntries(new FormData(f).entries());
        var b = f.querySelector('button[type=submit]'); b.disabled = true;
        api.llamar('unirseConCodigo', Object.assign(d, { idToken: idTokenPendiente })).then(function (r) {
          api.guardarSesion(r.token);
          K.toast('¡Listo! Ya tienes acceso a ' + r.tienda, 'ok', 'exito');
          return K.entrar(r.perfil);
        }).catch(function (e) { b.disabled = false; K.error(e); });
      },
      otraCuenta: function () { idTokenPendiente = null; V.acceso(); }
    };
    raiz.innerHTML = '<section class="acceso"><img class="marca-agua" src="img/mark_dark.png" alt="">' +
      '<div class="hero entra"><div class="ceja">KAN · Compra · Vende · Actualiza</div><h1>Tu inventario,<br><span>listo para vender.</span></h1>' +
      '<p class="mut" style="max-width:520px;margin:0">Proveedores, vendedores y administración en una sola plataforma. Cada quien ve solo lo que le corresponde.</p>' +
      '<div class="orbita-caja"><div class="orbita" style="width:270px;height:270px"><i></i></div><div class="orbita b" style="width:205px;height:205px"><i></i></div><img src="img/m_pulgar.webp" alt="Mascota de KAN"></div></div>' +
      '<div class="panel-acceso entra" style="animation-delay:.15s"><div class="entre" style="margin-bottom:14px"><img src="img/logo_dark.png" alt="KAN" style="height:54px;width:auto"><span class="etiqueta cian">V7.1</span></div><div id="panel-acceso"></div></div></section>';
    if (modo && modo.html) { pintarPanel(modo.html); return; }
    if (api.modoPrueba) {
      var cuentas = [['admin@prueba.kan', 'Angel (admin)', 'Administrador general', 'AG'], ['compushop@prueba.kan', 'CompuShop (prueba)', 'Proveedor · CompuShop', 'CS'],
        ['celutec@prueba.kan', 'CeluTec (prueba)', 'Proveedor · CeluTec', 'CT'], ['vendedor@prueba.kan', 'Vendedor de prueba', 'Vendedor · 2 tiendas', 'VE'],
        ['cuenta.nueva@prueba.kan', 'Cuenta nueva', 'Correo sin cuenta (probar solicitud)', '+']];
      pintarPanel('<h2>Entrar en modo de prueba</h2><p class="mut peq" style="margin:6px 0 14px">Elige una cuenta ficticia. En la versión conectada aquí aparece el botón oficial «Acceder con Google».</p><div class="pila">' +
        cuentas.map(function (c) { return '<button class="cuenta-prueba" data-act="cuentaPrueba" data-email="' + c[0] + '" data-nombre="' + c[1] + '"><span class="av">' + c[3] + '</span><span><b>' + c[1] + '</b><br><span class="mini mut">' + c[2] + '</span></span></button>'; }).join('') +
        '</div><button class="btn fant chico" style="margin-top:14px" data-act="reiniciarPrueba">' + ic('deshacer') + 'Reiniciar datos de prueba</button>');
    } else if (!window.KAN_CONFIG.GOOGLE_CLIENT_ID) {
      pintarPanel(K.mascota('advertencia', 'Falta configurar <b>GOOGLE_CLIENT_ID</b> en <code>js/config.js</code>. Revisa la guía de instalación.'));
    } else {
      pintarPanel('<h2>Iniciar sesión</h2><p class="mut peq" style="margin:6px 0 16px">Usa la cuenta de Google que KAN autorizó para ti. KAN no recibe ni guarda tu contraseña.</p><div id="g-boton" style="min-height:44px"></div>' +
        '<p class="mini mut" style="margin-top:16px">¿No tienes acceso? Entra con tu cuenta de Google y podrás enviar una solicitud.</p>');
      (function esperarGoogle(n) {
        if (window.google && google.accounts && google.accounts.id) {
          google.accounts.id.initialize({ client_id: window.KAN_CONFIG.GOOGLE_CLIENT_ID, callback: function (r) { entrarCon(r.credential); }, ux_mode: 'popup' });
          google.accounts.id.renderButton(document.getElementById('g-boton'), { theme: 'filled_blue', size: 'large', shape: 'pill', text: 'continue_with', locale: 'es', width: 300 });
        } else if (n < 60) setTimeout(function () { esperarGoogle(n + 1); }, 200);
        else pintarPanel(K.mascota('advertencia', 'No se pudo cargar el inicio de sesión de Google. Revisa tu conexión y recarga la página.'));
      })(0);
    }
  };
  function pintarPanel(html) { var p = document.getElementById('panel-acceso'); if (p) p.innerHTML = html; }
  function entrarCon(idToken) {
    pintarPanel(K.cargando('Verificando tu identidad…'));
    api.llamar('login', { idToken: idToken }).then(function (r) {
      if (r.estado === 'OK') { api.guardarSesion(r.token); K.toast('¡Bienvenido, ' + r.perfil.nombre + '!', 'ok', 'entusiasmo'); return K.entrar(r.perfil); }
      if (r.estado === 'SUSPENDIDA') return pintarPanel(K.mascota('advertencia', 'La cuenta <b>' + esc(r.email) + '</b> está suspendida. Contacta al administrador de KAN.') + '<button class="btn" style="margin-top:14px" data-act="otraCuenta">Usar otra cuenta</button>');
      if (r.estado === 'PENDIENTE') return pintarPanel(K.mascota('pensamiento', 'Tu cuenta todavía no está activa.') + '<button class="btn" style="margin-top:14px" data-act="otraCuenta">Volver</button>');
      idTokenPendiente = idToken;
      if (r.solicitud && r.solicitud.estado === 'PENDIENTE') return pintarPanel(K.mascota('pensamiento', 'Tu solicitud como <b>' + (r.solicitud.tipo === 'PROVEEDOR' ? 'proveedor' : 'vendedor') + '</b> está en revisión desde ' + K.dia(r.solicitud.creado) + '.') + '<button class="btn" style="margin-top:14px" data-act="otraCuenta">Volver</button>');
      var reg = r.registro;
      if (!reg.proveedores && !reg.vendedores && !r.codigos) return pintarPanel(K.mascota('advertencia', 'Por ahora KAN no está recibiendo nuevas solicitudes.') + '<button class="btn" style="margin-top:14px" data-act="otraCuenta">Volver</button>');
      var formCodigo = r.codigos ? '<form class="form" data-form="codigo"><h2>¿Una tienda te dio su código?</h2><p class="mut peq" style="margin:0">Escríbelo y entras de inmediato como vendedor de esa tienda con <b>' + esc(r.email) + '</b>.</p>' +
        '<label class="campo">Código de tienda<input name="codigo" required autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="COMPUSHOP-XXXXX" style="text-transform:uppercase;letter-spacing:.06em"></label>' +
        '<input type="hidden" name="nombre" value="' + esc(r.nombre) + '"><label class="campo">Tu WhatsApp (opcional)<input name="telefono" inputmode="tel" placeholder="52 1 55 1234 5678"></label>' +
        '<button class="btn p" type="submit">' + ic('check') + 'Entrar con código</button></form>' : '';
      if (!reg.proveedores && !reg.vendedores) return pintarPanel(formCodigo + '<button class="btn fant" style="margin-top:10px" data-act="otraCuenta">Usar otra cuenta</button>');
      pintarPanel(formCodigo + (formCodigo ? '<p class="mini mut" style="text-align:center;margin:18px 0 12px">— o, si no tienes código, envía una solicitud —</p>' : '') +
        '<h2>Solicitar acceso</h2><p class="mut peq" style="margin:6px 0 14px">' + esc(r.email) + ' todavía no tiene cuenta. Envía tu solicitud y el administrador la revisará.' +
        (r.solicitud && r.solicitud.estado === 'RECHAZADA' ? '<br><span style="color:var(--warn)">Tu solicitud anterior fue rechazada' + (r.solicitud.motivo ? ': ' + esc(r.solicitud.motivo) : '') + '.</span>' : '') + '</p>' +
        '<form class="form" data-form="solicitud"><label class="campo">Quiero entrar como<select name="tipo" id="sol-tipo">' + (reg.vendedores ? '<option value="VENDEDOR">Vendedor</option>' : '') + (reg.proveedores ? '<option value="PROVEEDOR">Proveedor (tengo tienda)</option>' : '') + '</select></label>' +
        '<label class="campo">Tu nombre<input name="nombre" required maxlength="60" value="' + esc(r.nombre) + '"></label>' +
        '<label class="campo">Nombre del negocio (proveedores)<input name="negocio" maxlength="60" placeholder="Ej. CompuShop"></label>' +
        (r.tiendas.length ? '<label class="campo">Tienda con la que vendes (vendedores)<select name="tiendaId"><option value="">Cualquiera / no sé</option>' + r.tiendas.map(function (t) { return '<option value="' + esc(t.id) + '">' + esc(t.nombre) + '</option>'; }).join('') + '</select></label>' : '') +
        '<label class="campo">WhatsApp<input name="telefono" inputmode="tel" placeholder="52 1 55 1234 5678"></label>' +
        '<label class="campo">Mensaje (opcional)<textarea name="mensaje" maxlength="300"></textarea></label>' +
        '<button class="btn p" type="submit">' + ic('enviar') + 'Enviar solicitud</button><button class="btn fant" type="button" data-act="otraCuenta">Cancelar</button></form>');
    }).catch(function (e) { K.error(e); V.acceso(); });
  }

  /* =============================== 02 · PANEL DEL ADMINISTRADOR =============================== */
  var TABS_ADMIN = [['resumen', 'Resumen'], ['solicitudes', 'Solicitudes'], ['usuarios', 'Usuarios y tiendas'], ['configuracion', 'Configuración'], ['auditoria', 'Auditoría'], ['respaldos', 'Respaldos']];
  V.admin = function (ruta, v) {
    var tab = ruta.params.tab || 'resumen';
    K.refrescar = function () { V.admin(ruta, v); };
    K.accionesVista = Object.assign({}, accionesSolicitudes(function () { V.admin(ruta, v); }), accionesCodigo(function () { V.admin(ruta, v); }), {
      tab: function (el) { K.ir('/admin?tab=' + el.dataset.tab); },
      delegar: function (el) {
        var on = el.dataset.v === 'true';
        api.llamar('delegarTienda', { tiendaId: el.dataset.t, activo: on }).then(function () { K.toast(on ? 'Ahora ese proveedor aprueba a sus vendedores' : 'Tú vuelves a aprobar a los vendedores de esa tienda'); K.refrescar(); }).catch(K.error);
      },
      crearUsuario: function () {
        api.llamar('resumenAdmin').then(function (r) {
          return K.modal({ titulo: 'Agregar persona', html: '<div class="form"><p class="mut peq" style="margin:0">La cuenta queda activa de inmediato. La persona entra con <b>ese mismo correo de Google</b>.</p>' +
            '<label class="campo">Rol<select id="cu-rol"><option value="PROVEEDOR">Proveedor (tiene tienda e inventario)</option><option value="VENDEDOR">Vendedor</option></select></label>' +
            '<label class="campo">Correo de Google<input id="cu-email" type="email" autocomplete="off" placeholder="nombre@gmail.com"></label>' +
            '<label class="campo">Nombre<input id="cu-nombre" maxlength="60"></label>' +
            '<label class="campo" id="cu-neg-c">Nombre de la tienda<input id="cu-negocio" maxlength="60" placeholder="Ej. CompuShop"></label>' +
            '<label class="campo">WhatsApp (opcional)<input id="cu-tel" inputmode="tel"></label>' +
            '<div id="cu-tiendas" class="pila" style="display:none"><span class="peq">Tiendas que podrá ver</span>' + r.tiendas.filter(function (t) { return t.estado === 'ACTIVO'; }).map(function (t) { return '<label class="check"><input type="checkbox" data-t="' + esc(t.id) + '">' + esc(t.nombre) + '</label>'; }).join('') + '</div></div>',
            alAbrir: function (c) { var s = $('#cu-rol', c); s.addEventListener('change', function () { var p = s.value === 'PROVEEDOR'; $('#cu-neg-c', c).style.display = p ? '' : 'none'; $('#cu-tiendas', c).style.display = p ? 'none' : ''; }); },
            botones: [{ txt: 'Cancelar', valor: null }, { txt: 'Crear cuenta', clase: 'p', valor: function (c) {
              return { rol: $('#cu-rol', c).value, email: $('#cu-email', c).value, nombre: $('#cu-nombre', c).value, negocio: $('#cu-negocio', c).value, telefono: $('#cu-tel', c).value,
                tiendas: $$('[data-t]', c).filter(function (x) { return x.checked; }).map(function (x) { return x.dataset.t; }) };
            } }] });
        }).then(function (d) {
          if (!d) return;
          return api.llamar('crearUsuario', d).then(function (r) { K.toast('Cuenta creada' + (r.codigo ? '. Código de su tienda: ' + r.codigo : ''), 'ok', 'exito'); K.refrescar(); });
        }).catch(K.error);
      },
      estadoUsuario: function (el) {
        var suspender = el.dataset.estado === 'SUSPENDIDO';
        K.confirmar(suspender ? '¿Suspender esta cuenta?' : '¿Reactivar esta cuenta?', suspender ? 'La persona pierde el acceso de inmediato. Si es proveedor, su tienda deja de mostrarse.' : 'La persona podrá volver a entrar.', { si: suspender ? 'Suspender' : 'Reactivar', peligro: suspender })
          .then(function (si) { if (si) api.llamar('cambiarEstadoUsuario', { id: el.dataset.id, estado: el.dataset.estado }).then(function () { K.toast('Cuenta actualizada'); K.refrescar(); }).catch(K.error); });
      },
      tiendasVendedor: function (el) {
        var u = JSON.parse(el.dataset.u);
        api.llamar('resumenAdmin').then(function (r) {
          K.modal({ titulo: 'Tiendas de ' + u.nombre, html: '<p class="mut peq">Marca las tiendas cuyo inventario puede ver este vendedor.</p><div class="pila">' + r.tiendas.map(function (t) {
            return '<label class="check"><input type="checkbox" data-t="' + esc(t.id) + '"' + (u.membresias.indexOf(t.id) >= 0 ? ' checked' : '') + '>' + esc(t.nombre) + '</label>';
          }).join('') + '</div>', botones: [{ txt: 'Cancelar', valor: null }, { txt: 'Guardar', clase: 'p', valor: function (c) { return $$('[data-t]', c).map(function (x) { return [x.dataset.t, x.checked]; }); } }] })
            .then(function (sel) {
              if (!sel) return;
              var cambios = sel.filter(function (s) { return (u.membresias.indexOf(s[0]) >= 0) !== s[1]; });
              return cambios.reduce(function (p, s) { return p.then(function () { return api.llamar('asignarTienda', { vendedorId: u.id, tiendaId: s[0], activo: s[1] }); }); }, Promise.resolve())
                .then(function () { K.toast('Tiendas actualizadas'); K.refrescar(); });
            }).catch(K.error);
        });
      },
      crearTienda: function () {
        api.llamar('usuarios').then(function (us) {
          var opciones = us.filter(function (u) { return (u.rol === 'PROVEEDOR' || u.rol === 'ADMIN') && u.estado === 'ACTIVO'; });
          K.modal({ titulo: 'Nueva tienda', html: '<div class="form"><label class="campo">Nombre<input id="nt-nombre" maxlength="60"></label><label class="campo">Responsable<select id="nt-prov">' + opciones.map(function (u) { return '<option value="' + esc(u.id) + '">' + esc(u.nombre) + ' · ' + esc(u.rol === 'ADMIN' ? 'Administrador' : 'Proveedor') + '</option>'; }).join('') + '</select></label></div>',
            botones: [{ txt: 'Cancelar', valor: null }, { txt: 'Crear tienda', clase: 'p', valor: function (c) { return { nombre: $('#nt-nombre', c).value, proveedorId: $('#nt-prov', c).value }; } }] })
            .then(function (d) { if (d) return api.llamar('crearTienda', d).then(function () { K.toast('Tienda creada'); K.refrescar(); }); }).catch(K.error);
        });
      },
      guardarConfig: function (el) {
        var d = {}; d[el.dataset.clave] = el.dataset.valor === 'true' ? true : el.dataset.valor === 'false' ? false : el.dataset.valor;
        api.llamar('guardarConfiguracion', d).then(function () { K.toast('Configuración guardada'); K.refrescar(); }).catch(K.error);
      },
      crearRespaldo: function (el) {
        el.disabled = true;
        api.llamar('crearRespaldo').then(function (r) { K.toast('Respaldo creado: ' + r.nombre, 'ok', 'trabajo'); K.refrescar(); }).catch(function (e) { el.disabled = false; K.error(e); });
      },
      restaurar: function (el) {
        K.confirmar('Restaurar respaldo', 'Esto reemplaza TODOS los datos actuales por los de <b>' + esc(el.dataset.nombre) + '</b>. Antes se guarda automáticamente un respaldo del estado actual.', {
          peligro: true, si: 'Restaurar', pose: 'advertencia', html: '<label class="campo" style="margin-top:12px">Escribe RESTAURAR para confirmar<input id="conf-rest" autocomplete="off"></label>',
          valor: function (c) { return $('#conf-rest', c).value.trim(); }
        }).then(function (conf) {
          if (!conf) return;
          return api.llamar('restaurarRespaldo', { archivoId: el.dataset.id, confirmacion: conf }).then(function () { K.toast('Respaldo restaurado'); K.refrescar(); });
        }).catch(K.error);
      }
    });
    var cabecera = '<div class="encabezado entra"><div><div class="ceja">Administrador general</div><h1>Panel de KAN</h1><p class="mut">Hola, ' + esc(S.perfil.nombre) + '. Todo KAN, en un vistazo.</p></div></div>' +
      '<div class="pestanas" role="tablist">' + TABS_ADMIN.map(function (t) { return '<button role="tab" aria-selected="' + (t[0] === tab) + '" class="' + (t[0] === tab ? 'on' : '') + '" data-act="tab" data-tab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>';
    var carga = {
      resumen: function () { return api.llamar('resumenAdmin').then(adminResumen); },
      solicitudes: function () { return api.llamar('solicitudes').then(listaSolicitudes); },
      usuarios: function () { return Promise.all([api.llamar('usuarios'), api.llamar('resumenAdmin')]).then(function (r) { return adminUsuarios(r[0], r[1]); }); },
      configuracion: function () { return api.llamar('configuracion').then(adminConfig); },
      auditoria: function () { return api.llamar('auditoria').then(adminAuditoria); },
      respaldos: function () { return api.llamar('respaldos').then(adminRespaldos); }
    }[tab] || function () { return Promise.resolve(''); };
    return carga().then(function (html) { v.innerHTML = cabecera + html; contar(v); });
  };
  function adminResumen(r) {
    var pe = r.porEstado;
    var viejas = r.tiendas.filter(function (t) { return t.estado === 'ACTIVO' && (!t.ultimaConfirmacion || Date.now() - t.ultimaConfirmacion > 7 * 864e5); });
    var globo = r.solicitudesPendientes ? 'Tienes <b>' + r.solicitudesPendientes + '</b> solicitud' + (r.solicitudesPendientes > 1 ? 'es' : '') + ' esperando revisión.' : 'Todo en orden: no hay solicitudes pendientes.';
    if (viejas.length) globo += '<br>' + viejas.length + ' tienda' + (viejas.length > 1 ? 's no han' : ' no ha') + ' confirmado su inventario en 7 días.';
    return '<div class="kpis entra">' + [['DISPONIBLE', 'Disponibles', 'var(--ok2)'], ['APARTADO', 'Apartados', 'var(--hold)'], ['REVISION', 'En revisión', 'var(--review)']].map(function (k) {
      return '<div class="kpi"><b style="color:' + k[2] + '" data-contar="' + pe[k[0]] + '">0</b><span>' + k[1] + '</span></div>';
    }).join('') + '<div class="kpi"><b style="color:var(--sold)" data-contar="' + r.vendidas30 + '">0</b><span>Vendidas (30 días)</span></div><div class="kpi"><b data-contar="' + r.solicitudesPendientes + '">0</b><span>Solicitudes</span></div></div>' +
      '<div class="tarjeta plana entra" style="margin:16px 0;animation-delay:.1s">' + K.mascota(viejas.length || r.solicitudesPendientes ? 'inteligencia' : 'confianza', globo) +
      (r.solicitudesPendientes ? '<div style="margin-top:12px"><button class="btn p chico" data-act="tab" data-tab="solicitudes">Revisar solicitudes</button></div>' : '') + '</div>' +
      '<div class="entre" style="margin:20px 0 10px"><h2>Tiendas</h2><span class="mut peq">' + r.usuarios.proveedores + ' proveedores · ' + r.usuarios.vendedores + ' vendedores' + (r.usuarios.suspendidos ? ' · ' + r.usuarios.suspendidos + ' suspendidos' : '') + '</span></div>' +
      '<div class="tabla-caja entra" style="animation-delay:.15s"><table class="t"><thead><tr><th>Tienda</th><th>Estado</th><th class="num">Disponibles</th><th class="num">Unidades</th><th class="num">Vendedores</th><th>Inventario confirmado</th></tr></thead><tbody>' +
      r.tiendas.map(function (t) {
        var vieja = !t.ultimaConfirmacion || Date.now() - t.ultimaConfirmacion > 7 * 864e5;
        return '<tr><td><b>' + esc(t.nombre) + '</b></td><td>' + (t.estado === 'ACTIVO' ? '<span class="estado e-DISPONIBLE">Activa</span>' : '<span class="estado e-VENDIDO">Suspendida</span>') + '</td><td class="num">' + t.disponibles + '</td><td class="num">' + t.total + '</td><td class="num">' + t.vendedores + '</td><td>' + (vieja ? '<span class="etiqueta aviso">' + (t.ultimaConfirmacion ? K.hace(t.ultimaConfirmacion) : 'Nunca') + '</span>' : K.hace(t.ultimaConfirmacion)) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  function accionesSolicitudes(despues) {
    return {
      aprobar: function (el) {
        K.confirmar('¿Aprobar solicitud?', 'Se creará la cuenta de <b>' + esc(el.dataset.nombre) + '</b>' + (el.dataset.tipo === 'PROVEEDOR' ? ' y su tienda.' : '.'), { si: 'Aprobar' })
          .then(function (si) { if (si) return api.llamar('resolverSolicitud', { id: el.dataset.id, aprobar: true }).then(function () { K.toast('Solicitud aprobada', 'ok', 'entusiasmo'); despues(); }); }).catch(K.error);
      },
      rechazar: function (el) {
        K.confirmar('¿Rechazar solicitud?', 'La persona verá el motivo si vuelve a entrar.', { si: 'Rechazar', peligro: true, html: '<label class="campo" style="margin-top:12px">Motivo (opcional)<input id="motivo" maxlength="200"></label>', valor: function (c) { return { motivo: $('#motivo', c).value }; } })
          .then(function (r) { if (r) return api.llamar('resolverSolicitud', { id: el.dataset.id, aprobar: false, motivo: r.motivo }).then(function () { K.toast('Solicitud rechazada'); despues(); }); }).catch(K.error);
      }
    };
  }
  function listaSolicitudes(lista) {
    var pend = lista.filter(function (s) { return s.estado === 'PENDIENTE'; }), resto = lista.filter(function (s) { return s.estado !== 'PENDIENTE'; });
    if (!lista.length) return K.vacio('confianza', 'Sin solicitudes', 'Cuando alguien pida acceso, aparecerá aquí.');
    return (pend.length ? '<div class="rejilla">' + pend.map(function (s, i) {
      return '<div class="tarjeta entra"' + delay(i) + '><div class="entre"><span class="etiqueta cian">' + (s.tipo === 'PROVEEDOR' ? 'Proveedor' : 'Vendedor') + '</span><span class="mini mut">' + K.hace(s.creado) + '</span></div>' +
        '<h3 style="margin:10px 0 2px">' + esc(s.nombre) + '</h3><div class="peq mut">' + esc(s.email) + '</div>' +
        (s.negocio ? '<div class="peq" style="margin-top:6px">Negocio: <b>' + esc(s.negocio) + '</b></div>' : '') + (s.tienda ? '<div class="peq" style="margin-top:6px">Tienda: <b>' + esc(s.tienda) + '</b></div>' : '') +
        (s.telefono ? '<div class="peq mut">WhatsApp: ' + esc(s.telefono) + '</div>' : '') + (s.mensaje ? '<p class="peq" style="margin:8px 0 0">«' + esc(s.mensaje) + '»</p>' : '') +
        '<div class="fila" style="margin-top:12px"><button class="btn p chico" data-act="aprobar" data-id="' + esc(s.id) + '" data-nombre="' + esc(s.nombre) + '" data-tipo="' + s.tipo + '">' + ic('check') + 'Aprobar</button><button class="btn peligro chico" data-act="rechazar" data-id="' + esc(s.id) + '">Rechazar</button></div></div>';
    }).join('') + '</div>' : K.vacio('confianza', 'Nada pendiente', 'No hay solicitudes esperando revisión.')) +
      (resto.length ? '<h2 style="margin:22px 0 10px">Historial</h2><div class="tabla-caja"><table class="t"><thead><tr><th>Persona</th><th>Tipo</th><th>Estado</th><th>Fecha</th></tr></thead><tbody>' + resto.map(function (s) {
        return '<tr><td>' + esc(s.nombre) + '<br><span class="mini mut">' + esc(s.email) + '</span></td><td>' + (s.tipo === 'PROVEEDOR' ? 'Proveedor' : 'Vendedor') + '</td><td>' + (s.estado === 'APROBADA' ? '<span class="estado e-DISPONIBLE">Aprobada</span>' : '<span class="estado e-VENDIDO">Rechazada</span>') + '</td><td>' + K.dia(s.creado) + '</td></tr>';
      }).join('') + '</tbody></table></div>' : '');
  }
  /* Código de tienda: lo usan el admin (todas) y el proveedor con delegación (la suya). */
  function bloqueCodigo(t, global) {
    if (!t.codigo) return '<button class="btn chico" data-act="codigoAcc" data-t="' + esc(t.id) + '" data-a="regenerar">Generar código</button>';
    return '<div class="fila" style="gap:8px;flex-wrap:wrap"><code style="font-size:1.05rem;letter-spacing:.06em;padding:6px 10px;border-radius:10px;background:var(--sup2, rgba(255,255,255,.06))' + (t.codigoActivo ? '' : ';opacity:.5;text-decoration:line-through') + '">' + esc(t.codigo) + '</code>' +
      (t.codigoActivo ? '<button class="btn chico" data-act="copiarCodigo" data-c="' + esc(t.codigo) + '">' + ic('copiar') + 'Copiar</button>' : '<span class="etiqueta aviso">Desactivado</span>') +
      '<button class="btn fant chico" data-act="codigoAcc" data-t="' + esc(t.id) + '" data-a="regenerar">Cambiar código</button>' +
      '<button class="btn fant chico" data-act="codigoAcc" data-t="' + esc(t.id) + '" data-a="' + (t.codigoActivo ? 'desactivar' : 'activar') + '">' + (t.codigoActivo ? 'Desactivar' : 'Activar') + '</button></div>' +
      (global === false ? '<p class="mini" style="color:var(--warn);margin:8px 0 0">El acceso con código está apagado para todo KAN (Configuración).</p>' : '');
  }
  function accionesCodigo(despues) {
    return {
      copiarCodigo: function (el) { K.copiar(el.dataset.c, 'Código copiado. Compártelo solo con vendedores de confianza.'); },
      codigoAcc: function (el) {
        var a = el.dataset.a;
        var paso = a === 'regenerar' ? K.confirmar('¿Cambiar el código?', 'El código actual deja de funcionar. Los vendedores que ya entraron conservan su acceso.', { si: 'Cambiar código' }) : Promise.resolve(true);
        paso.then(function (si) { if (si) return api.llamar('codigoTienda', { tiendaId: el.dataset.t, accion: a }).then(function (r) { K.toast(a === 'desactivar' ? 'Código desactivado' : 'Código: ' + r.codigo, 'ok', 'trabajo'); despues(); }); }).catch(K.error);
      }
    };
  }
  function adminUsuarios(us, r) {
    var tiendas = {}; r.tiendas.forEach(function (t) { tiendas[t.id] = t.nombre; });
    var ROL = { ADMIN: 'Administrador', PROVEEDOR: 'Proveedor', VENDEDOR: 'Vendedor' };
    return '<div class="entre" style="margin-bottom:12px"><h2 style="margin:0">Tiendas</h2><button class="btn chico" data-act="crearTienda">' + ic('mas') + 'Nueva tienda</button></div>' +
      '<div class="tabla-caja entra" style="margin-bottom:22px"><table class="t"><thead><tr><th>Tienda</th><th>Código para vendedores</th><th>¿Quién aprueba vendedores?</th></tr></thead><tbody>' + r.tiendas.map(function (t) {
        return '<tr><td><b>' + esc(t.nombre) + '</b><br><span class="mini mut">' + esc(t.proveedor || '') + (t.estado !== 'ACTIVO' ? ' · suspendida' : '') + '</span></td><td style="white-space:normal">' + bloqueCodigo(t, r.config.codigos) + '</td>' +
          '<td><div class="chips"><button class="chip-f' + (t.aprobarVendedores ? '' : ' on') + '" data-act="delegar" data-t="' + esc(t.id) + '" data-v="false" aria-pressed="' + !t.aprobarVendedores + '">Yo</button><button class="chip-f' + (t.aprobarVendedores ? ' on' : '') + '" data-act="delegar" data-t="' + esc(t.id) + '" data-v="true" aria-pressed="' + !!t.aprobarVendedores + '">El proveedor</button></div>' +
          (r.config.modoAprobacion === 'DELEGADO' ? '<span class="mini mut">Modo delegado global activo</span>' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="entre" style="margin-bottom:12px"><div><h2 style="margin:0">Personas</h2><p class="mut peq" style="margin:4px 0 0">Suspende o reactiva cuentas y decide qué tiendas ve cada vendedor.</p></div><button class="btn p chico" data-act="crearUsuario">' + ic('mas') + 'Agregar persona</button></div>' +
      '<div class="tabla-caja entra"><table class="t"><thead><tr><th>Persona</th><th>Rol</th><th>Estado</th><th>Tiendas</th><th></th></tr></thead><tbody>' + us.map(function (u) {
        var ts = u.rol === 'VENDEDOR' ? u.membresias.map(function (id) { return tiendas[id] || id; }) : u.tiendasPropias.map(function (t) { return t.nombre; });
        var esYo = u.id === S.perfil.id;
        return '<tr><td><b>' + esc(u.nombre) + '</b><br><span class="mini mut">' + esc(u.email) + '</span></td><td>' + ROL[u.rol] + '</td><td>' + (u.estado === 'ACTIVO' ? '<span class="estado e-DISPONIBLE">Activa</span>' : '<span class="estado e-VENDIDO">' + esc(u.estado.toLowerCase()) + '</span>') + '</td>' +
          '<td style="white-space:normal">' + (ts.length ? ts.map(esc).join(', ') : '<span class="mut">—</span>') + '</td><td><div class="fila" style="justify-content:flex-end">' +
          (u.rol === 'VENDEDOR' ? '<button class="btn chico" data-act="tiendasVendedor" data-u="' + esc(JSON.stringify(u)) + '">Tiendas</button>' : '') +
          (esYo ? '' : u.estado === 'ACTIVO' ? '<button class="btn peligro chico" data-act="estadoUsuario" data-id="' + esc(u.id) + '" data-estado="SUSPENDIDO">Suspender</button>' : '<button class="btn ok chico" data-act="estadoUsuario" data-id="' + esc(u.id) + '" data-estado="ACTIVO">Reactivar</button>') + '</div></td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  function interruptor(clave, valor, actual, txt) {
    return '<button class="chip-f' + (String(actual) === String(valor) ? ' on' : '') + '" data-act="guardarConfig" data-clave="' + clave + '" data-valor="' + valor + '" aria-pressed="' + (String(actual) === String(valor)) + '">' + txt + '</button>';
  }
  function adminConfig(c) {
    return '<div class="dos entra"><div class="tarjeta"><h2>¿Quién aprueba a los vendedores?</h2><p class="mut peq">Los proveedores siempre los apruebas tú.</p><div class="chips">' +
      interruptor('modoAprobacion', 'CENTRAL', c.modoAprobacion, 'Yo (o proveedores que elija)') + interruptor('modoAprobacion', 'DELEGADO', c.modoAprobacion, 'Todos los proveedores') + '</div>' +
      '<p class="mini mut" style="margin:10px 0 0">Para delegar solo a proveedores seleccionados, déjalo en «Yo» y activa «El proveedor» en <a href="#/admin?tab=usuarios">Usuarios y tiendas</a>.</p></div>' +
      '<div class="tarjeta"><h2>Acceso con código de tienda</h2><p class="mut peq">Un vendedor entra con Google y escribe el código de la tienda: queda autorizado de inmediato solo para esa tienda.</p><div class="chips">' +
      interruptor('codigos', true, c.codigos, 'Permitido') + interruptor('codigos', false, c.codigos, 'Apagado') + '</div></div>' +
      '<div class="tarjeta"><h2>Registro de nuevas cuentas</h2><p class="mut peq">Si lo cierras, nadie nuevo puede enviar solicitudes.</p><div class="pila"><div><div class="peq" style="margin-bottom:6px">Proveedores</div><div class="chips">' +
      interruptor('proveedores', true, c.proveedores, 'Abierto') + interruptor('proveedores', false, c.proveedores, 'Cerrado') + '</div></div><div><div class="peq" style="margin-bottom:6px">Vendedores</div><div class="chips">' +
      interruptor('vendedores', true, c.vendedores, 'Abierto') + interruptor('vendedores', false, c.vendedores, 'Cerrado') + '</div></div></div></div></div>';
  }
  function adminAuditoria(l) {
    if (!l.length) return K.vacio('confianza', 'Sin actividad registrada', '');
    return '<div class="tabla-caja entra"><table class="t"><thead><tr><th>Fecha</th><th>Quién</th><th>Acción</th><th>Detalle</th></tr></thead><tbody>' + l.map(function (a) {
      return '<tr><td>' + K.fecha(a.fecha) + '</td><td>' + esc(a.usuario === 'SISTEMA' ? 'KAN (automático)' : a.usuario || 'Sin sesión') + '</td><td><span class="etiqueta">' + esc(a.accion.replace(/_/g, ' ').toLowerCase()) + '</span></td><td style="white-space:normal;max-width:420px">' + esc(a.entidadId) + (a.detalle ? ' · ' + esc(a.detalle) : '') + '</td></tr>';
    }).join('') + '</tbody></table></div>';
  }
  function adminRespaldos(l) {
    return '<div class="tarjeta plana entra" style="margin-bottom:14px">' + K.mascota('trabajo', 'KAN crea un respaldo automático <b>cada día</b> en tu Google Drive (carpeta «KAN · Respaldos»). También puedes crear uno ahora.') +
      '<div style="margin-top:12px"><button class="btn p" data-act="crearRespaldo">' + ic('respaldo') + 'Crear respaldo ahora</button></div></div>' +
      (l.length ? '<div class="tabla-caja"><table class="t"><thead><tr><th>Archivo</th><th>Fecha</th><th></th></tr></thead><tbody>' + l.map(function (r) {
        return '<tr><td>' + esc(r.nombre) + '</td><td>' + K.fecha(r.fecha) + '</td><td><div class="fila" style="justify-content:flex-end">' + (api.modoPrueba ? '' : '<a class="btn chico" href="' + esc(r.url) + '" target="_blank" rel="noopener">Abrir en Drive</a>') + '<button class="btn peligro chico" data-act="restaurar" data-id="' + esc(r.id) + '" data-nombre="' + esc(r.nombre) + '">Restaurar</button></div></td></tr>';
      }).join('') + '</tbody></table></div>' : K.vacio('pensamiento', 'Aún no hay respaldos', 'El primero se crea esta noche, o ahora con el botón.'));
  }
  V.solicitudes = function (ruta, v) {
    K.accionesVista = accionesSolicitudes(function () { V.solicitudes(ruta, v); });
    return api.llamar('solicitudes').then(function (l) { v.innerHTML = '<div class="encabezado"><div><div class="ceja">Modo delegado</div><h1>Vendedores que quieren unirse</h1></div></div>' + listaSolicitudes(l); });
  };

  /* Proveedor con delegación: su código, solicitudes y vendedores (solo de SU tienda; el servidor lo valida). */
  V.vendedores = function (ruta, v) {
    var propias = S.perfil.tiendas.filter(function (t) { return t.gestionaVendedores; });
    if (!propias.length) { v.innerHTML = K.vacio('confianza', 'El administrador aprueba a tus vendedores', 'Si quieres aprobarlos tú, pídeselo al administrador de KAN.'); return Promise.resolve(); }
    var tid = ruta.params.t || propias[0].id;
    function recargar() { V.vendedores(ruta, v); }
    K.refrescar = recargar;
    K.accionesVista = Object.assign({}, accionesSolicitudes(recargar), accionesCodigo(recargar), {
      tiendaV: function (el) { K.ir('/vendedores?t=' + el.dataset.t); },
      accesoV: function (el) {
        var on = el.dataset.on === '1';
        K.confirmar(on ? '¿Devolver el acceso?' : '¿Quitar el acceso?', on ? 'Podrá volver a ver tu inventario.' : 'Deja de ver tu inventario de inmediato. Su cuenta y sus datos privados no se borran.', { si: on ? 'Devolver acceso' : 'Quitar acceso', peligro: !on })
          .then(function (si) { if (si) return api.llamar('asignarTienda', { vendedorId: el.dataset.id, tiendaId: tid, activo: on }).then(function () { K.toast('Acceso actualizado'); recargar(); }); }).catch(K.error);
      }
    });
    return api.llamar('vendedoresTienda', { tiendaId: tid }).then(function (r) {
      var t = r.tienda;
      v.innerHTML = '<div class="encabezado entra"><div><div class="ceja">' + esc(t.nombre) + '</div><h1>Vendedores</h1><p class="mut">Tú decides quién puede ver y vender tu inventario.</p></div></div>' +
        (propias.length > 1 ? '<div class="chips" style="margin-bottom:14px">' + propias.map(function (p) { return '<button class="chip-f' + (p.id === tid ? ' on' : '') + '" data-act="tiendaV" data-t="' + esc(p.id) + '">' + esc(p.nombre) + '</button>'; }).join('') + '</div>' : '') +
        '<div class="dos entra"><div class="tarjeta"><h2>Código de tu tienda</h2><p class="mut peq">Compártelo solo con vendedores de confianza. Con él entran de inmediato, siempre identificados con su cuenta de Google.</p>' + bloqueCodigo(t, t.codigosGlobal) + '</div>' +
        '<div class="tarjeta">' + K.mascota('inteligencia', '<b>Cómo invitar a un vendedor</b><br>1. Comparte la dirección de KAN y tu código.<br>2. Entra con Google y escribe el código.<br>3. Te llega un aviso y aparece aquí abajo.') + '</div></div>' +
        (r.solicitudes.length ? '<h2 style="margin:22px 0 10px">Solicitudes pendientes</h2>' + listaSolicitudes(r.solicitudes) : '') +
        '<h2 style="margin:22px 0 10px">Vendedores de ' + esc(t.nombre) + '</h2>' +
        (r.vendedores.length ? '<div class="tabla-caja entra"><table class="t"><thead><tr><th>Vendedor</th><th>WhatsApp</th><th>Acceso</th><th></th></tr></thead><tbody>' + r.vendedores.map(function (x) {
          var activo = x.acceso === 'ACTIVO' && x.cuenta === 'ACTIVO';
          return '<tr><td><b>' + esc(x.nombre) + '</b><br><span class="mini mut">' + esc(x.email) + '</span></td><td>' + esc(x.telefono || '—') + '</td><td>' +
            (x.cuenta !== 'ACTIVO' ? '<span class="estado e-VENDIDO">Cuenta suspendida</span>' : activo ? '<span class="estado e-DISPONIBLE">Activo</span>' : '<span class="estado e-RETIRADO">Sin acceso</span>') + '</td><td><div class="fila" style="justify-content:flex-end">' +
            (x.cuenta !== 'ACTIVO' ? '' : activo ? '<button class="btn peligro chico" data-act="accesoV" data-id="' + esc(x.id) + '" data-on="0">Quitar acceso</button>' : '<button class="btn ok chico" data-act="accesoV" data-id="' + esc(x.id) + '" data-on="1">Devolver acceso</button>') + '</div></td></tr>';
        }).join('') + '</tbody></table></div>' : K.vacio('pensamiento', 'Aún no hay vendedores', 'Comparte tu código para que se unan.'));
    });
  };

  /* =============================== Catálogo e inventario (compartido) =============================== */
  function tarjetaModelo(g, i) {
    var c = g.conteo;
    return '<a class="modelo entra"' + delay(i) + ' href="#/grupo/' + esc(g.id) + '"><div class="foto">' + K.foto(g.portada, g.categoria, 'mini', g.nombre) +
      '<div class="sobre"><span class="estado e-DISPONIBLE">' + c.DISPONIBLE + ' disp.</span>' + (c.APARTADO ? '<span class="estado e-APARTADO">' + c.APARTADO + ' apart.</span>' : '') + '</div><span class="sobre-der">' + esc(g.tienda) + '</span></div>' +
      '<div class="cuerpo"><div class="t">' + esc(g.nombre) + '</div><div class="mini mut">' + esc(g.detalle || g.categoria) + ' · ' + g.coinciden + ' unidad' + (g.coinciden === 1 ? '' : 'es') + ' en el filtro</div>' +
      '<div class="cuentas">' + (c.REVISION ? '<span style="color:var(--review)">' + c.REVISION + ' en revisión</span>' : '') + (c.VENDIDO ? '<span style="color:var(--sold)">' + c.VENDIDO + ' vendidas</span>' : '') + (c.RETIRADO ? '<span>' + c.RETIRADO + ' retiradas</span>' : '') + '</div>' +
      '<div class="precios">' + (g.desdeProveedor !== undefined ? '<div>Proveedor desde<b>' + K.dinero(g.desdeProveedor) + '</b></div>' : '<div></div>') + '<div class="rec">Recomendado desde<b>' + K.dinero(g.desde) + '</b></div></div></div></a>';
  }
  function tablaUnidades(us, orden, seleccion) {
    var conProv = us.some(function (u) { return u.precioProveedor !== undefined; });
    var conGan = us.some(function (u) { return u.gananciaRecomendada !== undefined; });
    function th(k, t) { return '<th><button data-act="ordenarTabla" data-k="' + k + '">' + t + (orden && orden.k === k ? (orden.d > 0 ? ' ▲' : ' ▼') : '') + '</button></th>'; }
    return '<div class="tabla-caja entra"><table class="t"><thead><tr>' + (seleccion ? '<th><span class="sr">Comparar</span></th>' : '') + th('id', 'ID') + th('nombre', 'Equipo') + th('color', 'Color') + th('bateria', 'Batería') + th('condicion', 'Condición') + th('estado', 'Estado') + th('tienda', 'Tienda') +
      (conProv ? th('precioProveedor', 'Proveedor') : '') + th('precioRecomendado', 'Recomendado') + (conGan ? th('gananciaRecomendada', 'Ganancia') : '') + th('actualizado', 'Actualizado') + '<th></th></tr></thead><tbody>' +
      us.map(function (u) {
        return '<tr>' + (seleccion ? '<td><input type="checkbox" aria-label="Comparar ' + esc(u.id) + '" data-change="comparar" data-id="' + esc(u.id) + '"' + (seleccion.indexOf(u.id) >= 0 ? ' checked' : '') + ' style="width:20px;min-height:20px;height:20px"></td>' : '') +
          '<td>' + idCopia(u.id) + '</td><td><b>' + esc(u.nombre) + '</b><br><span class="mini mut">' + esc(u.detalle) + '</span></td><td>' + esc(u.specs.color || '—') + '</td><td class="num">' + (u.specs.bateria !== undefined ? u.specs.bateria + '%' : u.specs.ciclos !== undefined ? u.specs.ciclos + ' ciclos' : '—') + '</td>' +
          '<td>' + esc(u.specs.condicion || '—') + '</td><td>' + K.estado(u.estado) + '</td><td>' + esc(u.tienda) + '</td>' + (conProv ? '<td class="num">' + K.dinero(u.precioProveedor) + '</td>' : '') + '<td class="num"><b style="color:var(--cyan2)">' + K.dinero(u.precioRecomendado) + '</b></td>' +
          (conGan ? '<td class="num" style="color:var(--ok2)">' + K.dinero(u.gananciaRecomendada) + '</td>' : '') + '<td>' + K.dia(u.actualizado) + '</td><td><a class="btn chico" href="#/unidad/' + esc(u.id) + '">Ver</a></td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  function ordenarLista(us, o) {
    if (!o) return us;
    var val = function (u) { var v = o.k in u ? u[o.k] : (u.specs || {})[o.k]; return v === undefined || v === null ? '' : v; };
    return us.slice().sort(function (a, b) { var x = val(a), y = val(b); return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'es', { numeric: true })) * o.d; });
  }
  K.descargarCSV = function (us, nombre) {
    var cols = [['id', 'Identificador'], ['tienda', 'Tienda'], ['categoria', 'Categoría'], ['marca', 'Marca'], ['modelo', 'Modelo'], ['detalle', 'Configuración'], ['color', 'Color'], ['bateria', 'Batería'], ['condicion', 'Condición'], ['estado', 'Estado'],
      ['precioProveedor', 'Precio proveedor'], ['precioRecomendado', 'Precio recomendado'], ['imei', 'IMEI'], ['serie', 'Serie'], ['ingreso', 'Ingreso'], ['actualizado', 'Actualizado']];
    cols = cols.filter(function (c) { return us.some(function (u) { return u[c[0]] !== undefined || (u.specs && u.specs[c[0]] !== undefined); }); });
    var q = function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; };
    var filas = [cols.map(function (c) { return q(c[1]); }).join(',')].concat(us.map(function (u) {
      return cols.map(function (c) { var v = u[c[0]] !== undefined ? u[c[0]] : (u.specs || {})[c[0]]; if ((c[0] === 'ingreso' || c[0] === 'actualizado') && v) v = new Date(v).toISOString(); return q(v); }).join(',');
    }));
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + filas.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = nombre + '_' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    K.toast('Archivo CSV descargado');
  };
  function comparar(ids) {
    return Promise.all(ids.map(function (id) { return api.llamar('unidad', { id: id }); })).then(function (us) {
      var filas = [['Equipo', function (u) { return '<b>' + esc(u.nombre) + '</b><br><span class="mini mut">' + esc(u.detalle) + '</span>'; }], ['ID', function (u) { return esc(u.id); }], ['Tienda', function (u) { return esc(u.tienda); }], ['Estado', function (u) { return K.estado(u.estado); }]];
      var claves = {};
      us.forEach(function (u) { specsLegibles(u.categoria, u.grupo, u.specs, true).forEach(function (s) { claves[s.l] = 1; }); });
      Object.keys(claves).forEach(function (l) { filas.push([l, function (u) { var s = specsLegibles(u.categoria, u.grupo, u.specs, true).filter(function (x) { return x.l === l; })[0]; return s ? esc(s.v) : '—'; }]); });
      if (us.some(function (u) { return u.precioProveedor !== undefined; })) filas.push(['Precio proveedor', function (u) { return K.dinero(u.precioProveedor); }]);
      filas.push(['Precio recomendado', function (u) { return '<b style="color:var(--cyan2)">' + K.dinero(u.precioRecomendado) + '</b>'; }]);
      if (us.some(function (u) { return u.gananciaRecomendada !== undefined; })) filas.push(['Ganancia', function (u) { return '<span style="color:var(--ok2)">' + K.dinero(u.gananciaRecomendada) + '</span>'; }]);
      K.modal({ titulo: 'Comparar unidades', html: '<div class="tabla-caja" style="margin-top:10px"><table class="t" style="min-width:0"><tbody>' + filas.map(function (f) {
        return '<tr><th style="position:static">' + esc(f[0]) + '</th>' + us.map(function (u) { return '<td style="white-space:normal">' + f[1](u) + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>', botones: [{ txt: 'Cerrar', valor: null }] }).then(function () { });
      var m = $('.modal'); if (m) m.style.maxWidth = '860px';
    }).catch(K.error);
  }

  /* =============================== 04 · CATÁLOGO COMERCIAL (y 03 · INVENTARIO) =============================== */
  var ESTADOS_CHIPS = [['DISPONIBLE', 'Disponibles'], ['APARTADO', 'Apartados'], ['REVISION', 'En revisión'], ['VENDIDO', 'Vendidos'], ['RETIRADO', 'Retirados']];
  function vistaListado(modo) {
    return function (ruta, v) {
      var esInv = modo === 'inventario';
      var clave = esInv ? 'filtros_inv' : 'filtros_cat';
      var F = Object.assign({ texto: '', tiendaId: '', categoria: '', estados: esInv ? ['DISPONIBLE', 'APARTADO', 'REVISION'] : ['DISPONIBLE'], capacidad: '', color: '', precioMin: '', precioMax: '', bateriaMin: '', condicion: '', desdeDias: '', orden: 'reciente', soloFavoritos: false, vista: 'rejilla' }, preferencia(clave) || {});
      if (ruta.params.q !== undefined) F.texto = ruta.params.q;
      if (ruta.params.favoritos) F.soloFavoritos = true;
      var datos = null, ordenTabla = null, seleccion = [];
      var esVendedor = K.rol() === 'VENDEDOR';
      if (esVendedor) F.estados = F.estados.filter(function (e) { return e === 'DISPONIBLE' || e === 'APARTADO'; });
      if (!F.estados.length) F.estados = ['DISPONIBLE'];

      function guardar() { var c = Object.assign({}, F); preferencia(clave, c); }
      function pedir() {
        guardar();
        var d = { texto: F.texto, tiendaId: F.tiendaId, categoria: F.categoria, estados: F.estados, capacidad: F.capacidad, color: F.color, precioMin: F.precioMin, precioMax: F.precioMax, bateriaMin: F.bateriaMin, condicion: F.condicion, orden: F.orden, soloFavoritos: F.soloFavoritos };
        if (F.desdeDias) d.actualizadoDesde = Date.now() - Number(F.desdeDias) * 864e5;
        if (esInv && K.rol() === 'PROVEEDOR' && !F.tiendaId && S.perfil.tiendas.length === 1) d.tiendaId = S.perfil.tiendas[0].id;
        return api.llamar('catalogo', d).then(function (r) { datos = r; pintar(); });
      }
      K.refrescar = function () { pedir().catch(function () { }); };
      var temporizador = null;
      K.accionesVista = {
        'input:texto': function (el) { F.texto = el.value; clearTimeout(temporizador); temporizador = setTimeout(function () { pedir().catch(K.error); }, 450); },
        'form:buscar': function (f) { F.texto = f.querySelector('input').value; pedir().catch(K.error); },
        estadoF: function (el) {
          var e = el.dataset.e;
          if (e === 'TODOS') F.estados = esVendedor ? ['DISPONIBLE', 'APARTADO'] : ESTADOS_CHIPS.map(function (x) { return x[0]; });
          else F.estados = F.estados.length === 1 && F.estados[0] === e ? F.estados : [e];
          pedir().catch(K.error);
        },
        'change:filtro': function (el) { var k = el.dataset.k; F[k] = el.type === 'checkbox' ? el.checked : el.value; pedir().catch(K.error); },
        limpiar: function () { F = Object.assign(F, { texto: '', tiendaId: '', categoria: '', capacidad: '', color: '', precioMin: '', precioMax: '', bateriaMin: '', condicion: '', desdeDias: '', soloFavoritos: false }); pedir().catch(K.error); },
        vista: function (el) { F.vista = el.dataset.v; guardar(); pintar(); },
        abrirFiltros: function () { $('#filtros').classList.add('abierto'); },
        cerrarFiltros: function () { $('#filtros').classList.remove('abierto'); },
        ordenarTabla: function (el) { ordenTabla = ordenTabla && ordenTabla.k === el.dataset.k ? { k: el.dataset.k, d: -ordenTabla.d } : { k: el.dataset.k, d: 1 }; pintar(); },
        'change:comparar': function (el) {
          var id = el.dataset.id;
          if (el.checked) { if (seleccion.length >= 3) { el.checked = false; K.toast('Puedes comparar hasta 3 unidades.', 'err'); return; } seleccion.push(id); }
          else seleccion = seleccion.filter(function (x) { return x !== id; });
          var b = $('#btn-comparar'); if (b) { b.disabled = seleccion.length < 2; b.lastChild.textContent = 'Comparar (' + seleccion.length + ')'; }
        },
        comparar: function () { comparar(seleccion); },
        csv: function () { K.descargarCSV(ordenarLista(datos.unidades, ordenTabla), esInv ? 'KAN_inventario' : 'KAN_catalogo'); },
        confirmarInv: function (el) {
          var t = el.dataset.t;
          K.confirmar('Confirmar inventario', 'Confirmas que revisaste físicamente las existencias de <b>' + esc(el.dataset.n) + '</b> y que lo que muestra KAN es correcto.', { si: 'Sí, está correcto', pose: 'confianza' })
            .then(function (si) { if (si) return api.llamar('confirmarInventario', { tiendaId: t }).then(function (r) { K.toast('Inventario confirmado (' + r.total + ' unidades)', 'ok', 'entusiasmo'); return pedir(); }); }).catch(K.error);
        }
      };
      function opciones(lista, actual, vacio) { return '<option value="">' + vacio + '</option>' + lista.map(function (o) { var val = Array.isArray(o) ? o[0] : o, txt = Array.isArray(o) ? o[1] : o; return '<option value="' + esc(val) + '"' + (String(actual) === String(val) ? ' selected' : '') + '>' + esc(txt) + '</option>'; }).join(''); }
      function pintar() {
        var r = datos, us = ordenarLista(r.unidades, ordenTabla);
        var viejas = r.tiendas.filter(function (t) { return t.desactualizado; });
        var tiendaUnica = r.tiendas.length === 1 ? r.tiendas[0] : null;
        var capacidades = {}, colores = {};
        r.unidades.forEach(function (u) { if (u.grupo.capacidad) capacidades[u.grupo.capacidad] = 1; if (u.specs.color) colores[u.specs.color] = 1; });
        var cab = '<div class="encabezado entra"><div><div class="ceja">' + (esInv ? (K.rol() === 'ADMIN' ? 'Todas las tiendas' : 'Mi tienda') : 'Catálogo comercial') + '</div><h1>' + (esInv ? 'Inventario' : F.soloFavoritos ? 'Mis favoritos' : 'Equipos para vender') + '</h1>' +
          '<p class="mut">' + r.unidades.length + ' unidad' + (r.unidades.length === 1 ? '' : 'es') + ' · ' + r.grupos.length + ' modelo' + (r.grupos.length === 1 ? '' : 's') + (tiendaUnica ? ' · ' + esc(tiendaUnica.nombre) : '') + '</p></div>' +
          '<div class="fila">' + (esInv && K.puede('inventario.crear') ? '<a class="btn p" href="#/registro">' + ic('mas') + 'Registrar equipos</a>' : '') +
          '<button class="btn chico solo-movil" data-act="abrirFiltros" style="min-height:44px">' + ic('filtro') + 'Filtros</button>' +
          '<div class="chips" role="group" aria-label="Vista"><button class="chip-f' + (F.vista === 'rejilla' ? ' on' : '') + '" data-act="vista" data-v="rejilla" aria-label="Ver modelos">' + ic('rejilla') + '<span class="solo-escritorio">Modelos</span></button><button class="chip-f' + (F.vista === 'tabla' ? ' on' : '') + '" data-act="vista" data-v="tabla" aria-label="Ver tabla">' + ic('tabla') + '<span class="solo-escritorio">Tabla</span></button></div></div></div>';
        var conf = '';
        if (esInv) {
          conf = r.tiendas.filter(function (t) { return t.propia || K.rol() === 'ADMIN'; }).map(function (t) {
            return '<div class="' + (t.desactualizado ? 'aviso' : 'aviso info') + ' entra" style="margin-bottom:10px">' + ic(t.desactualizado ? 'reloj' : 'check') + '<span style="flex:1"><b>' + esc(t.nombre) + '</b> · inventario confirmado ' + (t.ultimaConfirmacion ? K.hace(t.ultimaConfirmacion) : 'nunca') + (t.desactualizado ? '. Confírmalo para que los vendedores confíen en las existencias.' : '.') + '</span>' +
              (K.puede('inventario.confirmar') ? '<button class="btn chico" data-act="confirmarInv" data-t="' + esc(t.id) + '" data-n="' + esc(t.nombre) + '">Confirmar existencias</button>' : '') + '</div>';
          }).join('');
        } else if (viejas.length) {
          conf = '<div class="aviso entra" style="margin-bottom:12px">' + ic('reloj') + '<span>' + viejas.map(function (t) { return '<b>' + esc(t.nombre) + '</b>'; }).join(', ') + (viejas.length > 1 ? ' no han' : ' no ha') + ' confirmado su inventario en más de 7 días. Pide confirmación antes de cerrar una venta.</span></div>';
        }
        var interp = r.interpretacion && r.interpretacion.length ? '<div class="interpretacion entra" style="margin-bottom:12px"><img src="' + K.pose('inteligencia') + '" alt=""><span class="peq">Entendí:</span>' + r.interpretacion.map(function (t) { return '<span class="etiqueta cian">' + esc(t) + '</span>'; }).join('') + '</div>' : '';
        var estadosVisibles = esVendedor ? ESTADOS_CHIPS.slice(0, 2) : ESTADOS_CHIPS;
        var filtros = '<aside class="filtros" id="filtros" aria-label="Filtros"><div class="panel"><div class="entre"><h2>Filtros</h2><button class="btn-icono cerrar-filtros" data-act="cerrarFiltros" aria-label="Cerrar filtros">' + ic('x') + '</button></div>' +
          '<form data-form="buscar" role="search"><label class="campo">Buscar<input type="search" data-input="texto" value="' + esc(F.texto) + '" placeholder="iPhone 13 128 GB batería mayor a 85%"></label></form>' +
          (r.tiendas.length > 1 ? '<label class="campo">Tienda<select data-change="filtro" data-k="tiendaId">' + opciones(r.tiendas.map(function (t) { return [t.id, t.nombre]; }), F.tiendaId, 'Todas') + '</select></label>' : '') +
          '<label class="campo">Categoría<select data-change="filtro" data-k="categoria">' + opciones(Object.keys(S.meta.categorias), F.categoria, 'Todas') + '</select></label>' +
          '<label class="campo">Capacidad<select data-change="filtro" data-k="capacidad">' + opciones(Object.keys(capacidades).sort(), F.capacidad, 'Cualquiera') + '</select></label>' +
          '<label class="campo">Color<select data-change="filtro" data-k="color">' + opciones(Object.keys(colores).sort(), F.color, 'Cualquiera') + '</select></label>' +
          '<div class="dos" style="gap:10px"><label class="campo">Precio mínimo<input type="number" inputmode="numeric" min="0" data-change="filtro" data-k="precioMin" value="' + esc(F.precioMin) + '"></label><label class="campo">Precio máximo<input type="number" inputmode="numeric" min="0" data-change="filtro" data-k="precioMax" value="' + esc(F.precioMax) + '"></label></div>' +
          '<label class="campo">Batería mínima<select data-change="filtro" data-k="bateriaMin">' + opciones([[80, '80% o más'], [85, '85% o más'], [90, '90% o más'], [95, '95% o más']], F.bateriaMin, 'Cualquiera') + '</select></label>' +
          '<label class="campo">Condición estética<select data-change="filtro" data-k="condicion">' + opciones(['Como nuevo', 'Excelente', 'Muy buena', 'Buena', 'Regular'], F.condicion, 'Cualquiera') + '</select></label>' +
          '<label class="campo">Actualizado<select data-change="filtro" data-k="desdeDias">' + opciones([[1, 'Últimas 24 horas'], [7, 'Últimos 7 días'], [30, 'Últimos 30 días']], F.desdeDias, 'Cualquier fecha') + '</select></label>' +
          '<label class="campo">Ordenar por<select data-change="filtro" data-k="orden">' + opciones([['reciente', 'Actualización reciente'], ['ingreso', 'Fecha de ingreso'], ['precioAsc', 'Precio: menor a mayor'], ['precioDesc', 'Precio: mayor a menor'], ['bateria', 'Mayor batería']], F.orden, 'Actualización reciente') + '</select></label>' +
          (K.puede('favoritos') ? '<label class="check"><input type="checkbox" data-change="filtro" data-k="soloFavoritos"' + (F.soloFavoritos ? ' checked' : '') + '>Solo mis favoritos</label>' : '') +
          '<button class="btn fant" data-act="limpiar">Limpiar filtros</button><button class="btn p solo-movil" data-act="cerrarFiltros">Ver ' + r.unidades.length + ' resultados</button></div></aside>';
        var chips = '<div class="chips entra" style="margin-bottom:14px">' + estadosVisibles.map(function (e) { return '<button class="chip-f' + (F.estados.length === 1 && F.estados[0] === e[0] ? ' on' : '') + '" data-act="estadoF" data-e="' + e[0] + '">' + e[1] + '</button>'; }).join('') +
          '<button class="chip-f' + (F.estados.length > 1 ? ' on' : '') + '" data-act="estadoF" data-e="TODOS">Todos</button></div>';
        var cuerpo;
        if (!r.unidades.length) {
          cuerpo = K.vacio('pensamiento', 'No encontré equipos con esos criterios', 'Prueba con otra búsqueda o quita algún filtro.', '<button class="btn" data-act="limpiar">Quitar filtros</button>');
        } else if (F.vista === 'tabla') {
          cuerpo = '<div class="entre" style="margin-bottom:10px"><span class="mini mut">Toca un encabezado para ordenar. Marca hasta 3 para comparar.</span><div class="fila"><button class="btn chico" id="btn-comparar" data-act="comparar"' + (seleccion.length < 2 ? ' disabled' : '') + '>' + ic('comparar') + '<span>Comparar (' + seleccion.length + ')</span></button><button class="btn chico" data-act="csv">' + ic('descargar') + 'Exportar CSV</button></div></div>' + tablaUnidades(us, ordenTabla, seleccion);
        } else {
          cuerpo = '<div class="rejilla">' + r.grupos.map(tarjetaModelo).join('') + '</div>';
        }
        v.innerHTML = cab + conf + '<div class="catalogo">' + filtros + '<section>' + chips + interp + cuerpo + '</section></div>';
        K.hidratarFotos(v);
      }
      return pedir();
    };
  }
  V.catalogo = vistaListado('catalogo');
  V.inventario = vistaListado('inventario');

  /* =============================== 05 · GRUPO Y UNIDADES =============================== */
  V.grupo = function (ruta, v) {
    var filtro = 'ACTIVAS', sel = [];
    function cargar() {
      return api.llamar('grupo', { id: ruta.id }).then(function (r) {
        var g = r.grupo, c = r.conteo;
        var lista = r.unidades.filter(function (u) { return filtro === 'TODAS' || (filtro === 'ACTIVAS' ? ['DISPONIBLE', 'APARTADO', 'REVISION'].indexOf(u.estado) >= 0 : u.estado === filtro); });
        var campos = specsLegibles(g.categoria, g.config, {}, true);
        var portada = (r.unidades.filter(function (u) { return u.fotos.length; })[0] || {}).fotos;
        v.innerHTML = '<a href="#/' + (K.rol() === 'VENDEDOR' ? 'catalogo' : 'inventario') + '" class="btn fant chico" style="margin-bottom:12px">' + ic('izq') + 'Volver</a>' +
          '<div class="tarjeta entra" style="display:grid;gap:16px;grid-template-columns:minmax(0,1fr)"><div class="fila" style="align-items:flex-start;gap:16px"><div class="foto" style="width:110px;height:110px;border-radius:16px;flex:none">' + K.foto(portada && portada[0], g.categoria, 'mini', g.nombre) + '</div>' +
          '<div style="flex:1;min-width:220px"><div class="ceja">' + esc(g.categoria) + ' · ' + esc(g.tienda) + '</div><h1 style="margin-top:6px">' + esc(g.nombre) + '</h1><div class="fila" style="margin-top:8px">' + campos.map(function (x) { return '<span class="etiqueta">' + esc(x.l) + ': ' + esc(x.v) + '</span>'; }).join('') + '</div></div>' +
          (g.editable ? '<div class="fila"><a class="btn p" href="#/registro?grupo=' + esc(g.id) + (r.unidades.length ? '&desde=' + esc(r.unidades[r.unidades.length - 1].id) : '') + '">' + ic('mas') + 'Agregar otra unidad igual</a><button class="btn" data-act="editarGrupo">' + ic('editar') + 'Editar modelo</button></div>' : '') + '</div>' +
          '<div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(110px,1fr))">' + [['DISPONIBLE', 'Disponibles', 'var(--ok2)'], ['APARTADO', 'Apartadas', 'var(--hold)'], ['REVISION', 'En revisión', 'var(--review)']].concat(K.rol() === 'VENDEDOR' ? [] : [['VENDIDO', 'Vendidas', 'var(--sold)'], ['RETIRADO', 'Retiradas', 'var(--gone)']]).map(function (k) {
            return '<div class="kpi" style="min-height:76px"><b style="color:' + k[2] + ';font-size:24px" data-contar="' + c[k[0]] + '">0</b><span>' + k[1] + '</span></div>';
          }).join('') + '</div><p class="mini mut" style="margin:0">Los contadores se calculan automáticamente a partir de cada unidad registrada.</p></div>' +
          '<div class="entre" style="margin:20px 0 12px"><h2>Unidades</h2><div class="fila"><div class="chips">' + [['ACTIVAS', 'Activas'], ['DISPONIBLE', 'Disponibles'], ['APARTADO', 'Apartadas']].concat(K.rol() === 'VENDEDOR' ? [] : [['VENDIDO', 'Vendidas'], ['RETIRADO', 'Retiradas']]).concat([['TODAS', 'Todas']]).map(function (f) {
            return '<button class="chip-f' + (filtro === f[0] ? ' on' : '') + '" data-act="filtroG" data-f="' + f[0] + '">' + f[1] + '</button>';
          }).join('') + '</div><button class="btn chico" data-act="compararG"' + (sel.length < 2 ? ' disabled' : '') + '>' + ic('comparar') + 'Comparar (' + sel.length + ')</button></div></div>' +
          (lista.length ? '<div class="pila">' + lista.map(function (u, i) {
            return '<article class="unidad entra"' + delay(i) + '><a class="foto" href="#/unidad/' + esc(u.id) + '" aria-label="Abrir ' + esc(u.id) + '">' + K.foto(u.fotos[0], u.categoria, 'mini') + '</a>' +
              '<div style="min-width:0"><div class="fila" style="gap:8px">' + idCopia(u.id) + K.estado(u.estado) + (u.estado === 'APARTADO' && u.apartadoHasta ? '<span class="mini mut">vence ' + K.hace(u.apartadoHasta) + '</span>' : '') + '</div>' +
              '<div style="margin-top:6px;font-weight:650">' + resumenUnidad(u) + '</div>' +
              '<div class="fila mini mut" style="margin-top:4px;gap:14px">' + (u.precioProveedor !== undefined ? '<span>Proveedor <b style="color:var(--ink)">' + K.dinero(u.precioProveedor) + '</b></span>' : '') + '<span>Recomendado <b style="color:var(--cyan2)">' + K.dinero(u.precioRecomendado) + '</b></span>' + (u.gananciaRecomendada !== undefined ? '<span>Ganancia <b style="color:var(--ok2)">' + K.dinero(u.gananciaRecomendada) + '</b></span>' : '') + '<span>' + u.fotos.length + ' foto' + (u.fotos.length === 1 ? '' : 's') + '</span></div></div>' +
              '<div class="acciones-u"><label class="check mini"><input type="checkbox" data-change="selG" data-id="' + esc(u.id) + '"' + (sel.indexOf(u.id) >= 0 ? ' checked' : '') + '>Comparar</label>' +
              (K.puede('favoritos') ? '<button class="btn-icono" data-act="fav" data-id="' + esc(u.id) + '" data-on="' + (u.favorito ? 1 : 0) + '" aria-pressed="' + !!u.favorito + '" aria-label="' + (u.favorito ? 'Quitar de favoritos' : 'Agregar a favoritos') + '" style="color:' + (u.favorito ? 'var(--hold)' : 'inherit') + '">' + ic('estrella') + '</button>' : '') +
              '<a class="btn chico p" href="#/unidad/' + esc(u.id) + '">Ver ficha</a></div></article>';
          }).join('') + '</div>' : K.vacio('pensamiento', 'Sin unidades en este filtro', ''));
        contar(v); K.hidratarFotos(v);
        K.accionesVista.editarGrupo = function () {
          var def = S.meta.categorias[g.categoria].grupo;
          K.modal({ titulo: 'Editar modelo', html: '<p class="mut peq">Afecta a todas las unidades de este modelo.</p><div class="form"><label class="campo">Marca<input id="eg-marca" value="' + esc(g.marca) + '"></label><label class="campo">Modelo<input id="eg-modelo" value="' + esc(g.modelo) + '"></label>' +
            def.map(function (cdef) { return campoHtml(cdef, g.config[cdef.k], 'eg-'); }).join('') + '</div>',
            botones: [{ txt: 'Cancelar', valor: null }, { txt: 'Guardar', clase: 'p', valor: function (cx) { var gr = {}; def.forEach(function (d) { var e = $('#eg-' + d.k, cx); if (e) gr[d.k] = e.value; }); return { id: g.id, marca: $('#eg-marca', cx).value, modelo: $('#eg-modelo', cx).value, grupo: gr }; } }] })
            .then(function (d) { if (d) return api.llamar('editarGrupo', d).then(function () { K.toast('Modelo actualizado'); cargar(); }); }).catch(K.error);
        };
      });
    }
    K.refrescar = function () { cargar().catch(function () { }); };
    K.accionesVista = {
      filtroG: function (el) { filtro = el.dataset.f; cargar().catch(K.error); },
      'change:selG': function (el) {
        if (el.checked) { if (sel.length >= 3) { el.checked = false; K.toast('Puedes comparar hasta 3 unidades.', 'err'); return; } sel.push(el.dataset.id); } else sel = sel.filter(function (x) { return x !== el.dataset.id; });
        var b = $('[data-act=compararG]'); if (b) { b.disabled = sel.length < 2; b.lastChild.textContent = 'Comparar (' + sel.length + ')'; }
      },
      compararG: function () { comparar(sel); },
      fav: function (el) { var on = el.dataset.on !== '1'; api.llamar('favorito', { unidadId: el.dataset.id, activo: on }).then(function () { K.toast(on ? 'Agregado a favoritos: te avisaremos si cambia su disponibilidad' : 'Quitado de favoritos', 'ok', on ? 'carino' : 'confianza'); cargar(); }).catch(K.error); }
    };
    return cargar();
  };

  /* =============================== 07 · FICHA COMERCIAL (y detalle interno) =============================== */
  var ACCION_ESTADO = { DISPONIBLE: ['Marcar disponible', 'p'], APARTADO: ['Apartar', ''], REVISION: ['Enviar a revisión', ''], VENDIDO: ['Marcar vendido', 'neon'], RETIRADO: ['Retirar del catálogo', 'peligro'] };
  V.unidad = function (ruta, v) {
    var u = null, foto = 0, ficha = null;
    function cargar() {
      return api.llamar('unidad', { id: ruta.id }).then(function (r) { u = r; pintar(); });
    }
    K.refrescar = function () { if (!$('textarea#msg-wa:focus') && !$('.capa')) cargar().catch(function () { }); };
    function pintar() {
      var campos = specsLegibles(u.categoria, u.grupo, u.specs, true);
      var a = u.acciones;
      var html = '<div class="entre" style="margin-bottom:12px"><a href="#/grupo/' + esc(u.grupoId) + '" class="btn fant chico">' + ic('izq') + 'Modelo y unidades</a><div class="fila">' +
        (K.puede('favoritos') ? '<button class="btn chico" data-act="favU" aria-pressed="' + !!u.favorito + '">' + ic('estrella') + (u.favorito ? 'En favoritos' : 'Favorito') + '</button>' : '') +
        (a.editar ? '<a class="btn chico" href="#/editar/' + esc(u.id) + '">' + ic('editar') + 'Editar</a>' : '') + '</div></div>' +
        '<div class="ficha"><section class="galeria entra" aria-label="Fotografías"><div class="foto principal" ' + (u.fotos.length ? 'data-act="ampliar" role="button" tabindex="0" aria-label="Ampliar foto"' : '') + '>' + K.foto(u.fotos[foto], u.categoria, 'full', u.nombre) +
        '<div class="sobre">' + K.estado(u.estado) + '</div>' + (u.fotos.length > 1 ? '<span class="sobre-der">Foto ' + (foto + 1) + ' de ' + u.fotos.length + '</span>' : '') + '</div>' +
        (u.fotos.length > 1 ? '<div class="miniaturas">' + u.fotos.map(function (f, i) { return '<button class="' + (i === foto ? 'on' : '') + '" data-act="foto" data-i="' + i + '" aria-label="Foto ' + (i + 1) + '">' + K.foto(f, u.categoria, 'mini') + '</button>'; }).join('') + '</div>' : '') +
        (!u.fotos.length ? '<p class="mini mut" style="margin:8px 2px">Esta unidad todavía no tiene fotos.' + (a.fotos ? ' <a href="#/editar/' + esc(u.id) + '">Agregar fotos</a>' : '') + '</p>' : '') + '</section>' +
        '<section class="pila entra" style="animation-delay:.08s"><div><div class="fila" style="gap:8px">' + idCopia(u.id) + '<span class="etiqueta">' + esc(u.tienda) + '</span>' + (u.estado === 'APARTADO' ? '<span class="etiqueta aviso">' + (u.apartadoHasta ? 'Apartado · vence ' + K.hace(u.apartadoHasta) : 'Apartado sin vencimiento') + '</span>' : '') + '</div>' +
        '<h1 style="margin-top:10px">' + esc(u.nombre) + '</h1><div class="mut">' + esc(u.detalle) + '</div></div>' +
        '<div class="specs">' + campos.map(function (c) { return '<div class="spec"><span>' + esc(c.l) + '</span><b>' + esc(c.v) + '</b></div>'; }).join('') + '</div>' +
        (u.specs.detalles ? '<div class="spec"><span>Detalles</span>' + esc(u.specs.detalles) + '</div>' : '') +
        '<div class="precio-bloque">' + (u.precioProveedor !== undefined ? '<div class="p"><span>Precio del proveedor</span><b>' + K.dinero(u.precioProveedor) + '</b><span>Nunca llega al cliente</span></div>' : '') +
        '<div class="p dest"><span>Precio recomendado</span><b>' + K.dinero(u.precioRecomendado) + '</b>' + (u.gananciaRecomendada !== undefined ? '<span style="color:var(--ok2)">Ganancia sugerida ' + K.dinero(u.gananciaRecomendada) + '</span>' : '') + '</div></div>' +
        (u.editable ? '<div class="tarjeta plana privado"><div class="fila peq" style="color:var(--warn);font-weight:700">' + ic('candado') + 'Privado del proveedor</div><div class="specs" style="margin-top:10px"><div class="spec"><span>IMEI</span><b>' + esc(u.imei || '—') + '</b></div><div class="spec"><span>Número de serie</span><b>' + esc(u.serie || '—') + '</b></div></div>' + (u.notas ? '<p class="peq" style="margin:10px 0 0">' + esc(u.notas) + '</p>' : '') + '</div>'
          : '<div class="aviso info peq">' + ic('candado') + 'IMEI, número de serie y notas internas solo los ve el proveedor.</div>') +
        (function () {
          var ver = u.verificado || u.ultimaConfirmacion;
          if (u.estado === 'VENDIDO' || u.estado === 'RETIRADO') return '';
          return !ver || Date.now() - ver > 7 * 864e5
            ? '<div class="aviso peq">' + ic('reloj') + 'Disponibilidad verificada por última vez ' + (ver ? K.hace(ver) : 'nunca') + '. ' + (u.editable ? 'Confirma tu inventario para quitar esta alerta.' : 'Confirma existencia con ' + esc(u.tienda) + ' antes de vender.') + '</div>'
            : '<p class="mini mut" style="margin:0">' + ic('check') + ' Disponibilidad verificada ' + K.hace(ver) + '</p>';
        })() +
        (a.estados.length ? '<div class="tarjeta"><h2>Estado de la unidad</h2><p class="mut peq" style="margin:4px 0 12px">Cada cambio queda en el historial. Si te equivocas, puedes deshacerlo.</p><div class="fila">' + a.estados.map(function (e) {
          return '<button class="btn ' + ACCION_ESTADO[e][1] + '" data-act="estadoU" data-e="' + e + '">' + ACCION_ESTADO[e][0] + '</button>';
        }).join('') + (a.deshacer ? '<button class="btn fant" data-act="deshacer">' + ic('deshacer') + 'Deshacer último</button>' : '') + '</div></div>' : '') +
        (a.oportunidad ? calculadora() : '') +
        (a.fichas ? compartir() : (K.puede('fichas') ? '<div class="aviso peq">' + ic('candado') + 'Solo se comparten fichas de unidades disponibles.</div>' : '')) +
        (a.disponibilidad ? '<button class="btn" data-act="pedirDisp">' + ic('campana') + 'Pedir al proveedor que confirme disponibilidad</button>' : '') +
        '<details class="tarjeta plana plegable" id="historial"><summary>Historial de la unidad ' + ic('reloj') + '</summary><div id="historial-cuerpo">' + K.cargando('Cargando historial…') + '</div></details>' +
        '<p class="mini mut">Ingresó ' + K.fecha(u.ingreso) + ' · Actualizada ' + K.fecha(u.actualizado) + '</p></section></div>';
      v.innerHTML = html;
      K.hidratarFotos(v);
      var det = $('#historial');
      det.addEventListener('toggle', function () { if (det.open) cargarHistorial(); });
      if (a.oportunidad) recalcular();
    }
    function calculadora() {
      var op = u.oportunidad;
      return '<div class="tarjeta" id="calc"><div class="entre"><h2>' + ic('calc') + ' Calculadora privada</h2><span class="mini mut">Solo tú la ves</span></div><div class="dos" style="gap:10px;margin-top:12px">' +
        '<label class="campo">Precio de venta<input type="number" inputmode="numeric" min="0" id="c-venta" data-input="calc" value="' + (op ? op.precioVenta : u.precioRecomendado) + '"></label>' +
        '<label class="campo">Gastos extra (envío, funda…)<input type="number" inputmode="numeric" min="0" id="c-gastos" data-input="calc" value="' + (op ? op.gastos : 0) + '"></label></div>' +
        '<div class="metricas" style="margin-top:12px"><div><b id="c-gan">—</b><span>Ganancia</span></div><div><b id="c-mar">—</b><span>Margen</span></div><div><b id="c-roi">—</b><span>ROI</span></div></div>' +
        '<label class="campo" style="margin-top:12px">Nota<input id="c-nota" maxlength="200" value="' + esc(op ? op.nota : '') + '" placeholder="Cliente interesado, fecha de entrega…"></label>' +
        '<div class="fila" style="margin-top:12px"><button class="btn" data-act="guardarOp">' + ic('estrella') + (op ? 'Actualizar oportunidad' : 'Guardar en Mis oportunidades') + '</button><button class="btn fant" data-act="usarPrecio">Usar este precio en la ficha</button></div></div>';
    }
    function recalcular() {
      var venta = Number($('#c-venta').value) || 0, gastos = Number($('#c-gastos').value) || 0, pv = Number(u.precioProveedor) || 0;
      var gan = venta - pv - gastos;
      $('#c-gan').textContent = K.dinero(gan); $('#c-gan').style.color = gan < 0 ? 'var(--err)' : 'var(--ok2)';
      $('#c-mar').textContent = venta ? K.pct(gan / venta) : '—';
      $('#c-roi').textContent = pv + gastos ? K.pct(gan / (pv + gastos)) : '—';
    }
    function compartir() {
      return '<div class="tarjeta" id="compartir"><div class="entre"><h2>' + ic('enviar') + ' Compartir con un cliente</h2><span class="etiqueta cian">WhatsApp</span></div>' +
        '<div class="pila" style="margin-top:12px"><div class="chips"><button class="chip-f on" data-act="precioModo" data-m="rec">Precio recomendado</button><button class="chip-f" data-act="precioModo" data-m="pers">Personalizado</button></div>' +
        '<div class="dos" style="gap:10px"><label class="campo">Precio para el cliente (MXN)<input type="number" inputmode="numeric" min="1" id="p-cliente" data-input="pcli" value="' + u.precioRecomendado + '" readonly></label>' +
        '<label class="campo">El enlace vence en<select id="p-dias"><option value="1">1 día</option><option value="3">3 días</option><option value="7" selected>7 días</option><option value="15">15 días</option><option value="30">30 días</option><option value="0">Sin vencimiento</option></select></label></div>' +
        '<p class="mini mut" id="p-aviso" style="margin:0"></p>' +
        '<button class="btn neon" data-act="generarFicha">' + ic('enlace') + 'Generar enlace y mensaje</button><div id="msg-caja"></div>' +
        fichasActivas() + '</div></div>';
    }
    function fichasActivas() {
      var l = (u.fichasActivas || []).filter(function (f) { return f.activa; });
      if (!l.length) return '';
      return '<details class="plegable"><summary class="peq">Tus enlaces activos de esta unidad (' + l.length + ')</summary><div class="pila">' + l.map(function (f) {
        return '<div class="entre peq"><span>' + K.dinero(f.precio) + ' · ' + (f.expira ? 'vence ' + K.hace(f.expira) : 'sin vencimiento') + ' · ' + f.vistas + ' vista' + (f.vistas === 1 ? '' : 's') + '</span><span class="fila"><button class="btn chico" data-act="copiarEnlace" data-url="' + esc(f.url) + '">Copiar enlace</button><button class="btn chico peligro" data-act="revocar" data-t="' + esc(f.token) + '">Desactivar</button></span></div>';
      }).join('') + '</div></details>';
    }
    function cargarHistorial() {
      api.llamar('historial', { id: u.id }).then(function (h) {
        var NOM = { ALTA: 'Registro de la unidad', EDICION: 'Datos editados', ESTADO: 'Cambio de estado', VENCIMIENTO: 'Apartado vencido', REVERSION: 'Movimiento deshecho' };
        $('#historial-cuerpo').innerHTML = '<ul class="linea-tiempo">' + h.movimientos.map(function (m) {
          return '<li class="' + (m.revertido ? 'rev' : '') + '"><b>' + esc(NOM[m.tipo] || m.tipo) + '</b>' + (m.de !== m.a && m.a ? ': ' + esc(K.NOMBRE_ESTADO[m.de] || '—') + ' → ' + esc(K.NOMBRE_ESTADO[m.a]) : '') + (m.horas ? ' (' + m.horas + ' h)' : m.horas === 0 ? ' (sin vencimiento)' : '') + (m.campos ? ' · ' + esc(m.campos.join(', ')) : '') +
            '<br><span class="mini mut">' + K.fecha(m.fecha) + ' · ' + esc(m.usuario) + '</span></li>';
        }).join('') + '</ul>' + (h.precios.length ? '<h3 style="margin:14px 0 6px">Historial de precios</h3><ul class="linea-tiempo">' + h.precios.map(function (p) {
          return '<li>' + (p.campo === 'precioProveedor' ? 'Proveedor' : 'Recomendado') + ': ' + K.dinero(p.anterior) + ' → <b>' + K.dinero(p.nuevo) + '</b><br><span class="mini mut">' + K.fecha(p.fecha) + ' · ' + esc(p.usuario) + '</span></li>';
        }).join('') + '</ul>' : '');
      }).catch(function (e) { $('#historial-cuerpo').innerHTML = '<p class="mut">' + esc(e.message) + '</p>'; });
    }
    K.accionesVista = {
      foto: function (el) { foto = Number(el.dataset.i); pintar(); },
      ampliar: function () {
        var faltan = u.fotos.filter(function (f) { return !K.fotos['full:' + f]; });
        (faltan.length ? api.llamar('fotos', { ids: faltan, tamano: 'full' }).then(function (r) { Object.keys(r).forEach(function (k) { if (r[k]) K.fotos['full:' + k] = r[k]; }); }) : Promise.resolve())
          .then(function () { K.visor(u.fotos.map(function (f) { return K.fotos['full:' + f]; }).filter(Boolean), foto); });
      },
      favU: function () { var on = !u.favorito; api.llamar('favorito', { unidadId: u.id, activo: on }).then(function () { K.toast(on ? 'En favoritos: te avisaremos si vuelve a estar disponible' : 'Quitado de favoritos', 'ok', on ? 'carino' : 'confianza'); cargar(); }).catch(K.error); },
      estadoU: function (el) {
        var e = el.dataset.e;
        var textos = { VENDIDO: 'Se registra la fecha de venta y la unidad sale del catálogo de los vendedores. Su historial se conserva.', RETIRADO: 'Deja de mostrarse en el catálogo, pero conserva su información e historial.', REVISION: 'Queda fuera de las disponibles mientras se verifica.', DISPONIBLE: 'Vuelve a mostrarse como disponible.', APARTADO: 'Deja de mostrarse como disponible durante el plazo elegido. Al vencer, KAN la libera automáticamente.' };
        K.confirmar(ACCION_ESTADO[e][0] + ' · ' + u.id, textos[e], {
          si: ACCION_ESTADO[e][0], peligro: e === 'RETIRADO', pose: e === 'VENDIDO' ? 'entusiasmo' : null,
          html: (e === 'APARTADO' ? '<label class="campo" style="margin-top:12px">Vence en<select id="m-horas"><option value="24">24 horas</option><option value="48" selected>48 horas</option><option value="72">72 horas</option><option value="0">Sin vencimiento automático</option></select></label>' : '') + '<label class="campo" style="margin-top:12px">Nota (opcional)<input id="m-nota" maxlength="200"></label>',
          valor: function (c) { return { horas: $('#m-horas', c) ? Number($('#m-horas', c).value) : undefined, nota: $('#m-nota', c).value }; }
        }).then(function (d) {
          if (!d) return;
          return api.llamar('cambiarEstado', { id: u.id, version: u.version, estado: e, horas: d.horas, nota: d.nota }).then(function () {
            K.toast(e === 'VENDIDO' ? '¡Venta registrada!' : 'Estado actualizado: ' + K.NOMBRE_ESTADO[e], 'ok', e === 'VENDIDO' ? 'entusiasmo' : 'exito');
            if (e === 'VENDIDO') document.body.classList.add('celebra'), setTimeout(function () { document.body.classList.remove('celebra'); }, 1300);
            return cargar();
          });
        }).catch(function (err) { K.error(err); if (err.codigo === 'CONFLICTO') cargar(); });
      },
      deshacer: function () {
        K.confirmar('¿Deshacer el último cambio de estado?', 'La unidad vuelve a su estado anterior. Ambos movimientos quedan registrados.', { si: 'Deshacer' })
          .then(function (si) { if (si) return api.llamar('deshacer', { id: u.id }).then(function (r) { K.toast('Movimiento deshecho: ahora está ' + K.NOMBRE_ESTADO[r.estado].toLowerCase()); return cargar(); }); }).catch(K.error);
      },
      'input:calc': recalcular,
      guardarOp: function () {
        api.llamar('guardarOportunidad', { unidadId: u.id, precioVenta: $('#c-venta').value, gastos: $('#c-gastos').value, nota: $('#c-nota').value })
          .then(function () { K.toast('Guardado en Mis oportunidades', 'ok', 'entusiasmo'); return cargar(); }).catch(K.error);
      },
      usarPrecio: function () {
        var inp = $('#p-cliente'); if (!inp) return;
        inp.readOnly = false; inp.value = $('#c-venta').value;
        $$('[data-act=precioModo]').forEach(function (b) { b.classList.toggle('on', b.dataset.m === 'pers'); });
        avisoPrecio(); inp.scrollIntoView({ behavior: 'smooth', block: 'center' });
      },
      precioModo: function (el) {
        $$('[data-act=precioModo]').forEach(function (b) { b.classList.toggle('on', b === el); });
        var inp = $('#p-cliente');
        if (el.dataset.m === 'rec') { inp.value = u.precioRecomendado; inp.readOnly = true; } else { inp.readOnly = false; inp.focus(); inp.select(); }
        avisoPrecio();
      },
      generarFicha: function (el) {
        var precio = Number($('#p-cliente').value);
        if (!precio || precio < 1) { K.toast('Escribe un precio para el cliente.', 'err'); return; }
        el.disabled = true;
        api.llamar('crearFicha', { unidadId: u.id, precio: precio, dias: Number($('#p-dias').value) }).then(function (r) {
          ficha = r; el.disabled = false;
          $('#msg-caja').innerHTML = '<div class="pila entra">' + K.mascota('confianza', 'Listo. Revisa el mensaje, edítalo si quieres y ábrelo en WhatsApp.') +
            '<label class="sr" for="msg-wa">Mensaje para WhatsApp</label><div class="burbuja-wa"><textarea id="msg-wa" spellcheck="true">' + esc(r.mensaje) + '</textarea></div>' +
            '<div class="dos" style="gap:10px"><button class="btn" data-act="copiarMsg">' + ic('copiar') + 'Copiar texto</button><button class="btn neon" data-act="abrirWA">' + ic('enviar') + 'Abrir WhatsApp</button></div>' +
            '<div class="fila"><button class="btn chico" data-act="copiarEnlace" data-url="' + esc(r.url) + '">' + ic('enlace') + 'Copiar solo el enlace</button><a class="btn chico" href="' + esc(r.url) + '" target="_blank" rel="noopener">' + ic('ojo') + 'Ver como cliente</a></div>' +
            '<div class="aviso info peq">' + ic('camara') + 'WhatsApp no adjunta las fotos solo con el enlace: el cliente las verá al abrirlo. Si quieres mandarlas también como imagen, adjúntalas a mano en el chat.</div></div>';
        }).catch(function (e) { el.disabled = false; K.error(e); });
      },
      copiarMsg: function () { K.copiar($('#msg-wa').value, 'Mensaje copiado'); },
      abrirWA: function () {
        var t = $('#msg-wa').value.trim();
        if (!t) { K.toast('El mensaje está vacío.', 'err'); return; }
        var w = window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank', 'noopener');
        if (!w) location.href = 'https://wa.me/?text=' + encodeURIComponent(t);
      },
      copiarEnlace: function (el) { K.copiar(el.dataset.url, 'Enlace copiado'); },
      revocar: function (el) {
        K.confirmar('¿Desactivar este enlace?', 'Quien lo abra verá que la ficha ya no está disponible.', { si: 'Desactivar', peligro: true })
          .then(function (si) { if (si) return api.llamar('revocarFicha', { token: el.dataset.t }).then(function () { K.toast('Enlace desactivado'); return cargar(); }); }).catch(K.error);
      },
      pedirDisp: function () {
        K.confirmar('Pedir confirmación', 'Avisaremos a ' + esc(u.tienda) + ' para que confirme si ' + esc(u.id) + ' sigue disponible.', { si: 'Enviar aviso', html: '<label class="campo" style="margin-top:12px">Mensaje (opcional)<input id="m-disp" maxlength="120" placeholder="Tengo un cliente para hoy"></label>', valor: function (c) { return { nota: $('#m-disp', c).value }; } })
          .then(function (d) { if (d) return api.llamar('solicitarDisponibilidad', { unidadId: u.id, nota: d.nota }).then(function () { K.toast('Aviso enviado al proveedor', 'ok', 'confianza'); }); }).catch(K.error);
      }
    };
    function avisoPrecio() {
      var p = Number($('#p-cliente').value), aviso = $('#p-aviso');
      if (!aviso) return;
      aviso.textContent = u.precioProveedor !== undefined && p && p < u.precioProveedor ? 'Ojo: está por debajo del precio del proveedor.' : '';
      aviso.style.color = 'var(--warn)';
    }
    K.accionesVista['input:pcli'] = avisoPrecio;
    return cargar();
  };

  /* =============================== 06 · REGISTRO DE EQUIPOS (lotes) y edición =============================== */
  function campoHtml(c, valor, pref, datos) {
    var id = (pref || '') + c.k, req = c.req ? ' <em>*</em>' : '';
    var attrs = ' id="' + esc(id) + '"' + (datos || '');
    if (c.t === 'opcion') return '<label class="campo" for="' + esc(id) + '">' + esc(c.l) + req + '<select' + attrs + '><option value="">Elegir…</option>' + c.o.map(function (o) { return '<option' + (o === valor ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select></label>';
    if (c.t === 'area') return '<label class="campo todo" for="' + esc(id) + '">' + esc(c.l) + req + '<textarea' + attrs + ' maxlength="500" placeholder="' + esc(c.ph || '') + '">' + esc(valor || '') + '</textarea></label>';
    return '<label class="campo" for="' + esc(id) + '">' + esc(c.l) + req + '<input' + attrs + (c.t === 'numero' ? ' type="number" inputmode="numeric" min="' + c.min + '" max="' + c.max + '"' : ' maxlength="80"') + ' value="' + esc(valor === undefined || valor === null ? '' : valor) + '" placeholder="' + esc(c.ph || '') + '"></label>';
  }
  K.campoHtml = campoHtml;
  function comprimir(archivo) {
    return new Promise(function (ok, mal) {
      var url = URL.createObjectURL(archivo), im = new Image();
      im.onerror = function () { URL.revokeObjectURL(url); mal(new Error('No se pudo leer la imagen. Prueba con otra foto.')); };
      im.onload = function () {
        function a(max, q) { var k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', q); }
        var full = a(1280, .8); if (full.length > 1.9e6) full = a(1080, .7);
        URL.revokeObjectURL(url);
        ok({ full: full, mini: a(360, .72) });
      };
      im.src = url;
    });
  }
  K.comprimir = comprimir;

  V.registro = function (ruta, v) {
    var tiendas = S.perfil.tiendas.filter(function (t) { return K.rol() === 'ADMIN' || t.propia; });
    if (!tiendas.length) { v.innerHTML = K.vacio('pensamiento', 'No tienes una tienda activa', 'Pide al administrador que active tu tienda.'); return; }
    var CATS = S.meta.categorias;
    var R = { tiendaId: tiendas[0].id, categoria: 'Celulares', marca: '', modelo: '', grupo: {}, unidades: [nuevaU()], fijo: false };
    function nuevaU(base) { return { specs: base ? Object.assign({}, base.specs) : {}, precioProveedor: base ? base.precioProveedor : '', precioRecomendado: base ? base.precioRecomendado : '', imei: '', serie: '', notas: '', fotos: [] }; }

    function borrador(guardar) {
      if (guardar === undefined) return preferencia('borrador_registro');
      if (guardar === null) { try { localStorage.removeItem('kan_v7_borrador_registro'); } catch (e) { } return; }
      var copia = JSON.parse(JSON.stringify(R)); copia.unidades.forEach(function (x) { x.fotos = []; });
      preferencia('borrador_registro', copia);
    }

    function pintar() {
      var def = CATS[R.categoria];
      var html = '<div class="encabezado entra"><div><div class="ceja">' + (R.fijo ? 'Otra unidad del mismo modelo' : 'Registro de equipos') + '</div><h1>' + (R.fijo ? esc(R.marca + ' ' + R.modelo) : 'Registrar equipos') + '</h1><p class="mut">Cada equipo físico es una unidad con su propio identificador, fotos, precios y estado.</p></div>' +
        K.mascota('inteligencia', 'Llena los datos del modelo una vez; después solo lo que cambia en cada equipo.', 'solo-escritorio') + '</div>' +
        '<div class="tarjeta entra" style="margin-bottom:16px"><div class="fila" style="margin-bottom:14px"><span class="paso">1</span><h2>Modelo</h2></div><div class="form dos-col">' +
        (tiendas.length > 1 ? '<label class="campo">Tienda<select data-change="r" data-k="tiendaId"' + (R.fijo ? ' disabled' : '') + '>' + tiendas.map(function (t) { return '<option value="' + esc(t.id) + '"' + (t.id === R.tiendaId ? ' selected' : '') + '>' + esc(t.nombre) + '</option>'; }).join('') + '</select></label>' : '') +
        '<div class="campo todo"><span>Categoría</span><div class="chips">' + Object.keys(CATS).map(function (c) { return '<button type="button" class="chip-f' + (c === R.categoria ? ' on' : '') + '" data-act="rCat" data-c="' + c + '"' + (R.fijo ? ' disabled' : '') + '>' + ic(K.icCategoria(c)) + c + '</button>'; }).join('') + '</div></div>' +
        '<label class="campo">Marca <em>*</em><input data-input="r" data-k="marca" value="' + esc(R.marca) + '" placeholder="Apple" maxlength="40"' + (R.fijo ? ' readonly' : '') + '></label>' +
        '<label class="campo">Modelo <em>*</em><input data-input="r" data-k="modelo" value="' + esc(R.modelo) + '" placeholder="iPhone 13" maxlength="60"' + (R.fijo ? ' readonly' : '') + '></label>' +
        def.grupo.map(function (c) { return campoHtml(c, R.grupo[c.k], 'g-', ' data-input="rg" data-change="rg" data-k="' + c.k + '"' + (R.fijo ? ' disabled' : '')); }).join('') + '</div></div>' +
        '<div class="tarjeta entra" style="margin-bottom:16px;animation-delay:.06s"><div class="entre"><div class="fila"><span class="paso">2</span><h2>¿Cuántos equipos de este modelo?</h2></div>' +
        '<div class="contador"><button type="button" data-act="cant" data-d="-1" aria-label="Uno menos">−</button><output aria-live="polite">' + R.unidades.length + '</output><button type="button" data-act="cant" data-d="1" aria-label="Uno más">+</button></div></div>' +
        '<p class="mini mut" style="margin:8px 0 0">Se crearán ' + R.unidades.length + ' registro' + (R.unidades.length > 1 ? 's' : '') + ' independientes (máximo ' + S.meta.maxLote + ').</p></div>' +
        R.unidades.map(function (x, i) {
          return '<div class="unidad-form entra" style="margin-bottom:14px;animation-delay:' + (.1 + i * .03).toFixed(2) + 's"><div class="entre" style="margin-bottom:12px"><div class="fila"><span class="paso">' + (i + 1) + '</span><h3>Unidad ' + (i + 1) + '</h3></div>' +
            (i === 0 && R.unidades.length > 1 ? '<button type="button" class="btn chico" data-act="copiarATodas">' + ic('copiar') + 'Copiar condición y precios a todas</button>' : '') +
            (R.unidades.length > 1 ? '<button type="button" class="btn chico fant" data-act="quitarU" data-i="' + i + '" aria-label="Quitar unidad ' + (i + 1) + '">' + ic('basura') + '</button>' : '') + '</div>' +
            '<div class="form dos-col">' + def.unidad.map(function (c) { return campoHtml(c, x.specs[c.k], 'u' + i + '-', ' data-input="ru" data-change="ru" data-i="' + i + '" data-k="' + c.k + '"'); }).join('') +
            '<label class="campo">Precio del proveedor (MXN) <em>*</em><input type="number" inputmode="numeric" min="0" data-input="ruP" data-i="' + i + '" data-k="precioProveedor" value="' + esc(x.precioProveedor) + '"></label>' +
            '<label class="campo">Precio recomendado (MXN) <em>*</em><input type="number" inputmode="numeric" min="0" data-input="ruP" data-i="' + i + '" data-k="precioRecomendado" value="' + esc(x.precioRecomendado) + '"></label>' +
            '<details class="plegable todo"><summary class="peq">' + ic('candado') + ' Datos privados: IMEI, serie y notas (opcional)</summary><div class="form dos-col">' +
            '<label class="campo">IMEI<input inputmode="numeric" maxlength="17" data-input="ruP" data-i="' + i + '" data-k="imei" value="' + esc(x.imei) + '"></label><label class="campo">Número de serie<input maxlength="40" data-input="ruP" data-i="' + i + '" data-k="serie" value="' + esc(x.serie) + '"></label>' +
            '<label class="campo todo">Notas internas<textarea maxlength="500" data-input="ruP" data-i="' + i + '" data-k="notas">' + esc(x.notas) + '</textarea></label></div></details>' +
            '<div class="todo"><div class="campo" style="margin-bottom:6px"><span>Fotos de esta unidad (hasta ' + S.meta.maxFotos + '). La primera es la principal.</span></div><div class="fotos-edit">' + x.fotos.map(function (f, j) {
              return '<div class="f"><img src="' + f.mini + '" alt="Foto ' + (j + 1) + '">' + (j === 0 ? '<span class="principal-tag">Principal</span>' : '') + '<div class="ctrl">' + (j ? '<button type="button" data-act="fPrin" data-i="' + i + '" data-j="' + j + '" aria-label="Hacer principal">' + ic('estrella') + '</button>' : '') + '<button type="button" data-act="fQuitar" data-i="' + i + '" data-j="' + j + '" aria-label="Quitar foto">' + ic('x') + '</button></div></div>';
            }).join('') + (x.fotos.length < S.meta.maxFotos ? '<button type="button" class="agregar" data-act="fAgregar" data-i="' + i + '">' + ic('camara') + 'Agregar</button>' : '') + '</div></div></div></div>';
        }).join('') +
        '<div class="tarjeta entra barra-guardar" style="animation-delay:.15s"><div class="entre"><span class="peq mut">Se guarda un borrador en este dispositivo mientras escribes (sin fotos).</span><div class="fila"><button type="button" class="btn fant" data-act="descartar">Descartar</button><button type="button" class="btn p" data-act="guardarLote">' + ic('check') + 'Registrar ' + R.unidades.length + ' unidad' + (R.unidades.length > 1 ? 'es' : '') + '</button></div></div></div>' +
        '<input type="file" id="r-archivo" accept="image/*" multiple hidden data-change="rArchivo">';
      v.innerHTML = html;
    }
    var unidadFoto = 0;
    K.accionesVista = {
      'change:r': function (el) { R[el.dataset.k] = el.value; borrador(true); K.sucio = true; },
      'input:r': function (el) { R[el.dataset.k] = el.value; borrador(true); K.sucio = true; },
      'input:rg': function (el) { R.grupo[el.dataset.k] = el.value; borrador(true); K.sucio = true; },
      'change:rg': function (el) { R.grupo[el.dataset.k] = el.value; borrador(true); },
      'input:ru': function (el) { R.unidades[el.dataset.i].specs[el.dataset.k] = el.value; borrador(true); K.sucio = true; },
      'change:ru': function (el) { R.unidades[el.dataset.i].specs[el.dataset.k] = el.value; borrador(true); },
      'input:ruP': function (el) { R.unidades[el.dataset.i][el.dataset.k] = el.value; borrador(true); K.sucio = true; },
      rCat: function (el) { R.categoria = el.dataset.c; R.grupo = {}; R.unidades.forEach(function (x) { x.specs = {}; }); pintar(); },
      cant: function (el) {
        var n = R.unidades.length + Number(el.dataset.d);
        if (n < 1 || n > S.meta.maxLote) return;
        if (n > R.unidades.length) R.unidades.push(nuevaU(R.unidades[0].precioRecomendado ? { specs: { condicion: R.unidades[0].specs.condicion }, precioProveedor: R.unidades[0].precioProveedor, precioRecomendado: R.unidades[0].precioRecomendado } : null));
        else { var u = R.unidades[R.unidades.length - 1]; if ((u.fotos.length || u.specs.color) && !confirm('La última unidad tiene datos. ¿Quitarla?')) return; R.unidades.pop(); }
        pintar();
      },
      quitarU: function (el) { R.unidades.splice(Number(el.dataset.i), 1); pintar(); },
      copiarATodas: function () {
        var b = R.unidades[0], claves = CATS[R.categoria].unidad.map(function (c) { return c.k; }).filter(function (k) { return ['color', 'bateria', 'ciclos', 'detalles'].indexOf(k) < 0; });
        R.unidades.slice(1).forEach(function (x) { claves.forEach(function (k) { if (b.specs[k] !== undefined) x.specs[k] = b.specs[k]; }); x.precioProveedor = b.precioProveedor; x.precioRecomendado = b.precioRecomendado; });
        pintar(); K.toast('Copiado. Ahora ajusta color, batería y detalles de cada una.', 'ok', 'inteligencia');
      },
      fAgregar: function (el) { unidadFoto = Number(el.dataset.i); $('#r-archivo').click(); },
      fQuitar: function (el) { R.unidades[el.dataset.i].fotos.splice(Number(el.dataset.j), 1); pintar(); },
      fPrin: function (el) { var f = R.unidades[el.dataset.i].fotos; f.unshift(f.splice(Number(el.dataset.j), 1)[0]); pintar(); },
      descartar: function () { K.confirmar('¿Descartar el registro?', 'Se borra lo que escribiste.', { si: 'Descartar', peligro: true }).then(function (si) { if (si) { borrador(null); K.sucio = false; K.ir('/' + K.inicioRol()); } }); },
      guardarLote: guardar
    };
    K.accionesVista['change:rArchivo'] = function (el, e) {
      var u = R.unidades[unidadFoto], archivos = Array.prototype.slice.call(e.target.files).slice(0, S.meta.maxFotos - u.fotos.length);
      if (e.target.files.length > archivos.length) K.toast('Cada unidad admite hasta ' + S.meta.maxFotos + ' fotos.', 'err');
      archivos.reduce(function (p, f) { return p.then(function () { return comprimir(f).then(function (r) { u.fotos.push(r); }); }); }, Promise.resolve())
        .catch(K.error).then(function () { e.target.value = ''; pintar(); });
    };
    function guardar(el) {
      var def = CATS[R.categoria], faltan = [];
      if (!R.marca.trim()) faltan.push('marca'); if (!R.modelo.trim()) faltan.push('modelo');
      def.grupo.forEach(function (c) { if (c.req && !String(R.grupo[c.k] || '').trim()) faltan.push(c.l.toLowerCase()); });
      R.unidades.forEach(function (x, i) {
        def.unidad.forEach(function (c) { if (c.req && !String(x.specs[c.k] || '').trim()) faltan.push(c.l.toLowerCase() + ' (unidad ' + (i + 1) + ')'); });
        if (x.precioProveedor === '' || x.precioRecomendado === '') faltan.push('precios (unidad ' + (i + 1) + ')');
      });
      if (faltan.length) { K.toast('Falta: ' + faltan.slice(0, 4).join(', ') + (faltan.length > 4 ? '…' : ''), 'err'); return; }
      el.disabled = true;
      var datos = { tiendaId: R.tiendaId, categoria: R.categoria, marca: R.marca, modelo: R.modelo, grupo: R.grupo, unidades: R.unidades.map(function (x) { return { specs: x.specs, precioProveedor: x.precioProveedor, precioRecomendado: x.precioRecomendado, imei: x.imei, serie: x.serie, notas: x.notas }; }) };
      var totalFotos = R.unidades.reduce(function (a, x) { return a + x.fotos.length; }, 0), hechas = 0, fallas = [];
      v.innerHTML = '<div class="vacio">' + K.mascota('trabajo', 'Registrando ' + R.unidades.length + ' unidad' + (R.unidades.length > 1 ? 'es' : '') + '…', 'vertical') + '<p class="mut" id="progreso"></p></div>';
      api.llamar('registrarLote', datos).then(function (r) {
        borrador(null); K.sucio = false;
        return R.unidades.reduce(function (p, x, i) {
          return p.then(function () {
            return x.fotos.reduce(function (q, f) {
              return q.then(function () {
                $('#progreso').textContent = 'Subiendo foto ' + (++hechas) + ' de ' + totalFotos + '…';
                return api.llamar('subirFoto', { unidadId: r.unidades[i], full: f.full, mini: f.mini }).catch(function () { fallas.push(r.unidades[i]); });
              });
            }, Promise.resolve());
          });
        }, Promise.resolve()).then(function () { exito(r, fallas); });
      }).catch(function (e) { K.error(e); pintar(); });
    }
    function exito(r, fallas) {
      K.sonido('exito');
      v.innerHTML = '<div class="vacio celebra">' + K.mascota('entusiasmo', '<b>¡Listo!</b> Registraste ' + r.unidades.length + ' unidad' + (r.unidades.length > 1 ? 'es' : '') + ' de ' + esc(R.marca + ' ' + R.modelo) + '.', 'vertical') +
        '<div class="fila" style="justify-content:center">' + r.unidades.map(function (id) { return idCopia(id); }).join('') + '</div>' +
        (fallas.length ? '<div class="aviso peligro">' + ic('camara') + 'Algunas fotos no se subieron (' + Array.from(new Set(fallas)).join(', ') + '). Puedes agregarlas desde «Editar».</div>' : '') +
        '<div class="fila" style="justify-content:center;margin-top:8px"><a class="btn p" href="#/registro?grupo=' + esc(r.grupoId) + '&desde=' + esc(r.unidades[r.unidades.length - 1]) + '">' + ic('mas') + 'Agregar otra unidad igual</a><a class="btn" href="#/grupo/' + esc(r.grupoId) + '">Ver modelo y unidades</a><button class="btn fant" data-act="otroRegistro">Registrar otro modelo</button></div></div>';
      K.accionesVista.otroRegistro = function () { K.ir('/registro?nuevo=' + Date.now()); };
    }
    // Agregar otra unidad igual: copia SOLO los datos generales del modelo (y precios como sugerencia).
    if (ruta.params.grupo) {
      return Promise.all([api.llamar('grupo', { id: ruta.params.grupo }), ruta.params.desde ? api.llamar('unidad', { id: ruta.params.desde }).catch(function () { return null; }) : null]).then(function (r) {
        var g = r[0].grupo, base = r[1];
        if (!g.editable) throw new Error('Solo el proveedor de esta tienda puede agregar unidades.');
        R = { tiendaId: g.tiendaId, categoria: g.categoria, marca: g.marca, modelo: g.modelo, grupo: Object.assign({}, g.config), fijo: true,
          unidades: [nuevaU(base ? { specs: { condicion: base.specs.condicion }, precioProveedor: base.precioProveedor, precioRecomendado: base.precioRecomendado } : null)] };
        pintar();
      });
    }
    var b = borrador();
    if (b && b.marca && !ruta.params.nuevo) {
      return K.confirmar('Tienes un registro sin terminar', 'Empezaste a registrar <b>' + esc(b.marca + ' ' + b.modelo) + '</b>. ¿Quieres continuarlo? (Las fotos no se guardan en el borrador.)', { si: 'Continuar', pose: 'pensamiento' })
        .then(function (si) { if (si) R = b; else borrador(null); pintar(); });
    }
    pintar();
  };

  V.editar = function (ruta, v) {
    var u;
    function cargar() { return api.llamar('unidad', { id: ruta.id }).then(function (r) { u = r; if (!u.acciones.editar) throw new Error('Solo el proveedor de esta tienda puede editar esta unidad.'); pintar(); }); }
    function pintar() {
      var def = S.meta.categorias[u.categoria];
      v.innerHTML = '<a href="#/unidad/' + esc(u.id) + '" class="btn fant chico" style="margin-bottom:12px">' + ic('izq') + 'Volver a la ficha</a>' +
        '<div class="encabezado"><div><div class="ceja">Editar unidad</div><h1>' + esc(u.nombre) + '</h1><div class="fila" style="margin-top:6px">' + idCopia(u.id) + K.estado(u.estado) + '</div></div></div>' +
        '<form class="tarjeta" data-form="editar" data-input="eSucio"><div class="form dos-col">' + def.unidad.map(function (c) { return campoHtml(c, u.specs[c.k], 'e-'); }).join('') +
        '<label class="campo">Precio del proveedor (MXN) <em>*</em><input type="number" inputmode="numeric" min="0" id="e-precioProveedor" value="' + esc(u.precioProveedor) + '"></label>' +
        '<label class="campo">Precio recomendado (MXN) <em>*</em><input type="number" inputmode="numeric" min="0" id="e-precioRecomendado" value="' + esc(u.precioRecomendado) + '"></label>' +
        '<label class="campo">IMEI (privado)<input id="e-imei" inputmode="numeric" maxlength="17" value="' + esc(u.imei) + '"></label><label class="campo">Número de serie (privado)<input id="e-serie" maxlength="40" value="' + esc(u.serie) + '"></label>' +
        '<label class="campo todo">Notas internas (privadas)<textarea id="e-notas" maxlength="500">' + esc(u.notas) + '</textarea></label></div>' +
        '<div class="fila" style="margin-top:16px;justify-content:flex-end"><a class="btn fant" href="#/unidad/' + esc(u.id) + '">Cancelar</a><button class="btn p" type="submit">' + ic('check') + 'Guardar cambios</button></div></form>' +
        '<div class="tarjeta" style="margin-top:16px"><div class="entre"><h2>Fotografías</h2><span class="mini mut">' + u.fotos.length + ' de ' + S.meta.maxFotos + ' · los cambios se guardan al instante</span></div><div class="fotos-edit" style="margin-top:12px">' +
        u.fotos.map(function (f, j) {
          return '<div class="f">' + K.foto(f, u.categoria, 'mini') + (j === 0 ? '<span class="principal-tag">Principal</span>' : '') + '<div class="ctrl">' + (j ? '<button type="button" data-act="ePrin" data-f="' + esc(f) + '" aria-label="Hacer principal">' + ic('estrella') + '</button>' : '') +
            '<button type="button" data-act="eRemp" data-f="' + esc(f) + '" aria-label="Reemplazar">' + ic('camara') + '</button><button type="button" data-act="eQuitar" data-f="' + esc(f) + '" aria-label="Eliminar foto">' + ic('basura') + '</button></div></div>';
        }).join('') + (u.fotos.length < S.meta.maxFotos ? '<button type="button" class="agregar" data-act="eAgregar">' + ic('camara') + 'Agregar</button>' : '') + '</div></div>' +
        '<input type="file" id="e-archivo" accept="image/*" hidden data-change="eArchivo">';
      K.hidratarFotos(v);
      K.sucio = false;
    }
    var reemplaza = null;
    function subir(archivo) {
      v.querySelector('.fotos-edit').insertAdjacentHTML('beforeend', '<div class="f" style="display:grid;place-items:center"><span class="mini mut">Subiendo…</span></div>');
      return comprimir(archivo).then(function (f) { return api.llamar('subirFoto', { unidadId: u.id, full: f.full, mini: f.mini, reemplaza: reemplaza || undefined }); })
        .then(function () { K.toast(reemplaza ? 'Foto reemplazada' : 'Foto agregada'); reemplaza = null; return cargar(); }).catch(function (e) { reemplaza = null; K.error(e); cargar(); });
    }
    K.accionesVista = {
      'form:editar': function (f) {
        var def = S.meta.categorias[u.categoria], specs = {};
        def.unidad.forEach(function (c) { var e = $('#e-' + c.k); if (e && e.value !== '') specs[c.k] = e.value; });
        api.llamar('editarUnidad', { id: u.id, version: u.version, specs: specs, precioProveedor: $('#e-precioProveedor').value, precioRecomendado: $('#e-precioRecomendado').value, imei: $('#e-imei').value, serie: $('#e-serie').value, notas: $('#e-notas').value })
          .then(function (r) { K.sucio = false; K.toast(r.sinCambios ? 'No había cambios' : 'Cambios guardados'); K.ir('/unidad/' + u.id); })
          .catch(function (e) { K.error(e); if (e.codigo === 'CONFLICTO') cargar(); });
      },
      eAgregar: function () { reemplaza = null; $('#e-archivo').click(); },
      eRemp: function (el) { reemplaza = el.dataset.f; $('#e-archivo').click(); },
      ePrin: function (el) { api.llamar('fotoPrincipal', { unidadId: u.id, fotoId: el.dataset.f }).then(function () { K.toast('Foto principal actualizada'); cargar(); }).catch(K.error); },
      eQuitar: function (el) { K.confirmar('¿Eliminar esta foto?', 'Se mueve a la papelera de Drive.', { si: 'Eliminar', peligro: true }).then(function (si) { if (si) return api.llamar('eliminarFoto', { unidadId: u.id, fotoId: el.dataset.f }).then(function () { K.toast('Foto eliminada'); cargar(); }); }).catch(K.error); }
    };
    K.accionesVista['input:eSucio'] = function () { K.sucio = true; };
    K.accionesVista['change:eArchivo'] = function (el) { if (el.files[0]) { subir(el.files[0]); el.value = ''; } };
    return cargar();
  };

  /* =============================== Mis oportunidades =============================== */
  V.oportunidades = function (ruta, v) {
    function cargar() {
      return api.llamar('oportunidades').then(function (l) {
        var total = l.filter(function (o) { return o.visible && o.estado === 'DISPONIBLE'; }).reduce(function (a, o) { return a + o.calculo.ganancia; }, 0);
        v.innerHTML = '<div class="encabezado entra"><div><div class="ceja">Privado · solo tú</div><h1>Mis oportunidades</h1><p class="mut">Equipos que guardaste con tu precio de venta y ganancia estimada.</p></div>' +
          (l.length ? '<div class="kpi" style="min-width:220px"><b style="color:var(--ok2)">' + K.dinero(total) + '</b><span>Ganancia estimada (disponibles)</span></div>' : '') + '</div>' +
          (l.length ? '<div class="rejilla">' + l.map(function (o, i) {
            var c = o.calculo;
            return '<article class="tarjeta entra"' + delay(i) + '><div class="fila" style="align-items:flex-start"><div class="foto" style="width:72px;height:72px;border-radius:12px;flex:none">' + K.foto(o.fotos[0], 'Celulares', 'mini') + '</div><div style="min-width:0;flex:1"><div class="fila" style="gap:6px">' + idCopia(o.unidadId) + (o.estado === 'NO_DISPONIBLE' ? '<span class="estado e-RETIRADO">No disponible</span>' : K.estado(o.estado)) + '</div>' +
              '<h3 style="margin-top:6px">' + esc(o.nombre) + '</h3><div class="mini mut">' + esc(o.detalle) + (o.color ? ' · ' + esc(o.color) : '') + ' · ' + esc(o.tienda) + '</div></div></div>' +
              '<div class="metricas" style="margin-top:12px"><div><b>' + K.dinero(o.precioVenta) + '</b><span>Venta</span></div><div><b style="color:' + (c.ganancia < 0 ? 'var(--err)' : 'var(--ok2)') + '">' + K.dinero(c.ganancia) + '</b><span>Ganancia</span></div><div><b>' + K.pct(c.roi) + '</b><span>ROI</span></div></div>' +
              '<div class="mini mut" style="margin-top:8px">Proveedor ' + K.dinero(o.precioProveedor) + ' · gastos ' + K.dinero(o.gastos) + ' · margen ' + K.pct(c.margen) + '</div>' + (o.nota ? '<p class="peq" style="margin:8px 0 0">' + esc(o.nota) + '</p>' : '') +
              '<div class="fila" style="margin-top:12px">' + (o.visible ? '<a class="btn chico p" href="#/unidad/' + esc(o.unidadId) + '">Abrir ficha</a>' : '') + '<button class="btn chico fant" data-act="quitarOp" data-id="' + esc(o.id) + '">' + ic('basura') + 'Quitar</button></div></article>';
          }).join('') + '</div>' : K.vacio('inteligencia', 'Aún no guardas oportunidades', 'Abre la ficha de un equipo, calcula tu precio de venta y guárdalo aquí.', '<a class="btn p" href="#/catalogo">Ir al catálogo</a>'));
        K.hidratarFotos(v);
      });
    }
    K.refrescar = function () { cargar().catch(function () { }); };
    K.accionesVista = { quitarOp: function (el) { api.llamar('eliminarOportunidad', { id: el.dataset.id }).then(function () { K.toast('Oportunidad quitada'); cargar(); }).catch(K.error); } };
    return cargar();
  };

  /* =============================== Avisos y perfil =============================== */
  V.notificaciones = function (ruta, v) {
    K.accionesVista = {};
    return api.llamar('notificaciones').then(function (l) {
      var ICONO = { SOLICITUD: 'usuario', DISPONIBILIDAD: 'campana', APARTADO_VENCIDO: 'reloj', DISPONIBLE: 'estrella' };
      v.innerHTML = '<div class="encabezado entra"><div><div class="ceja">Cuenta</div><h1>Avisos</h1></div>' + (K.rol() === 'PROVEEDOR' ? '<a class="btn chico" href="#/solicitudes">Solicitudes de vendedores</a>' : '') + '</div>' +
        (l.length ? '<div class="pila">' + l.map(function (n, i) {
          var dest = n.tipo === 'SOLICITUD' ? (K.rol() === 'ADMIN' ? '#/admin?tab=solicitudes' : '#/solicitudes') : n.unidadId ? '#/unidad/' + n.unidadId : '';
          return '<' + (dest ? 'a href="' + dest + '"' : 'div') + ' class="tarjeta plana entra" style="display:flex;gap:12px;align-items:center;text-decoration:none;color:inherit' + (n.leida ? ';opacity:.7' : ';border-color:rgba(36,200,255,.5)') + '"' + delay(i) + '>' + ic(ICONO[n.tipo] || 'campana') +
            '<div style="flex:1"><div>' + esc(n.texto) + '</div><div class="mini mut">' + K.hace(n.fecha) + '</div></div>' + (n.leida ? '' : '<span class="etiqueta cian">Nuevo</span>') + '</' + (dest ? 'a' : 'div') + '>';
        }).join('') + '</div>' : K.vacio('confianza', 'Sin avisos', 'Aquí verás apartados vencidos, solicitudes y equipos favoritos que vuelven a estar disponibles.'));
      if (l.some(function (n) { return !n.leida; })) api.llamar('marcarNotificaciones').then(function () { S.noLeidas = 0; K.actualizarBadge(); });
    });
  };

  V.perfil = function (ruta, v) {
    var p = S.perfil;
    var ROL = { ADMIN: 'Administrador general', PROVEEDOR: 'Proveedor', VENDEDOR: 'Vendedor' };
    K.accionesVista = {
      'form:perfil': function (f) {
        api.llamar('actualizarPerfil', { nombre: $('#pf-nombre').value, telefono: $('#pf-tel').value }).then(function (r) { S.perfil = r; K.toast('Perfil guardado'); V.perfil(ruta, v); }).catch(K.error);
      },
      'form:codigoPerfil': function (f) {
        var b = f.querySelector('button'); b.disabled = true;
        api.llamar('agregarTiendaCodigo', { codigo: $('#pf-codigo').value }).then(function (r) {
          S.perfil = r.perfil; K.toast('Ya tienes acceso a ' + r.tienda, 'ok', 'exito'); V.perfil(ruta, v);
        }).catch(function (e) { b.disabled = false; K.error(e); });
      },
      sonido: function () { K.alternarSonido(); V.perfil(ruta, v); },
      reiniciarPrueba: function () {
        K.confirmar('¿Reiniciar los datos de prueba?', 'Se borran los cambios hechos en este navegador.', { si: 'Reiniciar', peligro: true }).then(function (si) { if (si) { api.reiniciarPrueba(); S.perfil = null; location.hash = ''; K.mostrar(); } });
      }
    };
    v.innerHTML = '<div class="encabezado entra"><div><div class="ceja">' + ROL[p.rol] + '</div><h1>' + esc(p.nombre) + '</h1><p class="mut">' + esc(p.email) + '</p></div>' + K.mascota('confianza', '', 'solo-escritorio') + '</div>' +
      '<div class="dos"><form class="tarjeta entra" data-form="perfil"><h2>Tus datos</h2><div class="form" style="margin-top:12px"><label class="campo">Nombre visible<input id="pf-nombre" maxlength="60" value="' + esc(p.nombre) + '"></label>' +
      '<label class="campo">WhatsApp (con lada)<input id="pf-tel" inputmode="tel" value="' + esc(p.telefono || '') + '" placeholder="5215512345678"></label><p class="mini mut" style="margin:0">' + (K.puede('fichas') ? 'Se muestra en las fichas que compartes para que el cliente te escriba.' : 'Para que KAN pueda contactarte.') + '</p>' +
      '<button class="btn p" type="submit">Guardar</button></div></form>' +
      '<div class="pila entra" style="animation-delay:.08s"><div class="tarjeta"><h2>Tiendas</h2><div class="pila" style="margin-top:10px">' + (p.tiendas.length ? p.tiendas.map(function (t) { return '<div class="entre"><span>' + esc(t.nombre) + '</span>' + (t.propia ? '<span class="etiqueta cian">Tuya</span>' : '<span class="etiqueta">Autorizada</span>') + '</div>'; }).join('') : '<span class="mut">Sin tiendas asignadas.</span>') + '</div>' +
      (p.codigos ? '<form data-form="codigoPerfil" style="margin-top:14px"><label class="campo">¿Te dieron el código de otra tienda?<div class="fila" style="gap:8px;flex-wrap:nowrap"><input id="pf-codigo" required autocomplete="off" spellcheck="false" placeholder="TIENDA-XXXXX" style="text-transform:uppercase;flex:1;min-width:0"><button class="btn chico" type="submit">Agregar</button></div></label></form>' : '') + '</div>' +
      '<div class="tarjeta"><h2>Experiencia</h2><div class="entre" style="margin-top:10px"><span>Sonidos de confirmación</span><button class="btn chico' + (K.sonidoActivo() ? ' p' : '') + '" data-act="sonido" aria-pressed="' + K.sonidoActivo() + '">' + ic('sonido') + (K.sonidoActivo() ? 'Activados' : 'Desactivados') + '</button></div>' +
      '<p class="mini mut">Las animaciones se reducen automáticamente si tu dispositivo tiene activado «reducir movimiento».</p></div>' +
      (api.modoPrueba ? '<div class="tarjeta"><h2>Modo de prueba</h2><p class="mut peq">Los datos son ficticios y viven solo en este navegador.</p><button class="btn peligro chico" data-act="reiniciarPrueba">Reiniciar datos de prueba</button></div>' : '') +
      '<button class="btn" data-act="salir">' + ic('salir') + 'Cerrar sesión</button></div></div>';
  };
})();
