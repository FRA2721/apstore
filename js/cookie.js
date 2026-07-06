// ================================================
// ApStore — Cookie consent banner (minimale, linee guida Garante)
// Mostra il banner solo alla prima visita; memorizza la scelta.
// I cookie tecnici (carrello, sessione) non richiedono consenso;
// il consenso riguarda eventuali cookie statistici/di terze parti.
// ================================================
(function () {
  var KEY = 'apstore_cookie_consent';
  try { if (localStorage.getItem(KEY)) return; } catch (_) { return; }

  function build() {
    var b = document.createElement('div');
    b.className = 'ck-banner';
    b.setAttribute('role', 'dialog');
    b.setAttribute('aria-label', 'Informativa cookie');
    b.innerHTML =
      '<p>Usiamo cookie tecnici necessari al funzionamento del sito (carrello e sessione) e, ' +
      'previo tuo consenso, cookie di statistica per migliorarlo. Puoi accettarli tutti o ' +
      'mantenere solo quelli necessari. Dettagli nella <a href="cookie.html">Cookie Policy</a>.</p>' +
      '<div class="ck-actions">' +
      '<button class="ck-btn ck-btn-accept" id="ckAccept" type="button">Accetta tutti</button>' +
      '<button class="ck-btn ck-btn-reject" id="ckReject" type="button">Solo necessari</button>' +
      '</div>';
    document.body.appendChild(b);
    requestAnimationFrame(function () { b.classList.add('show'); });

    function choose(v) {
      try { localStorage.setItem(KEY, v); } catch (_) {}
      b.classList.remove('show');
      setTimeout(function () { b.remove(); }, 500);
    }
    document.getElementById('ckAccept').onclick = function () { choose('all'); };
    document.getElementById('ckReject').onclick = function () { choose('necessary'); };
  }

  if (document.body) build();
  else document.addEventListener('DOMContentLoaded', build);
})();
