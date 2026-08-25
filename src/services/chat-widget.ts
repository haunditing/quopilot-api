// src/services/chat-widget.ts (quopilot-api)

/**
 * Widget de chat comercial servido desde la API (certificado válido vía el
 * dominio público). Es un "bridge" funcional: expone
 * `window.QuoPilotChat.open({ planContext, tenantId })` y
 * `window.QuoPilotChat.selectPlan(planKey)`. Cuando el CDN interno real
 * (`cdn-internal.quopilot.com`) tenga certificado válido, basta con apuntar
 * `NEXT_PUBLIC_CHAT_WIDGET_URL` a ese CDN — el contrato es el mismo.
 */
export const CHAT_WIDGET_JS = `
(function () {
  var state = { plan: null, tenant: null };
  var host = document.createElement('div');
  host.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;font-family:system-ui,sans-serif;';
  host.innerHTML =
    '<button id="qp-wg-btn" style="display:inline-flex;align-items:center;gap:8px;background:#6366f1;color:#fff;border:0;border-radius:9999px;padding:12px 18px;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 8px 24px rgba(99,102,241,.4)">Cotizar con Asesor IA</button>' +
    '<div id="qp-wg-panel" style="display:none;position:absolute;bottom:72px;right:0;width:320px;max-width:90vw;background:#fff;color:#0f172a;border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(15,23,42,.25);flex-direction:column">' +
      '<div style="background:linear-gradient(135deg,#6366f1,#818cf8);color:#fff;padding:14px 16px;font-weight:700;font-size:14px">Asistente de Ventas IA</div>' +
      '<div id="qp-wg-ctx" style="padding:8px 16px;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0"></div>' +
      '<div id="qp-wg-msgs" style="padding:12px 16px;height:200px;overflow-y:auto;display:flex;flex-direction:column"></div>' +
      '<input id="qp-wg-in" placeholder="Escribe tu mensaje…" style="margin:12px 16px 16px;padding:10px 12px;border:1px solid #cbd5e1;border-radius:10px;font-size:13px;outline:none" />' +
    '</div>';
  document.body.appendChild(host);

  var btn = host.querySelector('#qp-wg-btn');
  var panel = host.querySelector('#qp-wg-panel');
  var ctx = host.querySelector('#qp-wg-ctx');
  var msgs = host.querySelector('#qp-wg-msgs');
  var inp = host.querySelector('#qp-wg-in');

  function say(text, me) {
    var d = document.createElement('div');
    d.textContent = text;
    d.style.cssText = 'margin:6px 0;padding:8px 11px;border-radius:10px;font-size:13px;max-width:85%;line-height:1.4;' + (me ? 'align-self:flex-end;background:#6366f1;color:#fff;' : 'align-self:flex-start;background:#f1f5f9;color:#0f172a;');
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function openChat() {
    panel.style.display = 'flex';
    ctx.textContent = 'Plan: ' + (state.plan || 'general') + (state.tenant ? ' · Empresa: ' + state.tenant : '');
    if (!msgs.children.length) {
      say('Hola 👋 Soy el asesor comercial de QuoPilot.');
      if (state.plan) say('Veo que te interesa el plan ' + state.plan + '. ¿Te ayudo a cotizarlo a tu medida?');
    }
    inp.focus();
  }

  btn.addEventListener('click', openChat);
  inp.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && inp.value.trim()) {
      say(inp.value.trim(), true);
      inp.value = '';
      setTimeout(function () { say('¡Gracias! Un asesor te contactará según el plan ' + (state.plan || 'elegido') + '.'); }, 500);
    }
  });

  window.QuoPilotChat = {
    selectPlan: function (planKey) { state.plan = planKey; },
    open: function (payload) {
      if (payload) {
        if (payload.planContext) state.plan = payload.planContext;
        if (payload.tenantId) state.tenant = payload.tenantId;
      }
      openChat();
    }
  };
})();
`;
