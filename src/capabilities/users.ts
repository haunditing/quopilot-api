import { registerCapabilities } from "./registry.js";
import {
  ALL_PLANS,
  ROLES_TENANT_ADMIN,
} from "./presets.js";

registerCapabilities([
  {
    module: "users",
    code: "users.view",
    domain: "ADMINISTRATION",
    allowedRoles: ROLES_TENANT_ADMIN,
    includedInPlans: ALL_PLANS,
    name: "Listar usuarios",
    description: "Lista los usuarios/agentes del tenant.",
    kind: "VISUALIZACION",
    dependencies: [],
  },
  {
    module: "users",
    code: "users.detail",
    domain: "ADMINISTRATION",
    allowedRoles: ROLES_TENANT_ADMIN,
    includedInPlans: ALL_PLANS,
    name: "Ver detalle de usuario",
    description: "Detalle de un usuario del tenant (rol, estado, datos).",
    kind: "VISUALIZACION",
    dependencies: [
      { code: "users.view", type: "OBLIGATORIA" },
    ],
  },
  {
    module: "users",
    code: "users.create",
    domain: "ADMINISTRATION",
    allowedRoles: ROLES_TENANT_ADMIN,
    includedInPlans: ALL_PLANS,
    name: "Crear usuario/agente",
    description: "Registrar un usuario o agente nuevo en el tenant.",
    kind: "CREACION",
    dependencies: [
      { code: "users.view", type: "OBLIGATORIA" },
    ],
  },
  {
    module: "users",
    code: "users.update",
    domain: "ADMINISTRATION",
    allowedRoles: ROLES_TENANT_ADMIN,
    includedInPlans: ALL_PLANS,
    name: "Editar usuario",
    description: "Editar datos y rol de un usuario del tenant.",
    kind: "EDICION",
    dependencies: [
      { code: "users.detail", type: "OBLIGATORIA" },
    ],
  },
  {
    module: "users",
    code: "users.changeStatus",
    domain: "ADMINISTRATION",
    allowedRoles: ROLES_TENANT_ADMIN,
    includedInPlans: ALL_PLANS,
    name: "Activar/desactivar usuario",
    description: "Cambiar el estado ACTIVO/INACTIVO de un usuario.",
    kind: "SEGURIDAD",
    dependencies: [
      { code: "users.detail", type: "OBLIGATORIA" },
    ],
  },
  {
    module: "users",
    code: "users.delete",
    domain: "ADMINISTRATION",
    allowedRoles: ROLES_TENANT_ADMIN,
    includedInPlans: ALL_PLANS,
    name: "Eliminar usuario",
    description: "Eliminar un usuario del tenant.",
    kind: "ELIMINACION",
    dependencies: [
      { code: "users.detail", type: "OBLIGATORIA" },
    ],
  },
]);
