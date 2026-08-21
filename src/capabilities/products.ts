import { registerCapabilities } from "./registry.js";
import {
  ALL_PLANS,
  ROLES_TENANT_ADMIN,
} from "./presets.js";

registerCapabilities([
  {
    module: "products",
    code: "products.view",
    domain: "ADMINISTRATION",
    allowedRoles: ROLES_TENANT_ADMIN,
    includedInPlans: ALL_PLANS,
    name: "Listar productos",
    description: "Lista/pagina productos, servicios y combos con filtros.",
    kind: "VISUALIZACION",
    dependencies: [],
  },
  {
    module: "products",
    code: "products.detail",
    domain: "ADMINISTRATION",
    allowedRoles: ROLES_TENANT_ADMIN,
    includedInPlans: ALL_PLANS,
    name: "Ver ficha de producto",
    description: "Detalle completo: precios, listas de precio, bodegas, impuestos, imagen.",
    kind: "VISUALIZACION",
    dependencies: [
      { code: "products.view", type: "OBLIGATORIA" },
    ],
  },
  {
    module: "products",
    code: "products.create",
    domain: "ADMINISTRATION",
    allowedRoles: ROLES_TENANT_ADMIN,
    includedInPlans: ALL_PLANS,
    name: "Crear producto",
    description: "Crear producto/servicio/combo, incluida el alta rápida.",
    kind: "CREACION",
    dependencies: [],
  },
  {
    module: "products",
    code: "products.update",
    domain: "ADMINISTRATION",
    allowedRoles: ROLES_TENANT_ADMIN,
    includedInPlans: ALL_PLANS,
    name: "Editar producto",
    description: "Editar un producto (precios, impuestos, bodegas, imagen).",
    kind: "EDICION",
    dependencies: [
      { code: "products.view", type: "OBLIGATORIA" },
    ],
  },
  {
    module: "products",
    code: "products.changeStatus",
    domain: "ADMINISTRATION",
    allowedRoles: ROLES_TENANT_ADMIN,
    includedInPlans: ALL_PLANS,
    name: "Activar/desactivar producto",
    description: "Cambiar el estado ACTIVO/INACTIVO de un producto.",
    kind: "CAMBIO_ESTADO",
    dependencies: [
      { code: "products.view", type: "OBLIGATORIA" },
    ],
  },
  {
    module: "products",
    code: "products.delete",
    domain: "ADMINISTRATION",
    allowedRoles: ROLES_TENANT_ADMIN,
    includedInPlans: ALL_PLANS,
    name: "Eliminar producto",
    description: "Eliminar un producto del catálogo.",
    kind: "ELIMINACION",
    dependencies: [
      { code: "products.view", type: "OBLIGATORIA" },
    ],
  },
]);
