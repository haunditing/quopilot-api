import { registerCapabilities } from "./registry.js";

registerCapabilities([
  {
    module: "products",
    code: "products.view",
    name: "Listar productos",
    description: "Lista/pagina productos, servicios y combos con filtros.",
    kind: "VISUALIZACION",
    dependencies: [],
  },
  {
    module: "products",
    code: "products.detail",
    name: "Ver ficha de producto",
    description: "Detalle completo: precios, listas de precio, bodegas, impuestos, imagen.",
    kind: "VISUALIZACION",
    dependencies: [{ code: "products.view", type: "OBLIGATORIA" }],
  },
  {
    module: "products",
    code: "products.create",
    name: "Crear producto",
    description: "Crear producto/servicio/combo, incluida el alta rápida.",
    kind: "CREACION",
    dependencies: [],
  },
  {
    module: "products",
    code: "products.update",
    name: "Editar producto",
    description: "Editar un producto (precios, impuestos, bodegas, imagen).",
    kind: "EDICION",
    dependencies: [{ code: "products.view", type: "OBLIGATORIA" }],
  },
  {
    module: "products",
    code: "products.changeStatus",
    name: "Activar/desactivar producto",
    description: "Cambiar el estado ACTIVO/INACTIVO de un producto.",
    kind: "CAMBIO_ESTADO",
    dependencies: [{ code: "products.view", type: "OBLIGATORIA" }],
  },
  {
    module: "products",
    code: "products.delete",
    name: "Eliminar producto",
    description: "Eliminar un producto del catálogo.",
    kind: "ELIMINACION",
    dependencies: [{ code: "products.view", type: "OBLIGATORIA" }],
  },
]);