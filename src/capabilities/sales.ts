import { registerCapabilities } from "./registry.js";
import {
  ALL_PLANS,
  ROLES_COMMERCIAL,
} from "./presets.js";

registerCapabilities([
  {
    module: "sales",
    code: "sales.view",
    domain: "COMMERCIAL",
    allowedRoles: ROLES_COMMERCIAL,
    includedInPlans: ALL_PLANS,
    name: "Listar ventas",
    description: "Lista/pagina ventas con filtros por estado, cliente y fechas.",
    kind: "VISUALIZACION",
    dependencies: [],
  },
  {
    module: "sales",
    code: "sales.detail",
    domain: "COMMERCIAL",
    allowedRoles: ROLES_COMMERCIAL,
    includedInPlans: ALL_PLANS,
    name: "Ver detalle de venta",
    description: "Detalle completo de una venta confirmada.",
    kind: "VISUALIZACION",
    dependencies: [
      { code: "sales.view", type: "OBLIGATORIA" },
    ],
  },
  {
    module: "sales",
    code: "sales.cancel",
    domain: "COMMERCIAL",
    allowedRoles: ROLES_COMMERCIAL,
    includedInPlans: ALL_PLANS,
    name: "Anular venta",
    description: "Anula una venta confirmada (cambio de estado a CANCELLED).",
    kind: "CAMBIO_ESTADO",
    dependencies: [
      { code: "sales.view", type: "OBLIGATORIA" },
    ],
  },
  {
    module: "sales",
    code: "sales.delete",
    domain: "COMMERCIAL",
    allowedRoles: ROLES_COMMERCIAL,
    includedInPlans: ALL_PLANS,
    name: "Eliminar venta",
    description: "Elimina una venta del tenant.",
    kind: "ELIMINACION",
    dependencies: [
      { code: "sales.view", type: "OBLIGATORIA" },
    ],
  },
]);
