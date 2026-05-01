# Deploy — consultorio.epa-bienestar.com.ar

Front estático servido por Nginx desde la **misma VPS** donde corre `api.epa-bienestar.com.ar` (Medplum self-hosted).

> Nota histórica: el repo se llama `seguimiento` (legacy). El producto se llama **Consultorio** y se sirve en `consultorio.epa-bienestar.com.ar`.

## Primera instalación

En la VPS, como root:

```bash
git clone https://github.com/drdalessandro/seguimiento /opt/consultorio
cd /opt/consultorio
git checkout claude/integrate-medplum-backend-zKqdJ
bash deploy/install.sh
```

Esto:
- Instala el vhost en `/etc/nginx/sites-available/consultorio.epa-bienestar.com.ar.conf`
- Si existía el vhost legacy `seguimiento.epa-bienestar.com.ar`, lo desactiva
- Pide certificado TLS a Let's Encrypt
- Recarga Nginx

DNS necesario antes de correr `install.sh`:

```
consultorio.epa-bienestar.com.ar  A  <IP de la VPS>
```

## Actualizar el front

```bash
cd /opt/consultorio
bash deploy/update.sh
```

`update.sh` hace `git pull` y recarga Nginx. **El build (`dist/`) viaja commiteado en el repo**, no hace falta correr `npm install` en la VPS.

## Rebuild local (cuando hay cambios de código)

En tu máquina, antes de pushear:

```bash
npm install
npm run build
git add dist/
git commit -m "build: rebuild para deploy"
git push
```

## Configuración

`.env.defaults` apunta a:

| Variable | Valor |
|---|---|
| `MEDPLUM_BASE_URL` | `https://api.epa-bienestar.com.ar/` |
| `MEDPLUM_PROJECT_ID` | `79679343-1b6e-47b9-bee7-32929111451d` (Mujer) |
| `MEDPLUM_CLIENT_ID` | (a definir — ver más abajo) |
| `GOOGLE_CLIENT_ID` | `472653584585-r9q1rl7…` (Seguimiento) |

### ClientID a usar

El client ideal es un **"Consultorio Client"** con `AccessPolicy` que permita ver Project Mujer + Project Hábitos (para cuando se sume). Mientras se crea, el código acepta:

| Client | ID | Scope |
|---|---|---|
| Mujer Default Client | `188d147c-a397-482e-898e-928fbd445321` | Solo Project Mujer |
| Seguimiento (multi-Project) | `babb532b-3c00-404f-9564-6c3ab6f27511` | Multi-tenant |

Editá `.env.defaults` con el ClientID que prefieras y rebuildeá.

## Project Secrets en Medplum (para los Bots)

Configurar en `app.epa-bienestar.com.ar` → **Project Mujer → Secrets**:

| Secret | Para qué |
|---|---|
| `ANTHROPIC_API_KEY` | Bots `clinical-ai-suggest` y `clinical-ai-interpret` |
| `DEIDENTIFY_HMAC_KEY` | Pseudonimización determinística (`openssl rand -hex 32`) |

## Headers de seguridad

El vhost agrega CSP, HSTS, X-Frame-Options, etc. Si en algún momento se necesita embeber otro origen (p.ej. un PDF viewer externo), hay que actualizar `connect-src`/`frame-src` en `nginx/consultorio.epa-bienestar.com.ar.conf`.
