import { registerCapabilities } from "./registry.js";
import {
  ALL_PLANS,
  ROLES_TENANT_ADMIN,
} from "./presets.js";

registerCapabilities([
  {
    module: "channels",
    code: "channels.view",
    domain: "ADMINISTRATION",
    allowedRoles: ROLES_TENANT_ADMIN,
    includedInPlans: ALL_PLANS,
    name: "Listar canales",
    description: "Lista los canales de mensajería conectados del tenant.",
    kind: "VISUALIZACION",
    dependencies: [],
  },
  {
    module: "channels",
    code: "channels.detail",
    domain: "ADMINISTRATION",
    allowedRoles: ROLES_TENANT_ADMIN,
    includedInPlans: ALL_PLANS,
    name: "Ver detalle de canal",
    description: "Detalle y estado de conexión de un canal.",
    kind: "VISUALIZACION",
    dependencies: [
      { code: "channels.view", type: "OBLIGATORIA" },
    ],
  },
  {
    module: "channels",
    code: "channels.create",
    domain: "ADMINISTRATION",
    allowedRoles: ROLES_TENANT_ADMIN,
    includedInPlans: ALL_PLANS,
    name: "Conectar canal",
    description: "Conectar un canal nuevo (p. ej. WhatsApp) al tenant.",
    kind: "CREACION",
    dependencies: [
      { code: "channels.view", type: "OBLIGATORIA" },
    ],
  },
  {
    module: "channels",
    code: "channels.update",
    domain: "ADMINISTRATION",
    allowedRoles: ROLES_TENANT_ADMIN,
    includedInPlans: ALL_PLANS,
    name: "Editar canal",
    description: "Editar la configuración de un canal existente.",
    kind: "EDICION",
    dependencies: [
      { code: "channels.detail", type: "OBLIGATORIA" },
    ],
  },
  {
    module: "channels",
    code: "channels.changeStatus",
    domain: "ADMINISTRATION",
    allowedRoles: ROLES_TENANT_ADMIN,
    includedInPlans: ALL_PLANS,
    name: "Activar/desactivar canal",
    description: "Cambiar el estado ACTIVO/INACTIVO de un canal.",
    kind: "CAMBIO_ESTADO",
    dependencies: [
      { code: "channels.detail", type: "OBLIGATORIA" },
    ],
  },
  {
    module: "channels",
    code: "channels.delete",
    domain: "ADMINISTRATION",
    allowedRoles: ROLES_TENANT_ADMIN,
    includedInPlans: ALL_PLANS,
    name: "Eliminar canal",
    description: "Desconectar y eliminar un canal del tenant.",
    kind: "ELIMINACION",
    dependencies: [
      { code: "channels.detail", type: "OBLIGATORIA" },
    ],
  },
]);
