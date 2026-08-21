import { registerCapabilities } from "./registry.js";

registerCapabilities([
  {
    module: "catalog",
    code: "catalog.features",
    name: "Ver catálogo de features",
    description: "Catálogo global de features activas de la plataforma.",
    kind: "VISUALIZACION",
    dependencies: [],
  },
  {
    module: "catalog",
    code: "catalog.aiTools",
    name: "Ver catálogo de herramientas IA",
    description: "Catálogo global de herramientas de IA registradas.",
    kind: "VISUALIZACION",
    dependencies: [],
  },
  {
    module: "catalog",
    code: "catalog.capabilities",
    name: "Ver catálogo de capacidades",
    description: "Catálogo global de capacidades activas por módulo.",
    kind: "VISUALIZACION",
    dependencies: [],
  },
  {
    module: "catalog",
    code: "catalog.usageLimits",
    name: "Ver catálogo de límites de uso",
    description: "Catálogo global de métricas/límites de uso configurables.",
    kind: "VISUALIZACION",
    dependencies: [],
  },
  {
    module: "catalog",
    code: "catalog.sync",
    name: "Sincronizar catálogo",
    description:
      "Sincronizar manualmente el catálogo (features/capacidades/herramientas) con los registros declarativos.",
    kind: "CREACION",
    dependencies: [
      { code: "catalog.features", type: "OBLIGATORIA" },
      { code: "catalog.capabilities", type: "OBLIGATORIA" },
    ],
  },
]);
