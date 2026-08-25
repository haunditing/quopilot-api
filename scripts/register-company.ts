import "dotenv/config";

/**
 * Provisioning en producción: registra la Empresa/Tenant de QuoPilot y
 * devuelve su `_id` para setear `NEXT_PUBLIC_LANDING_TENANT_ID` en Netlify.
 *
 * Uso (con la API activa):
 *   PROVISION_API_URL=https://<railway>.up.railway.app \
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... \
 *   npm run provision:company
 */
const API = process.env.PROVISION_API_URL ?? "http://localhost:3000";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const NAME = process.env.LANDING_TENANT_NAME ?? "QuoPilot";
const EMAIL = process.env.LANDING_TENANT_EMAIL ?? "ventas@quopilot.com";
const ADMIN_NAME = process.env.LANDING_TENANT_ADMIN ?? "Ventas";
const PASSWORD = process.env.LANDING_TENANT_PASSWORD ?? "quopilot2026";

async function main(): Promise<void> {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error("Faltan ADMIN_EMAIL / ADMIN_PASSWORD (credenciales SUPER_ADMIN).");
    process.exit(1);
  }

  const login = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!login.ok) throw new Error(`Login falló (${login.status})`);
  const { accessToken } = (await login.json()) as { accessToken: string };

  const res = await fetch(`${API}/api/tenants`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      name: NAME,
      email: EMAIL,
      adminName: ADMIN_NAME,
      password: PASSWORD,
      confirmPassword: PASSWORD,
      currency: "COP",
      timezone: "America/Bogota",
      country: "CO",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Crear tenant falló (${res.status}): ${text}`);
  }

  const tenant = (await res.json()) as { _id?: string; id?: string };
  const tenantId = tenant._id ?? tenant.id;
  console.log("TENANT_ID=" + tenantId);
  if (tenantId) {
    console.log(`→ En Netlify (landing): NEXT_PUBLIC_LANDING_TENANT_ID=${tenantId}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
