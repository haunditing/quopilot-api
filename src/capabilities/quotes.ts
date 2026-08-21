import { registerCapabilities } from "./registry.js";

registerCapabilities([
  {
    module: "quotes",
    code: "quotes.view",
    name: "Listar cotizaciones",
    description: "Lista/pagina cotizaciones con filtros por estado, cliente y búsqueda.",
    kind: "VISUALIZACION",
    dependencies: [],
  },
  {
    module: "quotes",
    code: "quotes.detail",
    name: "Ver detalle de cotización",
    description: "Detalle completo, ítems y eventos/historial de la cotización.",
    kind: "VISUALIZACION",
    dependencies: [{ code: "quotes.view", type: "OBLIGATORIA" }],
  },
  {
    module: "quotes",
    code: "quotes.create",
    name: "Crear cotización",
    description: "Crear una cotización en borrador con cliente e ítems.",
    kind: "CREACION",
    dependencies: [],
  },
  {
    module: "quotes",
    code: "quotes.update",
    name: "Editar cotización",
    description: "Editar ítems y datos de una cotización.",
    kind: "EDICION",
    dependencies: [
      { code: "quotes.view", type: "OBLIGATORIA" },
      { code: "quotes.create", type: "OPCIONAL" },
    ],
  },
  {
    module: "quotes",
    code: "quotes.send",
    name: "Enviar cotización",
    description: "Entregar la cotización al cliente (marcar como enviada).",
    kind: "COMUNICACION",
    dependencies: [{ code: "quotes.detail", type: "OBLIGATORIA" }],
  },
  {
    module: "quotes",
    code: "quotes.accept",
    name: "Aceptar cotización",
    description: "Aceptar una cotización enviada; genera automáticamente la venta.",
    kind: "OPERACION_COMERCIAL",
    dependencies: [{ code: "quotes.send", type: "OBLIGATORIA" }],
  },
  {
    module: "quotes",
    code: "quotes.pdf",
    name: "Descargar cotización PDF",
    description: "Generar y descargar el documento PDF de la cotización.",
    kind: "DOCUMENTO",
    dependencies: [{ code: "quotes.detail", type: "OBLIGATORIA" }],
  },
]);