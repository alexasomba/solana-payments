[English](README.md) · [Español](README.es-ES.md) · [Français](README.fr-FR.md)

# Product Forge — Extensión para SpecKit

> **Ciclo de vida completo del producto:** Descubrimiento del problema → Investigación → Especificación del producto → Revalidación → SpecKit → Revisión previa a la implementación → Implementación → Revisión de código → Verificación → Pruebas → Preparación para el lanzamiento → **Documentación de API · Seguridad · Analítica · Retrospectiva**

Product Forge es una extensión de [SpecKit](https://github.com/github/spec-kit) que añade un
proceso integral de **descubrimiento, especificación y control de calidad del producto**, tanto antes como después de cualquier trabajo de implementación con SpecKit. En lugar de pasar directamente a `spec.md`, primero investigas a la competencia, los patrones de UX y tu propia base de código; elaboras una especificación de producto aprobada; revisas el diseño, la arquitectura y los riesgos; permites que SpecKit realice la implementación con verificación progresiva; ejecutas una revisión de código mediante agentes múltiples; y, finalmente, generas y ejecutas automáticamente pruebas con Playwright, incluyendo un ciclo de corrección de errores hasta que la funcionalidad esté lista para su lanzamiento.

**Novedades en la versión 1.5.0:**

- **Vista de portafolio** para todas las funcionalidades: matriz de conflictos, grafo de dependencias y sugerencias de orden de integración (`/speckit.product-forge.portfolio`).
- **Soporte para proyectos existentes (brown-field)** (`backfill`): ingeniería inversa de una carpeta de funcionalidades a partir de código ya existente, con un informe de brechas (gaps).
- **Modo ligero (Lite mode)**: ciclo de vida de 5 fases para funcionalidades pequeñas y corrección de errores (`feature_mode: lite`).
- **Fase 9.5 (configuración de monitorización)**, **Fase 5.5 (plan de migración)**, **extracción de i18n (internacionalización)**, **Fase 9B (diseño de experimentos)** y limpieza transversal de **flags de funcionalidades (feature flags)**; todas son opcionales y generan artefactos específicos.
- **Esquema v3** (`.forge-status.yml`): compatible con la versión v2 (añade funcionalidades sin requerir acciones adicionales).
- **Protocolo de bloqueo de estado (state-lock)**: evita la corrupción de datos ante escrituras concurrentes.
- Los **resúmenes por fase** mantienen acotados los presupuestos de contexto a lo largo de ciclos de vida extensos.
- **Bucle de aprendizaje** mediante `.product-forge/lessons.md`: las retrospectivas sirven como base para la investigación.
- **Política de motivos de omisión** y **presupuesto de desviación (drift budget) con verificación de sincronización**, incluyendo una opción de resolución automática para cambios menores (cosméticos).
- La **preparación para el lanzamiento (release-readiness)** no se limita a verificar, sino que genera activamente paneles de monitorización y registros de indicadores (flags).

Lista completa de cambios en [CHANGELOG.md](./CHANGELOG.md).

**Novedades en la v1.4.0:** Verificación de eventos EDA en la fase de puente (bridge phase), detección de dependencias entre funcionalidades, análisis de restricciones en el código base durante la fase de investigación, comprobación automática del cumplimiento de la normativa (Constitution Compliance) en la fase de planificación, y un formato unificado `review.md` que incluye el registro de decisiones y el historial de cambios.

**Novedades en la v1.3.0:** Verificación de sincronización entre artefactos, etapa de revisión previa a la implementación, fase de revisión de código, lista de verificación para la preparación del lanzamiento, gestión de solicitudes de cambio, registro de auditoría de las etapas de control (gates) y verificación progresiva.

## ¿Por qué Product Forge?

El SpecKit estándar parte de la descripción de una funcionalidad. Product Forge parte de una idea para una funcionalidad y realiza lo siguiente:

1. **Detecta** si el problema es real: análisis de «trabajos por realizar» (JTBD), guion de entrevistas y evaluación de viabilidad (Go/No-go) antes de iniciar cualquier investigación.
2. **Investiga** a la competencia, las mejores prácticas de UX y tu base de código de forma paralela, guiándose por hipótesis validadas.
3. **Crea** documentación de producto estructurada: recorridos de usuario (user journeys), esquemas (wireframes), prototipos visuales (mockups) y métricas.
4. **Revalida** todo contigo mediante un proceso de aprobación iterativo hasta que la especificación sea perfecta.
5. **Traslada** la especificación del producto al archivo `spec.md` de SpecKit, enriqueciéndolo con todo el contexto obtenido durante la investigación.
6. **Planifica, implementa y verifica** utilizando SpecKit, manteniendo una trazabilidad completa hasta la investigación original.
7. **Genera automáticamente pruebas de Playwright** a partir de las historias de usuario, las ejecuta mediante `playwright-cli`, corrige errores críticos (P0/P1) y elabora un informe de pruebas.
8. **Genera documentación de API** (OpenAPI 3.1 + Postman), realiza una **auditoría de seguridad OWASP** y crea un **plan de seguimiento de analíticas** que incluye fragmentos de código (snippets) para el SDK.
9. **Realiza una retrospectiva tras el lanzamiento**, comparando los KPI previstos con los datos reales obtenidos de NewRelic o herramientas de analítica.

El resultado: una **cadena de trazabilidad completa** — problema → investigación → especificación de producto → `spec.md` → plan → tareas → código → pruebas → métricas.

## Comandos

| Comando                                       | Fase                | Descripción                                                                                                                                                                                                       |
| --------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/speckit.product-forge.forge`                | Todos               | **Comando principal.** Orquestador de ciclo de vida completo con puntos de control humanos                                                                                                                        |
| `/speckit.product-forge.problem-discovery`    | 0                   | Validación del problema: análisis JTBD, guion de entrevistas, decisión de continuar/detener (Go/No-go)                                                                                                            |
| `/speckit.product-forge.research`             | 1                   | Investigación paralela: competidores, UX, base de código (+ restricciones y patrones de eventos) **[v1.4]**                                                                                                       |
| `/speckit.product-forge.product-spec`         | 2                   | Creación interactiva de especificaciones de producto con nivel de detalle configurable                                                                                                                            |
| `/speckit.product-forge.revalidate`           | 3                   | Ciclo de revisión iterativo: registro de decisiones, historial de cambios, seguimiento de OQR **[v1.4]**                                                                                                          |
| `/speckit.product-forge.bridge`               | 4                   | Detección de dependencias → `spec.md` con verificación EDA, contratos NFR, especificación de pruebas **[v1.4]**                                                                                                   |
| `/speckit.product-forge.plan`                 | 5                   | Plan técnico + verificación automática de cumplimiento de la «Constitución» + validación cruzada **[v1.4]**                                                                                                       |
| `/speckit.product-forge.tasks`                | 5B                  | Generación del desglose de tareas a partir de `plan.md` (proceso independiente; finaliza tras la aprobación)                                                                                                      |
| `/speckit.product-forge.pre-impl-review`      | 5C                  | **[NUEVO]** Revisión de diseño, arquitectura y evaluación de riesgos previa a la codificación                                                                                                                     |
| `/speckit.product-forge.implement`            | 6                   | Ejecución de la implementación con puntos de verificación progresivos                                                                                                                                             |
| `/speckit.product-forge.code-review`          | 6B                  | **[NUEVO]** Revisión de código multiagente: calidad, seguridad, patrones, cobertura de pruebas                                                                                                                    |
| `/speckit.product-forge.verify-full`          | 7                   | Verificación de trazabilidad completa: código ↔ investigación                                                                                                                                                     |
| `/speckit.product-forge.test-plan`            | 8A                  | Generación automática de casos de prueba y especificaciones de Playwright a partir de historias de usuario                                                                                                        |
| `/speckit.product-forge.test-run`             | 8B                  | Ejecución de pruebas con playwright-cli, corrección automática de errores, bucle hasta completar                                                                                                                  |
| `/speckit.product-forge.release-readiness`    | 9                   | **[NUEVO]** Lista de verificación previa al lanzamiento: indicadores de funciones (feature flags), despliegue, documentación, monitoreo                                                                           |
| `/speckit.product-forge.sync-verify`          | transversal         | **[NUEVO]** Verificación de consistencia de artefactos en 7 capas, ejecutable entre cualquier fase                                                                                                                |
| `/speckit.product-forge.change-request`       | transversal         | **[NUEVO]** Cambio de alcance formal con análisis de impacto y propagación de artefactos                                                                                                                          |
| `/speckit.product-forge.api-docs`             | post-implementación | Generación de especificación OpenAPI 3.1 + colección de Postman a partir de plan.md                                                                                                                               |
| `/speckit.product-forge.security-check`       | post-implementación | Auditoría OWASP centrada en las superficies detectadas (autenticación, entradas, pagos)                                                                                                                           |
| `/speckit.product-forge.tracking-plan`        | post-especificación | Eventos de analítica, embudos, esquemas de propiedades + fragmentos de código para SDK                                                                                                                            |
| `/speckit.product-forge.retrospective`        | post-lanzamiento    | Métricas previstas frente a las reales, precisión de la investigación, lecciones aprendidas (se añade a `.product-forge/lessons.md`) **[ACT v1.5]**                                                               |
| `/speckit.product-forge.status`               | —                   | Muestra el estado del ciclo de vida, el registro de auditoría de hitos (gate audit trail) y el historial de sincronización.                                                                                       |
| `/speckit.product-forge.portfolio`            | transversal         | **[NUEVO v1.5]** Vista multifuncional: tabla, matriz de conflictos de archivos, grafo de dependencias y orden de integración (merge).                                                                             |
| `/speckit.product-forge.backfill`             | entrada alt.        | **[NUEVO v1.5]** Ingeniería inversa de un módulo existente hacia una carpeta de funcionalidad (feature folder), con informe de brechas.                                                                           |
| `/speckit.product-forge.monitoring-setup`     | 9.5                 | **[NUEVO v1.5]** Generación de JSON para paneles (dashboards), alertas y documentación de SLO. Incluye `newrelic-dashboard-builder`.                                                                              |
| `/speckit.product-forge.migration-plan`       | 5.5                 | **[NUEVO v1.5]** Plan de migración sin tiempo de inactividad (zero-downtime), que incluye avance, reversión (rollback), validación y relleno de datos (backfill) cuando `plan.md` contiene cambios en el esquema. |
| `/speckit.product-forge.i18n-harvest`         | post-bridge         | **[NUEVO v1.5]** Extracción de cadenas de texto desde wireframes o especificaciones, con creación de stubs para cada configuración regional (locale).                                                             |
| `/speckit.product-forge.experiment-design`    | 9B                  | **[NUEVO v1.5]** Plan A/B pre-registrado: incluye hipótesis, MDE (efecto mínimo detectable), tamaño de muestra y regla de decisión.                                                                               |
| `/speckit.product-forge.feature-flag-cleanup` | transversal         | **[NUEVO v1.5]** Análisis de `flags/registry.yml` para detectar flags obsoletos y generar instrucciones para su eliminación.                                                                                      |

## Ciclo de vida

```
  Idea
   │
   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 0: Problem Discovery  [OPTIONAL but recommended]                      │
│  /speckit.product-forge.problem-discovery                                    │
│                                                                              │
│  JTBD Analysis · Problem Statement Canvas · Interview Script                │
│  Competing Forces · Go / Investigate further / No-go decision               │
│  Outputs hypotheses H1–HN that guide Phase 1 research agents                │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼ [Human gate: Go decision]
   │
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: Research                                                           │
│  /speckit.product-forge.research                                                     │
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────────┐        │
│  │ Competitor       │  │ UX/UI Patterns  │  │ Codebase Analysis    │        │
│  │ Analysis         │  │ Research        │  │ + Constraints +      │        │
│  │ [MANDATORY]      │  │ [MANDATORY]     │  │ Event Patterns [MND] │        │
│  └─────────────────┘  └─────────────────┘  └──────────────────────┘        │
│  ┌─────────────────┐  ┌─────────────────┐                                   │
│  │ Tech Stack       │  │ Metrics / ROI   │                                   │
│  │ Research         │  │ Analysis        │                                   │
│  │ [OPTIONAL]       │  │ [OPTIONAL]      │                                   │
│  └─────────────────┘  └─────────────────┘                                   │
│                              ↓ research/README.md                            │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼ [Human gate: approve research]
   │
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 2: Product Spec                                                       │
│  /speckit.product-forge.product-spec                                                 │
│                                                                              │
│  Asks: detail level · decomposition · mockup style                          │
│                                                                              │
│  Creates:                                                                    │
│  product-spec.md · user-journey*.md · wireframes* · metrics.md · mockups/   │
│  All linked via product-spec/README.md                                       │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼ [Human gate: approve product spec]
   │
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 3: Revalidation                                                       │
│  /speckit.product-forge.revalidate                                                   │
│                                                                              │
│  Loop: show summary → collect feedback → apply changes → confirm            │
│  Exits only on explicit user approval                                        │
│  Revisions logged in review.md: Decision Log + Change History + OQR [v1.4] │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼ [Human gate: "APPROVED"]
   │
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 4: SpecKit Bridge                                                [v1.4] │
│  /speckit.product-forge.bridge                                                       │
│                                                                              │
│  Dependency Discovery → Synthesizes all artifacts → spec.md (enriched)     │
│  EDA Event Verification · NFR Measurement Contract · Testing Specification  │
│  User chooses: Classic (plan → tasks → impl) or V-Model (full traceability) │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼ [Human gate: approve spec.md]
   │
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 5: Plan                                                        [v1.4]  │
│  /speckit.product-forge.plan                                                 │
│                                                                              │
│  SpecKit plan → Constitution Compliance auto-check → cross-validate → approve │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼ [Human gate: approve plan]  ← extension point: insert custom step here
   │
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 5B: Tasks                                                             │
│  /speckit.product-forge.tasks                                                │
│                                                                              │
│  SpecKit tasks → cross-validate vs product-spec → approve                  │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼ [Human gate: approve tasks]  ← extension point: insert custom step here
   │
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 5C: Pre-Implementation Review  [OPTIONAL but recommended]  [NEW v1.3] │
│  /speckit.product-forge.pre-impl-review                                      │
│                                                                              │
│  Design Review · Architecture Review · Risk Assessment                       │
│  State completeness · UX compliance · NFR coverage · Risk register          │
│  Rollout strategy recommendation                                            │
│  Outputs: pre-impl-review.md                                                │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼ [Human gate: approve review]  ← extension point: insert custom step here
   │
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 6: Implementation (with Progressive Verification)         [UPD v1.3]  │
│  /speckit.product-forge.implement                                            │
│                                                                              │
│  SpecKit implement — anchored to product-spec wireframes + user journeys    │
│  Mini-verify every N tasks: task-code, spec drift, unplanned changes        │
│  Outputs: implementation-log.md with checkpoint results                     │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼ [Human gate: implementation complete]
   │
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 6B: Code Review  [OPTIONAL but recommended]               [NEW v1.3]  │
│  /speckit.product-forge.code-review                                          │
│                                                                              │
│  Parallel agents: Quality · Security · Patterns · Tests                     │
│  Enriched with Product Forge context (ux-patterns, codebase-analysis)       │
│  Outputs: code-review.md with findings by severity                          │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼ [Human gate: approve code review]  ← extension point: insert custom step here
   │
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 7: Full Verification                                                  │
│  /speckit.product-forge.verify-full                                          │
│                                                                              │
│  Code ↔ Tasks ↔ Plan ↔ spec.md ↔ product-spec ↔ research                  │
│  Produces: verify-report.md with CRITICAL / WARNING / PASSED                │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼ [Human gate: "Run test phases?" — optional but recommended]
   │
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 8A: Test Plan  [OPTIONAL]                                             │
│  /speckit.product-forge.test-plan                                                    │
│                                                                              │
│  Auto-detects framework, ports, env vars                                     │
│  Generates: smoke / E2E / API / regression test cases                       │
│  Writes Playwright .spec.ts files with US-NNN traceability                  │
│  Creates: testing/test-plan.md · testing/test-cases.md · bugs/README.md     │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼ [Human gate: approve test plan]
   │
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 8B: Test Execution  [OPTIONAL]                                        │
│  /speckit.product-forge.test-run                                                     │
│                                                                              │
│  Smoke → E2E → API → Regression (ordered, smoke blocks on failure)          │
│  Per bug: bugs/BUG-NNN.md with evidence + gap analysis                      │
│  Auto-fix loop: P0/P1 bugs fixed → retested → smoke regression check        │
│  Exit: ≥80% pass rate + zero P0/P1 open bugs                                │
│  Produces: test-report.md with full traceability chain                      │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼ [Human gate: "Run release readiness?" — optional but recommended]
   │
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 9: Release Readiness  [OPTIONAL]                          [NEW v1.3]  │
│  /speckit.product-forge.release-readiness                                    │
│                                                                              │
│  Feature flags · Rollout strategy · Rollback plan                           │
│  Documentation · Monitoring · Analytics · Dependencies                       │
│  Consolidates api-docs + security-check + tracking-plan status              │
│  Outputs: release-readiness.md with READY / CONDITIONAL / NOT READY         │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  CROSS-CUTTING COMMANDS  [Runnable at any time]                  [NEW v1.3]  │
│                                                                              │
│  /speckit.product-forge.sync-verify                                          │
│  7-layer consistency check across all artifacts (forward + backward drift)   │
│  Auto-runs in quick mode between every phase transition                      │
│  Full run on demand or before Phase 7                                        │
│                                                                              │
│  /speckit.product-forge.change-request                                       │
│  Formal scope change: capture → impact analysis → effort delta → propagate  │
│  Traces changes with CR-NNN markers across all affected artifacts           │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  POST-IMPLEMENTATION COMMANDS  [Run in any order after Phase 6]              │
│                                                                              │
│  /speckit.product-forge.api-docs                                             │
│  OpenAPI 3.1 spec + Postman collection from plan.md contracts               │
│  Consistency check: plan vs implementation drift                             │
│                                                                              │
│  /speckit.product-forge.security-check                                       │
│  OWASP audit scoped to detected surfaces from plan.md                       │
│  Checks only: auth / input / payments / files / webhooks (as applicable)    │
│                                                                              │
│  /speckit.product-forge.tracking-plan                                        │
│  Analytics events from user journeys · Funnel definitions                   │
│  SDK code snippets (Mixpanel / Amplitude / PostHog / Firebase)              │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼ Ship ✅
   │
┌─────────────────────────────────────────────────────────────────────────────┐
│  POST-LAUNCH  [Run ≥14 days after shipping]                                  │
│  /speckit.product-forge.retrospective                                        │
│                                                                              │
│  Predicted vs actual metrics (from research/metrics-roi.md)                 │
│  NewRelic + Analytics MCP query · Research accuracy audit                   │
│  Lessons learned · Closes the full lifecycle loop                           │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼
  Done ✅  (Problem → Research → Spec → Reviewed → Code → Code Review → Verified → Tested → Ship Ready → Measured)
```

## Estructura de archivos de funcionalidades

Cada funcionalidad cuenta con una carpeta dedicada con una estructura coherente:

```
features/
└── my-feature-name/
    ├── README.md                          ← Feature index (all links)
    ├── .forge-status.yml                  ← Phase tracker
    │
    ├── problem-discovery/                 ← Phase 0 outputs (optional)
    │   ├── problem-statement.md           ← JTBD + Problem Canvas + Go/No-go
    │   └── interview-script.md            ← User interview guide
    │
    ├── research/
    │   ├── README.md                      ← Research index + executive summary
    │   ├── competitors.md
    │   ├── ux-patterns.md
    │   ├── codebase-analysis.md
    │   ├── tech-stack.md                  ← optional
    │   └── metrics-roi.md                 ← optional
    │
    ├── product-spec/
    │   ├── README.md                      ← Spec index + document map
    │   ├── product-spec.md                ← Main PRD (concise/standard/exhaustive)
    │   ├── user-journey.md                ← or user-journey-{name}.md × N
    │   ├── wireframes.md                  ← or wireframes/ folder × N screens
    │   ├── metrics.md                     ← optional
    │   └── mockups/                       ← optional
    │       ├── index.html
    │       └── mockup-{screen}.html × N
    │
    ├── spec.md                            ← SpecKit spec (generated in Phase 4)
    ├── plan.md                            ← SpecKit plan (Phase 5)
    ├── tasks.md                           ← SpecKit tasks (Phase 5B)
    ├── review.md                          ← Revalidation log (Phase 3)
    ├── pre-impl-review.md                 ← Design + arch + risk review (Phase 5C) [NEW v1.3]
    ├── implementation-log.md              ← Progressive verify log (Phase 6) [NEW v1.3]
    ├── code-review.md                     ← Multi-agent code review (Phase 6B) [NEW v1.3]
    ├── verify-report.md                   ← Verification report (Phase 7)
    │
    ├── testing/                           ← Phase 8A outputs (optional)
    │   ├── test-plan.md                   ← Master test plan + entry/exit criteria
    │   ├── test-cases.md                  ← All test cases (TC-SMK/E2E/API/REG-NNN)
    │   ├── env.md                         ← Credentials (gitignored)
    │   └── playwright-tests/
    │       ├── playwright.config.ts
    │       ├── {slug}-smoke.spec.ts
    │       ├── {slug}-e2e.spec.ts
    │       └── {slug}-regression.spec.ts
    │
    ├── bugs/                              ← Phase 8B outputs (optional)
    │   ├── README.md                      ← Bug dashboard (P0–P4 counts, status)
    │   └── BUG-NNN.md × N               ← One file per bug with evidence + fix log
    │
    ├── test-report.md                     ← Final test report (Phase 8B)
    │
    ├── api-docs/                          ← api-docs command outputs (optional)
    │   ├── openapi.yml                    ← OpenAPI 3.1 spec
    │   ├── postman-collection.json        ← Postman collection
    │   └── consistency-report.md         ← Plan vs implementation drift
    │
    ├── tracking/                          ← tracking-plan command outputs (optional)
    │   ├── tracking-plan.md              ← Event taxonomy + property schemas + funnels
    │   └── snippets.md                   ← Ready-to-paste SDK code snippets
    │
    ├── security-check.md                  ← OWASP audit report (optional)
    ├── release-readiness.md               ← Pre-ship checklist (Phase 9) [NEW v1.3]
    ├── retrospective.md                   ← Post-launch retrospective (optional)
    │
    ├── sync-report.md                     ← Latest sync-verify report [NEW v1.3]
    ├── sync-report.json                   ← Machine-readable sync data [NEW v1.3]
    ├── change-log.md                      ← Change request history [NEW v1.3]
    └── backlog.md                         ← Deferred changes (if any) [NEW v1.3]
```

## Instalación

### Instalación (última versión)

```bash
specify extension add product-forge --from https://github.com/VaiYav/speckit-product-forge/archive/refs/heads/main.zip
```

### Instalación (versión específica)

```bash
specify extension add product-forge --from https://github.com/VaiYav/speckit-product-forge/archive/refs/tags/v1.5.1.zip
```

### Actualización a la última versión

```bash
specify extension update product-forge --from https://github.com/VaiYav/speckit-product-forge/archive/refs/heads/main.zip
```

### Actualización a una versión específica

```bash
specify extension update product-forge --from https://github.com/VaiYav/speckit-product-forge/archive/refs/tags/v1.5.1.zip
```

### Verificación de la instalación

```bash
specify extension list
# Should show: product-forge  v1.5.1  enabled
```

### Tras la instalación: configuración del proyecto

Copia la plantilla de configuración en la raíz de tu proyecto:

```bash
mkdir -p .product-forge
cp $(specify extension path product-forge)/config-template.yml .product-forge/config.yml
```

Edita `.product-forge/config.yml`:

```yaml
project_name: "My App"
project_tech_stack: "Node.js + Express + Postgres"
project_domain: "mobile fitness app"
codebase_path: "./src"
features_dir: "features"
default_speckit_mode: "ask" # classic | v-model | ask
```

### Ejecución

```
/speckit.product-forge.forge Build a push notification preferences screen
```

## Configuración

Consulta [config-template.yml](./config-template.yml) y [docs/config.md](./docs/config.md) para ver todas las opciones disponibles. Configuraciones clave:

- `project_name` — utilizado en todas las instrucciones (prompts) de investigación
- `project_tech_stack` — ayuda a los agentes de investigación técnica
- `codebase_path` — necesario para el análisis del código fuente y la creación de prototipos (mockups) a nivel de proyecto
- `default_wireframe_detail` — `text` / `basic-html` / `detailed-html`
- `default_speckit_mode` — `ask` / `classic` / `v-model`

## Requisitos

- **SpecKit** >= 0.1.0
- **Agente con capacidades de búsqueda web** — para la fase de investigación (Fase 1)
- **Agente con acceso al sistema de archivos** — para el análisis del código fuente y la creación de artefactos

### Modo V-Model (opcional; requerido solo para `feature_mode: v-model`)

- **[`leocamello/spec-kit-v-model`](https://github.com/leocamello/spec-kit-v-model)** >= 0.5.0 — extensión externa de SpecKit que
  implementa la progresión formal de artefactos según el modelo en V (requisitos →
  diseño del sistema / arquitectura / módulos, junto con planes de prueba
  del sistema / integración / unidades, puntos de control de trazabilidad,
  revisión por pares, incorporación de resultados de pruebas e informes de auditoría).
  Product Forge delega las fases V1–V13 a este complemento cuando
  se selecciona `feature_mode: v-model`. Instalación:

  ```bash
  specify extension add v-model \
    --from https://github.com/leocamello/spec-kit-v-model/archive/refs/tags/v0.5.0.zip
  ```

> **Dependencia obligatoria solo para el modo v-model.** Sin este plugin,
> los modos `lite` y `standard` funcionan exactamente igual; no hay pérdida de funcionalidad.
> Si se invoca `/speckit.product-forge.forge --mode=v-model` sin él,
> el orquestador se interrumpe (abortando la ejecución) y **no**
> recurre automáticamente al modo estándar. Esto es intencional:
> los proyectos sujetos a normativas o de seguridad crítica (norma médica IEC 62304,
> automotriz ISO 26262, aviónica DO-178C) no deben distribuirse sin
> los artefactos formales correspondientes. La selección del dominio se define en
> `v-model-config.yml`, en la raíz del proyecto, y es leída por los comandos delegados. El flujo completo se encuentra en
> [docs/v-model-integration.md](./docs/v-model-integration.md).

### Fases 8A–8B: Pruebas

- **[`playwright-cli`](https://github.com/microsoft/playwright-cli)** — agente de navegador interactivo utilizado por la Fase 8B (`test-run`) para ejecutar casos de prueba paso a paso, capturar pantallas, registrar trazas y gestionar sesiones de autenticación.

Instalación:

  ```bash
  npm install -g playwright-cli
  ```

- **Navegadores de Playwright** — necesarios tanto para `playwright-cli` (controlado por agente) como para las ejecuciones de CI/CD `.spec.ts`:
  ```bash
  npx playwright install
  ```

> **Nota:** Las fases 8A y 8B son opcionales. Si se omiten las fases de prueba, no es necesario `playwright-cli`.

## Licencia

MIT — ver [LICENSE](./LICENSE)

## Autor

Valentin Yakovlev — [github.com/VaiYav](https://github.com/VaiYav)

Se aceptan contribuciones. Consulta [CHANGELOG.md](./CHANGELOG.md) para ver el historial de versiones.
