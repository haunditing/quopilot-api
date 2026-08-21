import { registerCapabilities } from "./registry.js";

registerCapabilities([
  {
    module: "sales",
    code: "sales.view",
    name: "Listar ventas",
    description: "Lista/pagina ventas con filtros por estado, cliente y fechas.",
    kind: "VISUALIZACION",
    dependencies: [],
  },
  {
    module: "sales",
    code: "sales.detail",
    name: "Ver detalle de venta",
    description: "Detalle completo de una venta confirmada.",
    kind: "VISUALIZACION",
    dependencies: [{ code: "sales.view", type: "OBLIGATORIA" }],
  },
  {
    module: "sales",
    code: "sales.cancel",
    name: "Anular venta",
    description: "Anula una venta confirmada (cambio de estado a CANCELLED).",
    kind: "CAMBIO_ESTADO",
    dependencies: [{ code: "sales.view", type: "OBLIGATORIA" }],
  },
  {
    module: "sales",
    code: "sales.delete",
    name: "Eliminar venta",
    description: "Elimina una venta del tenant.",
    kind: "ELIMINACION",
    dependencies: [{ code: "sales.view", type: "OBLIGATORIA" }],
  },
]);
