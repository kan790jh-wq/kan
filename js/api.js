/* KAN V7.0 · Conexión con el servidor.
   Producción: POST a la URL de Apps Script (text/plain, sin cabeceras extra, para evitar el bloqueo CORS).
   Modo de prueba: ejecuta el mismo servidor en el navegador con datos ficticios (servidor-prueba.js). */
(function () {
  var C = window.KAN_CONFIG || {};
  var PRUEBA = !C.API_URL;
  var CLAVE_DATOS = 'kan_v7_prueba_datos';
  var CLAVE_SESION = 'kan_v7_sesion';
  var servidor = null;

  function iniciarPrueba() {
    if (servidor) return servidor;
    var estado = null;
    try { estado = JSON.parse(localStorage.getItem(CLAVE_DATOS) || 'null'); } catch (e) { estado = null; }
    var guardar = function (E) {
      try { localStorage.setItem(CLAVE_DATOS, JSON.stringify(E)); }
      catch (e) { console.warn('KAN prueba: el navegador no tiene espacio para guardar todo (las fotos de prueba se perderán al recargar).'); }
    };
    servidor = window.KANServidorPrueba(estado, guardar, {
      GOOGLE_CLIENT_ID: 'KAN-PRUEBA', URL_APP: location.href.replace(/[^/]*([?#].*)?$/, ''), ADMIN_EMAIL: 'admin@prueba.kan', PROVEEDORES_INICIALES: []
    });
    if (!estado) { servidor.instalarKAN(); servidor.crearDatosDePrueba(); guardar(servidor.sim.estado); }
    return servidor;
  }

  var token = null;
  try { token = localStorage.getItem(CLAVE_SESION); } catch (e) { }
  var ultimaSync = 0, enLinea = true, revision = 0;
  var oyentes = [];
  function avisar() { oyentes.forEach(function (f) { try { f({ enLinea: enLinea, ultimaSync: ultimaSync, revision: revision }); } catch (e) { } }); }

  function errorKAN(codigo, mensaje) { var e = new Error(mensaje); e.codigo = codigo; return e; }

  function llamar(accion, datos) {
    var cuerpo = { accion: accion, token: token, datos: datos || {} };
    var promesa;
    if (PRUEBA) {
      promesa = new Promise(function (ok) {
        setTimeout(function () {
          var s = iniciarPrueba();
          var r = JSON.parse(s.doPost({ postData: { contents: JSON.stringify(cuerpo) } }).getContent());
          s.sim.servicios.SpreadsheetApp.flush();
          ok(r);
        }, 120 + Math.random() * 160);
      });
    } else {
      promesa = fetch(C.API_URL, { method: 'POST', body: JSON.stringify(cuerpo), redirect: 'follow' })
        .then(function (r) { if (!r.ok) throw errorKAN('RED', 'El servidor respondió ' + r.status); return r.json(); });
    }
    return promesa.then(function (r) {
      enLinea = true; ultimaSync = Date.now();
      if (r.rev) revision = r.rev;
      avisar();
      if (!r.ok) {
        if (r.error.codigo === 'NO_AUTENTICADO' && accion !== 'login') { cerrarLocal(); window.dispatchEvent(new Event('kan:sesion-terminada')); }
        throw errorKAN(r.error.codigo, r.error.mensaje);
      }
      return r.datos;
    }, function (e) {
      if (e.codigo) throw e;
      enLinea = false; avisar();
      throw errorKAN('RED', 'Sin conexión con KAN. Revisa tu internet; tus datos no se perdieron.');
    });
  }

  function cerrarLocal() { token = null; try { localStorage.removeItem(CLAVE_SESION); } catch (e) { } }

  window.KANApi = {
    modoPrueba: PRUEBA,
    llamar: llamar,
    tieneSesion: function () { return !!token; },
    guardarSesion: function (t) { token = t; try { localStorage.setItem(CLAVE_SESION, t); } catch (e) { } },
    cerrarSesion: function () { var p = token ? llamar('cerrarSesion').catch(function () { }) : Promise.resolve(); return p.then(cerrarLocal); },
    alCambiar: function (f) { oyentes.push(f); },
    estadoRed: function () { return { enLinea: enLinea, ultimaSync: ultimaSync, revision: revision }; },
    /* Modo de prueba: identidad de Google simulada y reinicio de datos ficticios */
    tokenPrueba: function (email, nombre) { return iniciarPrueba().sim.tokenPrueba(email, nombre, 'KAN-PRUEBA'); },
    reiniciarPrueba: function () { try { localStorage.removeItem(CLAVE_DATOS); } catch (e) { } servidor = null; cerrarLocal(); },
    adelantarReloj: null
  };
  // Para que la ficha pública de prueba (otra página del mismo navegador) lea datos actualizados.
  window.addEventListener('storage', function (e) { if (e.key === CLAVE_DATOS && PRUEBA) servidor = null; });
  window.addEventListener('online', function () { enLinea = true; avisar(); });
  window.addEventListener('offline', function () { enLinea = false; avisar(); });
})();
