import { registerCapabilities } from "./registry.js";

registerCapabilities([
  {
    module: "customers",
    code: "customers.view",
    name: "Listar clientes",
    description: "Lista/pagina clientes con búsqueda y filtro por país.",
    kind: "VISUALIZACION",
    dependencies: [],
  },
  {
    module: "customers",
    code: "customers.detail",
    name: "Ver ficha de cliente",
    description: "Detalle completo de un cliente (contacto, facturación, identificación).",
    kind: "VISUALIZACION",
    dependencies: [{ code: "customers.view", type: "OBLIGATORIA" }],
  },
  {
    module: "customers",
    code: "customers.create",
    name: "Crear cliente",
    description: "Registrar un cliente nuevo (empresa o persona).",
    kind: "CREACION",
    dependencies: [],
  },
  {
    module: "customers",
    code: "customers.update",
    name: "Editar cliente",
    description: "Editar un cliente existente.",
    kind: "EDICION",
    dependencies: [{ code: "customers.view", type: "OBLIGATORIA" }],
  },
  {
    module: "customers",
    code: "customers.delete",
    name: "Eliminar cliente",
    description: "Eliminar un cliente del tenant.",
    kind: "ELIMINACION",
    dependencies: [{ code: "customers.view", type: "OBLIGATORIA" }],
  },
]);