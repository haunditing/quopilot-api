import { registerCapabilities } from "./registry.js";
import {
  ALL_PLANS,
  ALL_USER_ROLES,
} from "./presets.js";

registerCapabilities([
  {
    module: "auth",
    code: "auth.login",
    domain: "ADMINISTRATION",
    allowedRoles: ALL_USER_ROLES,
    includedInPlans: ALL_PLANS,
    name: "Iniciar sesión",
    description: "Autenticación de usuarios del tenant.",
    kind: "AUTENTICACION",
    dependencies: [],
  },
  {
    module: "auth",
    code: "auth.changePassword",
    domain: "ADMINISTRATION",
    allowedRoles: ALL_USER_ROLES,
    includedInPlans: ALL_PLANS,
    name: "Cambiar contraseña",
    description: "Cambio de contraseña del usuario autenticado.",
    kind: "SEGURIDAD",
    dependencies: [],
  },
]);
