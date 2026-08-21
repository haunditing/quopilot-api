import { registerCapabilities } from "./registry.js";

registerCapabilities([
  {
    module: "channels",
    code: "channels.view",
    name: "Listar canales",
    description: "Lista los canales de mensajería conectados del tenant.",
    kind: "VISUALIZACION",
    dependencies: [],
  },
  {
    module: "channels",
    code: "channels.detail",
    name: "Ver detalle de canal",
    description: "Detalle y estado de conexión de un canal.",
    kind: "VISUALIZACION",
    dependencies: [{ code: "channels.view", type: "OBLIGATORIA" }],
  },
  {
    module: "channels",
    code: "channels.create",
    name: "Conectar canal",
    description: "Conectar un canal nuevo (p. ej. WhatsApp) al tenant.",
    kind: "CREACION",
    dependencies: [{ code: "channels.view", type: "OBLIGATORIA" }],
  },
  {
    module: "channels",
    code: "channels.update",
    name: "Editar canal",
    description: "Editar la configuración de un canal existente.",
    kind: "EDICION",
    dependencies: [{ code: "channels.detail", type: "OBLIGATORIA" }],
  },
  {
    module: "channels",
    code: "channels.changeStatus",
    name: "Activar/desactivar canal",
    description: "Cambiar el estado ACTIVO/INACTIVO de un canal.",
    kind: "CAMBIO_ESTADO",
    dependencies: [{ code: "channels.detail", type: "OBLIGATORIA" }],
  },
  {
    module: "channels",
    code: "channels.delete",
    name: "Eliminar canal",
    description: "Desconectar y eliminar un canal del tenant.",
    kind: "ELIMINACION",
    dependencies: [{ code: "channels.detail", type: "OBLIGATORIA" }],
  },
]);
