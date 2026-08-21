import { registerCapabilities } from "./registry.js";

registerCapabilities([
  {
    module: "auth",
    code: "auth.login",
    name: "Iniciar sesión",
    description: "Autenticación de usuarios del tenant.",
    kind: "AUTENTICACION",
    dependencies: [],
  },
  {
    module: "auth",
    code: "auth.changePassword",
    name: "Cambiar contraseña",
    description: "Cambio de contraseña del usuario autenticado.",
    kind: "SEGURIDAD",
    dependencies: [],
  },
]);