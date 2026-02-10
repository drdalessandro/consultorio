# Arquitectura del Sistema

## Stack Overview

```
┌─────────────────────────────────────────────────────────┐
│                      USUARIOS                            │
│  Paciente / Profesional / Admin / White-Label            │
└────────────────────┬────────────────────────────────────┘
                     │
          ┌──────────▼──────────┐
          │   Auth0 (IdP Hub)   │
          │ epa-bienestar.auth0 │
          └──────────┬──────────┘
                     │ OAuth2/OIDC tokens
    ┌────────────────┼────────────────┐
    │                │                │
    ▼                ▼                ▼
┌─────────┐  ┌────────────┐  ┌────────────┐
│ PHP     │  │ React SPA  │  │ WordPress  │
│ Laravel │  │ Prog.Mujer │  │ Blog       │
│ info.   │  │ mujer.     │  │ blog.      │
└────┬────┘  └─────┬──────┘  └────────────┘
     │             │
     │  Auth0 token exchange
     │       (/auth/external)
     │             │
     └──────┬──────┘
            ▼
  ┌──────────────────┐
  │ Medplum FHIR R4  │◄── Bots (Lambda)
  │ api.epa-bienestar│    ├── bot-specialty-router
  │   ECS Fargate    │    ├── bot-order-activator
  │                  │    ├── bot-result-processor
  └────────┬─────────┘    ├── bot-crossref-engine
           │              └── bot-completion-summary
           ▼
  ┌──────────────────┐
  │ AWS sa-east-1    │
  │ ├── RDS Postgres │
  │ ├── ElastiCache  │
  │ ├── S3 (docs)    │
  │ ├── CloudFront   │
  │ └── Lambda (bots)│
  └──────────────────┘
```

## AWS Infrastructure (50K users, sa-east-1)

| Servicio | Config | Costo/mes |
|----------|--------|-----------|
| ECS Fargate | 3 tasks × (2vCPU/4GB), auto-scale 2-8 | $290 |
| RDS PostgreSQL 16 | db.r6g.xlarge Multi-AZ, 500GB gp3 | $580 |
| ElastiCache Redis 7 | cache.r6g.large + replica | $195 |
| Lambda (Bots) | 512MB-1024MB, ~200K invocations/mes | $15 |
| S3 | Binaries, Intelligent-Tiering | $8 |
| CloudFront + WAF | 3 distributions, rate limiting | $60 |
| ALB | SSL termination, health checks | $40 |
| VPC | 3 AZ, public + private subnets | $95 |
| CloudWatch | 50GB logs, alarms | $35 |
| SES | 100K emails/mes | $10 |
| Secrets Manager | DB creds, Redis auth | $8 |
| Route 53 | 4 hosted zones | $5 |
| **Total** | | **~$1,341** |

Con Reserved Instances: ~$1,070/mes

## Medplum Deployment

- **Self-hosted** via Medplum CDK
- Container: `medplum/medplum-server:latest` en ECR
- Bots deploy: TypeScript → compiled JS → Lambda via `medplum bot deploy`
- Lambda Layer: `@medplum/core` + deps (~50MB)

## Multi-Tenancy

**Level 1 — Project Isolation (white-label):**
- 1 Project por cliente: `epa-prod`, `cliente-hospital-x`, `cliente-prepaga-y`
- Hard boundary en FHIR resources
- Shared infra (1 RDS, 1 ECS, 1 Redis)

**Level 2 — Compartment (dentro de Project):**
- Organization como tenant para clínicas/departamentos
- Patient.$set-accounts con propagate:true
- AccessPolicies parametrizadas por Organization

**Shared Projects:**
- Terminologías (LOINC, SNOMED), ValueSets
- PlanDefinitions, ActivityDefinitions
- Linked Projects (read-only)

## Environments

| Env | Stack | Costo |
|-----|-------|-------|
| Dev | Docker Compose local (postgres + redis + medplum) | $0 |
| Staging | AWS reduced (1 Fargate, t4g.medium DB, single-AZ) | ~$250/mes |
| Prod | Full HA (multi-AZ, auto-scaling, WAF) | ~$1,341/mes |

## Security

- **Encryption:** RDS/Redis/S3 at-rest + in-transit
- **Network:** VPC private subnets, Security Groups, WAF
- **IAM:** least-privilege per service
- **Auth:** Auth0 → Medplum token exchange → AccessPolicies
- **Audit:** CloudTrail + Medplum AuditEvent + 90-day retention
- **Compliance:** Ley 25.326 (Argentina) via Consent resource
