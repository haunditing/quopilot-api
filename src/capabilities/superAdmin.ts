import { registerCapabilities } from "./registry.js";

registerCapabilities([
  {
    module: "superAdmin",
    code: "superAdmin.dashboard",
    name: "Dashboard super admin",
    description:
      "Resumen global de la plataforma (tenants, ingresos, uso agregado).",
    kind: "ANALISIS",
    dependencies: [],
  },
  {
    module: "superAdmin",
    code: "superAdmin.plans.view",
    name: "Ver planes",
    description: "Lista y detalle de planes de suscripción.",
    kind: "VISUALIZACION",
    dependencies: [],
  },
  {
    module: "superAdmin",
    code: "superAdmin.plans.manage",
    name: "Administrar planes",
    description:
      "Crear, editar, eliminar planes y marcar el plan por defecto.",
    kind: "EDICION",
    dependencies: [{ code: "superAdmin.plans.view", type: "OBLIGATORIA" }],
  },
  {
    module: "superAdmin",
    code: "superAdmin.plans.features",
    name: "Features por plan",
    description: "Consultar y actualizar las features habilitadas por plan.",
    kind: "EDICION",
    dependencies: [{ code: "superAdmin.plans.view", type: "OBLIGATORIA" }],
  },
  {
    module: "superAdmin",
    code: "superAdmin.plans.capabilities",
    name: "Capacidades por plan",
    description:
      "Consultar y actualizar las capacidades efectivas incluidas en cada plan.",
    kind: "EDICION",
    dependencies: [{ code: "superAdmin.plans.view", type: "OBLIGATORIA" }],
  },
  {
    module: "superAdmin",
    code: "superAdmin.assistantCapabilities",
    name: "Permisos de herramientas IA por plan",
    description:
      "Configurar qué herramientas del asistente IA están disponibles por plan.",
    kind: "SEGURIDAD",
    dependencies: [{ code: "superAdmin.plans.view", type: "OBLIGATORIA" }],
  },
  {
    module: "superAdmin",
    code: "superAdmin.commercialPolicy",
    name: "Política comercial global",
    description: "Ver y editar la política comercial aplicada a los agentes IA.",
    kind: "EDICION",
    dependencies: [],
  },
  {
    module: "superAdmin",
    code: "superAdmin.supportAssistantConfig",
    name: "Configuración de soporte IA",
    description:
      "Ver y editar la configuración global del asistente de soporte con IA.",
    kind: "EDICION",
    dependencies: [],
  },
]);
