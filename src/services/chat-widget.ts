// src/services/chat-widget.ts (quopilot-api)
// Sirve el MISMO widget que cdn.quopilot.com/v1/widget.js pero desde un dominio con certificado válido.
// Usa el iframe hacia /c/:token donde renderiza PublicChat (mismo componente que WebChat público).
// Contrato idéntico a quopilot-web/src/widget/widget.ts para que landing y tenants usen el mismo flow.
export const CHAT_WIDGET_JS = `
(function () {
  "use strict";
  if (window.__QUOPILOT_WIDGET__) return;
  Object.defineProperty(window, "__QUOPILOT_WIDGET__", { value: true });
  var currentScript = document.currentScript;
  var token = currentScript && currentScript.dataset ? currentScript.dataset.quopilotToken : "";
  var TOKEN_PATTERN = /^qp_live_[a-f0-9]{32}$/;
  if (!TOKEN_PATTERN.test(token)) {
    console.error("[QuoPilot] data-quopilot-token inválido o ausente. Se esperaba el formato qp_live_xxx entregado por el panel.");
    return;
  }
  function normalizeOrigin(raw) {
    if (!raw) return null;
    try { return new URL(raw).origin; } catch (e) { console.error("[QuoPilot] data-quopilot-origin inválido:", raw); return null; }
  }
  var APP_ORIGIN = normalizeOrigin(currentScript && currentScript.dataset ? currentScript.dataset.quopilotOrigin : null) || "https://app.quopilot.com";
  var POSITION = currentScript && currentScript.dataset && currentScript.dataset.quopilotPosition === "bottom-left" ? "left" : "right";
  var TRUSTED_ORIGIN = APP_ORIGIN;
  var SIDE = POSITION;
  var css = ".qp-widget-fab{position:fixed;" + SIDE + ":20px;bottom:20px;width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;background:linear-gradient(135deg, var(--accent, #aa3bff), #7e22ce);box-shadow:0 4px 16px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;padding:0;transition:transform 0.15s ease,box-shadow 0.15s ease;z-index:2147483000}.qp-widget-fab:hover{transform:scale(1.06);box-shadow:0 6px 24px rgba(0,0,0,0.35)}.qp-widget-fab svg{width:30px;height:30px;fill:#ffffff}.qp-widget-frame{position:fixed;" + SIDE + ":20px;bottom:92px;width:380px;height:min(600px, calc(100vh - 120px));max-width:calc(100vw - 32px);max-height:calc(100vh - 112px);border:none;border-radius:16px;background:transparent;box-shadow:0 12px 40px rgba(0,0,0,0.28);overflow:hidden;opacity:0;transform:translateY(16px) scale(0.98);pointer-events:none;transition:opacity 0.2s ease,transform 0.2s ease;z-index:2147483001}.qp-widget-frame--visible{opacity:1;transform:translateY(0) scale(1);pointer-events:auto}@media (max-width:480px){.qp-widget-frame{inset:0;width:100vw;height:100vh;max-width:none;max-height:none;border-radius:0}}";
  var styleEl = document.createElement("style");
  styleEl.textContent = css;
  document.head.appendChild(styleEl);
  var frameUrl = APP_ORIGIN.replace(/\/$/, "") + "/c/" + encodeURIComponent(token);
  var frame = document.createElement("iframe");
  frame.className = "qp-widget-frame";
  frame.src = frameUrl;
  frame.title = "Chat en línea";
  frame.allow = "microphone; clipboard-write";
  frame.setAttribute("aria-hidden", "true");
  var fab = document.createElement("button");
  fab.type = "button";
  fab.className = "qp-widget-fab";
  fab.setAttribute("aria-label", "Abrir chat de asistencia");
  fab.setAttribute("aria-expanded", "false");
  fab.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3C7.03 3 3 6.58 3 11c0 2.09.9 3.99 2.38 5.42-.13 1.05-.56 2.36-1.62 3.33a.6.6 0 0 0 .42 1.04c1.94-.08 3.53-.75 4.65-1.49 1 .29 2.06.45 3.17.45 4.97 0 9-3.58 9-8s-4.03-8-9-8z"/></svg>';
  function setFabImage(url) {
    var safe = url.replace(/"/g, "&quot;");
    fab.innerHTML = '<img src="' + safe + '" alt="Asistente" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block" />';
    fab.style.background = "#fff";
    fab.style.padding = "0";
    fab.style.overflow = "hidden";
    fab.style.border = "2px solid #fff";
  }
  (function loadAgentImage() {
    var apiOrigin = null;
    try { apiOrigin = new URL(currentScript.src).origin; } catch (e) {}
    if (!apiOrigin) apiOrigin = normalizeOrigin(currentScript.dataset.quopilotApiOrigin) || APP_ORIGIN;
    var url = apiOrigin.replace(/\/$/, "") + "/api/v1/public/channels/" + encodeURIComponent(token);
    fetch(url, { headers: { Accept: "application/json" } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || typeof data !== "object") return;
        var img = (data.agentImage && String(data.agentImage).trim()) || (data.defaultAgentImage && String(data.defaultAgentImage).trim());
        if (img) setFabImage(img);
      })
      .catch(function () {});
  })();
  var isOpen = false;
  function setOpen(next) {
    isOpen = next;
    frame.classList.toggle("qp-widget-frame--visible", isOpen);
    frame.setAttribute("aria-hidden", String(!isOpen));
    fab.setAttribute("aria-expanded", String(isOpen));
    fab.setAttribute("aria-label", isOpen ? "Cerrar chat de asistencia" : "Abrir chat de asistencia");
    if (frame.contentWindow) frame.contentWindow.postMessage({ type: "quopilot:visibility", visible: isOpen }, TRUSTED_ORIGIN);
  }
  fab.addEventListener("click", function () { setOpen(!isOpen); });
  window.addEventListener("message", function (event) {
    var data = event.data;
    var type = data && data.type;
    if (type === "quopilot:agentImage" && typeof data.image === "string" && data.image.trim()) {
      setFabImage(data.image.trim());
      return;
    }
    if (event.origin !== TRUSTED_ORIGIN) return;
    if (event.source && event.source !== frame.contentWindow) return;
    if (type === "quopilot:close") setOpen(false);
    if (type === "quopilot:open") setOpen(true);
  });
  var planContext = null;
  function iframeUrlWithPlan() { return planContext ? frameUrl + "?plan=" + encodeURIComponent(planContext) : frameUrl; }
  function applyPlan(planKey) { planContext = planKey; frame.src = iframeUrlWithPlan(); }
  window.QuoPilotChat = {
    selectPlan: function (planKey) { applyPlan(planKey); },
    open: function (opts) {
      var plan = opts && (opts.plan || opts.planContext);
      if (plan) applyPlan(plan);
      setOpen(true);
    },
    close: function () { setOpen(false); }
  };
  function mount() { document.body.appendChild(frame); document.body.appendChild(fab); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, { once: true });
  else mount();
})();
`;
