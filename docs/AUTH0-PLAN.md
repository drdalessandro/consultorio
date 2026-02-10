# Auth0 — Plan de Identidad Unificada

## Concepto

Auth0 actúa como Identity Hub central para todo el ecosistema EPA Bienestar.
Un solo login → acceso a Medplum, PHP, WordPress, Google Workspace, Mobile.

## Auth0 Tenant

- **Domain:** `epa-bienestar.auth0.com`
- **Custom Domain (Essential+):** `auth.epa-bienestar.com.ar`
- **Region:** US (default) o EU si compliance lo requiere

## Applications

| Application | Type | Callback URL | Uso |
|---|---|---|---|
| EPA-PHP-Clinical | Regular Web App | `https://info.epa-bienestar.com.ar/callback` | Laravel frontend clínico |
| EPA-React-Mujer | SPA | `https://mujer.epa-bienestar.com.ar/callback` | Programa Mujer React |
| EPA-Medplum-Admin | SPA | `https://app.epa-bienestar.com.ar/auth/external` | Admin Medplum app |
| EPA-Mobile | Native | `com.epabienestar.app://callback` | Mobile app futuro |
| EPA-WordPress | Regular Web App | `https://blog.epa-bienestar.com.ar/callback` | Blog WordPress |

## Connections

| Connection | Type | Para quién | Detalle |
|---|---|---|---|
| Username-Password-Auth | Database | Pacientes | Default, registro con email |
| google-oauth2 | Social | Todos | Login con Google, facilita onboarding |
| Google Workspace | Enterprise SAML | Profesionales @epa-bienestar.com.ar | SSO con Gmail/Drive |
| apple | Social | Mobile users | Requerido para iOS App Store |

## Roles

| Rol | Asignación | Mapeo a Medplum |
|---|---|---|
| `paciente` | Default en signup | AccessPolicy: EPA-Patient-Policy |
| `profesional` | Manual/domain-based | AccessPolicy: EPA-Practitioner-Policy |
| `admin` | Manual | AccessPolicy: EPA-Admin-Policy (full access) |
| `white-label-admin` | Por Organization | AccessPolicy: EPA-WhiteLabel-Admin |

## Token Flow: Auth0 → Medplum

```
1. User → Auth0 Universal Login (PKCE)
2. Auth0 → devuelve id_token (JWT) + access_token + refresh_token
3. Frontend (PHP/React) → POST api.epa-bienestar.com.ar/auth/external
   Body: { idToken: auth0_id_token, projectId: MEDPLUM_PROJECT_ID, clientId: MEDPLUM_CLIENT_ID }
4. Medplum → valida JWT via Auth0 JWKS endpoint
5. Medplum → devuelve Medplum access_token + refresh_token
6. Frontend → guarda AMBOS tokens en session
   - Auth0 token: para verificar identidad + SSO
   - Medplum token: para operar con FHIR API
```

## Medplum External IDP Config

En app.epa-bienestar.com.ar → Project Settings → Identity Providers:

```
Auth URL: https://epa-bienestar.auth0.com/authorize
Token URL: https://epa-bienestar.auth0.com/oauth/token
UserInfo URL: https://epa-bienestar.auth0.com/userinfo
Client ID: <Auth0_Application_Client_ID>
Client Secret: <Auth0_Application_Client_Secret>
Issuer: https://epa-bienestar.auth0.com/
JWKS URL: https://epa-bienestar.auth0.com/.well-known/jwks.json
```

En ClientApplication → Edit:
```
PKCE Optional: true
Identity Provider: Auth0 (configurada arriba)
```

## WordPress SSO Config

Plugin: miniOrange OAuth SSO o SAML SSO

```
Identity Provider: Auth0
Authorize URL: https://epa-bienestar.auth0.com/authorize
Token URL: https://epa-bienestar.auth0.com/oauth/token
UserInfo URL: https://epa-bienestar.auth0.com/userinfo
Client ID: <EPA-WordPress client_id>
Client Secret: <EPA-WordPress client_secret>

Role Mapping:
  Auth0 role:paciente → WP Subscriber
  Auth0 role:profesional → WP Author
  Auth0 role:admin → WP Administrator

Auto-create user: enabled
```

## Google Workspace Integration

**Opción recomendada:** Google Workspace como Enterprise Connection en Auth0.

- Profesionales @epa-bienestar.com.ar → domain routing → Google Workspace
- Se autentican con credenciales de Google
- Auth0 agrega roles EPA al token
- Resultado: logueado en Auth0 (acceso a todo) + ya en Google Workspace

## Auth0 Actions (Post-Login)

```javascript
// Action: Add EPA Metadata to Tokens
exports.onExecutePostLogin = async (event, api) => {
  const namespace = 'https://epa-bienestar.com.ar';
  
  // Agregar roles al token
  api.idToken.setCustomClaim(`${namespace}/roles`, event.authorization?.roles || []);
  
  // Agregar metadata de Medplum
  const appMeta = event.user.app_metadata || {};
  api.idToken.setCustomClaim(`${namespace}/medplum_project_id`, appMeta.medplum_project_id);
  api.idToken.setCustomClaim(`${namespace}/organization_id`, appMeta.organization_id);
};
```

## Pricing

| Plan | Costo | MAU | Features clave |
|---|---|---|---|
| Free | $0 | 25,000 | Universal Login, 2 Social, MFA básico |
| Essential | $240/mes | 50,000 | Custom Domain, Social ilimitadas, Passwordless |
| Professional | $720/mes | 50,000 | Organizations (white-label), Log streaming |

**Recomendación:** Free para MVP → Essential cuando >25K MAU → Professional solo si white-label.

## Medplum Demo Repo

Referencia oficial: https://github.com/medplum/medplum-client-external-idp-demo
~100 líneas TypeScript. Usar como base para la integración.
