[English](README.md) · [Español](README.es-ES.md) · [Français](README.fr-FR.md)

# Product Forge — Extension SpecKit

> **Cycle de vie complet du produit :** Découverte des problèmes → Recherche → Spécifications du produit → Revalidation → SpecKit → Examen pré-implémentation → Implémentation → Révision du code → Vérifier → Test → Préparation à la publication → **Documents API · Sécurité · Analyses · Rétrospective**

Product Forge est une extension [SpecKit](https://github.com/github/spec-kit) qui ajoute un
terminer la **découverte de produits, les spécifications et le pipeline de qualité** avant et après tout SpecKit
travail de mise en œuvre. Au lieu de passer directement à spec.md, vous recherchez d'abord les concurrents, l'UX
modèles et votre base de code - rédiger une spécification de produit approuvée - examiner la conception/l'architecture/les risques -
laissez SpecKit l'implémenter avec une vérification progressive - exécutez une révision du code multi-agent - puis
générer et exécuter automatiquement des tests Playwright avec une boucle de correction de bugs jusqu'à ce que la fonctionnalité soit prête à être livrée.

**Nouveau dans la version 1.5.0 :**

- **Vue du portefeuille** pour toutes les fonctionnalités : matrice de conflits, graphique de dépendances, ordre de fusion suggéré (`/speckit.product-forge.portfolio`).
- **Champ brun `backfill`** — rétro-ingénierie d'un dossier de fonctionnalités à partir du code existant avec un rapport sur les lacunes.
- **Mode Lite** — Cycle de vie en 5 phases pour les petites fonctionnalités et les corrections de bugs (`feature_mode: lite`).
- **Configuration de surveillance de la phase 9.5**, **plan de migration de la phase 5.5**, **récolte i18n après le pont**, **conception d'expérience de la phase 9B** et **nettoyage des indicateurs de fonctionnalités** transversaux — tous opt-in et produisant des artefacts.
- **Schéma v3** pour `.forge-status.yml` (additif sur v2, aucune action requise).
- Le **protocole State-lock** empêche la corruption des auteurs simultanés.
- Les **résumés par phase** maintiennent les budgets contextuels à un faible niveau tout au long des longs cycles de vie.
- **Boucle d'apprentissage** via `.product-forge/lessons.md` — les rétrospectives enseignent la recherche.
- **Politique de motif de saut** et **budget de dérive de synchronisation et de vérification** avec résolution automatique cosmétique opt-in.
- **La préparation à la sortie crée en fait** un tableau de bord de surveillance et un registre d'indicateurs au lieu de simplement les vérifier.

Liste complète des modifications dans [CHANGELOG.md](./CHANGELOG.md).

**Nouveau dans la version 1.4.0 :** Vérification des événements EDA en phase de pont, découverte des dépendances entre les fonctionnalités, analyse des contraintes de base de code dans la recherche, vérification automatique de la conformité à la constitution dans le plan et format review.md unifié avec journal des décisions et historique des modifications.

**Nouveau dans la version 1.3.0 :** Vérification de la synchronisation entre les artefacts, porte de révision avant la mise en œuvre, phase de révision du code,
liste de contrôle de préparation à la publication, gestion des demandes de changement, piste d'audit de porte et vérification progressive.

## Pourquoi Product Forge ?

Le SpecKit standard commence à partir d’une description des fonctionnalités. Product Forge part d'une idée de fonctionnalité et :

1. **Découvre** si le problème est réel : analyse JTBD, script d'entretien, Go/No-go avant le début de toute recherche
2. **Recherches** les concurrents, les meilleures pratiques UX et votre base de code en parallèle — guidées par des hypothèses validées
3. **Crée** des documents produits structurés : parcours utilisateur, wireframes, maquettes, métriques
4. **Revalide** tout avec vous via une boucle d'approbation jusqu'à ce que les spécifications soient parfaites
5. **Relie** les spécifications du produit dans spec.md de SpecKit — enrichi de tout le contexte de recherche
6. **Planifie, met en œuvre et vérifie** à l'aide de SpecKit avec une traçabilité complète jusqu'à la recherche originale
7. **Génère automatiquement des tests Playwright** à partir des user stories, les exécute via `playwright-cli`, corrige les bogues P0/P1 et produit un rapport de test
8. **Génère des documents API** (OpenAPI 3.1 + Postman), exécute un **audit de sécurité OWASP** et crée un **plan de suivi analytique** avec des extraits du SDK
9. **Exécute une rétrospective post-lancement** comparant les KPI prévus aux données réelles de NewRelic/Analytics

Le résultat : une **chaîne de traçabilité complète** — problème → recherche → spécifications du produit → spec.md → plan → tâches → code → tests → métriques.

## Commandes

| Commande                                      | Phases             | Descriptif                                                                                                                                             |
| --------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/speckit.product-forge.forge`                | Tout               | **Commande principale.** Orchestrateur de cycle de vie complet avec portes humaines                                                                    |
| `/speckit.product-forge.problem-discovery`    | 0                  | Valider le problème : analyse JTBD, script d'entretien, Go/No-go                                                                                       |
| `/speckit.product-forge.research`             | 1                  | Recherche parallèle : concurrents, UX, codebase (+ contraintes & modèles d'événements) **[v1.4]**                                                      |
| `/speckit.product-forge.product-spec`         | 2                  | Création interactive de spécifications de produits avec détails configurables                                                                          |
| `/speckit.product-forge.revalidate`           | 3                  | Boucle de révision itérative – Journal des décisions, historique des modifications, suivi OQR **[v1.4]**                                               |
| `/speckit.product-forge.bridge`               | 4                  | Découverte des dépendances → spec.md avec vérification EDA, contrats NFR, spécification de test **[v1.4]**                                             |
| `/speckit.product-forge.plan`                 | 5                  | Plan technique + vérification automatique de la conformité de la Constitution + validation croisée **[v1.4]**                                          |
| `/speckit.product-forge.tasks`                | 5B                 | Générer une répartition des tâches à partir de plan.md — autonome, quitte après approbation                                                            |
| `/speckit.product-forge.pre-impl-review`      | 5C                 | **[NOUVEAU]** Revue de conception + revue d'architecture + évaluation des risques avant codage                                                         |
| `/speckit.product-forge.implement`            | 6                  | Exécuter la mise en œuvre avec des points de contrôle de vérification progressifs                                                                      |
| `/speckit.product-forge.code-review`          | 6B                 | **[NOUVEAU]** Revue de code multi-agent : qualité, sécurité, modèles, couverture des tests                                                             |
| `/speckit.product-forge.verify-full`          | 7                  | Vérification complète de la traçabilité : code ↔ recherche                                                                                             |
| `/speckit.product-forge.test-plan`            | 8A                 | Générez automatiquement des cas de test et des spécifications Playwright à partir des user stories                                                     |
| `/speckit.product-forge.test-run`             | 8B                 | Exécutez des tests avec playwright-cli, corrigez automatiquement les bugs, bouclez jusqu'à la fin                                                      |
| `/speckit.product-forge.release-readiness`    | 9                  | **[NOUVEAU]** Liste de contrôle avant expédition : indicateurs de fonctionnalités, déploiement, documents, surveillance                                |
| `/speckit.product-forge.sync-verify`          | transversale       | **[NOUVEAU]** Vérification de la cohérence des artefacts à 7 couches, exécutable entre toutes les phases                                               |
| `/speckit.product-forge.change-request`       | transversale       | **[NOUVEAU]** Modification formelle de la portée avec analyse d'impact et propagation des artefacts                                                    |
| `/speckit.product-forge.api-docs`             | post-impl          | Générez la spécification OpenAPI 3.1 + la collection Postman à partir de plan.md                                                                       |
| `/speckit.product-forge.security-check`       | post-impl          | Audit OWASP étendu aux surfaces détectées (authentification, saisie, paiements)                                                                        |
| `/speckit.product-forge.tracking-plan`        | post-spécification | Événements d'analyse, entonnoirs, schémas de propriété + extraits de code SDK                                                                          |
| `/speckit.product-forge.retrospective`        | post-lancement     | Mesures prévues et réelles, précision de la recherche, enseignements tirés (ajouté à `.product-forge/lessons.md`) **[UPD v1.5]**                       |
| `/speckit.product-forge.status`               | —                  | Afficher l'état du cycle de vie, la piste d'audit des portes, l'historique de synchronisation                                                          |
| `/speckit.product-forge.portfolio`            | transversale       | **[NOUVEAU v1.5]** Vue multi-fonctionnalités : tableau, matrice de conflits de fichiers, graphique de dépendances, ordre de fusion                     |
| `/speckit.product-forge.backfill`             | entrée alt         | **[NOUVEAU v1.5]** Rétro-ingénierie d'un module existant dans un dossier de fonctionnalités avec rapport sur les lacunes                               |
| `/speckit.product-forge.monitoring-setup`     | 9.5                | **[NOUVEAU v1.5]** Créez un véritable tableau de bord JSON, des alertes, une documentation SLO. Enveloppes `newrelic-dashboard-builder`                |
| `/speckit.product-forge.migration-plan`       | 5.5                | **[NOUVEAU v1.5]** Plan de migration sans temps d'arrêt avec transfert/annulation/validation/remplissage lorsque plan.md a des modifications de schéma |
| `/speckit.product-forge.i18n-harvest`         | post-pont          | **[NOUVEAU v1.5]** Extraire les chaînes des wireframes/spec, stub chaque locale                                                                        |
| `/speckit.product-forge.experiment-design`    | 9B                 | **[NOUVEAU v1.5]** Plan A/B préenregistré — hypothèse, MDE, taille d'échantillon, règle de décision                                                    |
| `/speckit.product-forge.feature-flag-cleanup` | transversale       | **[NOUVEAU v1.5]** Scannez `flags/registry.yml` pour les drapeaux périmés, produisez des recettes de suppression                                       |

## Cycle de vie

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

## Structure des fichiers de fonctionnalités

Chaque fonctionnalité reçoit un dossier dédié avec une structure cohérente :

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

## Installation

### Installer (dernière version)

```bash
specify extension add product-forge --from https://github.com/VaiYav/speckit-product-forge/archive/refs/heads/main.zip
```

### Installer (version spécifique)

```bash
specify extension add product-forge --from https://github.com/VaiYav/speckit-product-forge/archive/refs/tags/v1.5.1.zip
```

### Mise à jour vers la dernière version

```bash
specify extension update product-forge --from https://github.com/VaiYav/speckit-product-forge/archive/refs/heads/main.zip
```

### Mise à jour vers une version spécifique

```bash
specify extension update product-forge --from https://github.com/VaiYav/speckit-product-forge/archive/refs/tags/v1.5.1.zip
```

### Vérifier l'installation

```bash
specify extension list
# Should show: product-forge  v1.5.1  enabled
```

### Après l'installation : configurez votre projet

Copiez le modèle de configuration à la racine de votre projet :

```bash
mkdir -p .product-forge
cp $(specify extension path product-forge)/config-template.yml .product-forge/config.yml
```

Modifier `.product-forge/config.yml` :

```yaml
project_name: "My App"
project_tech_stack: "Node.js + Express + Postgres"
project_domain: "mobile fitness app"
codebase_path: "./src"
features_dir: "features"
default_speckit_mode: "ask" # classic | v-model | ask
```

### Exécuter

```
/speckit.product-forge.forge Build a push notification preferences screen
```

## Configuration

Voir [config-template.yml](./config-template.yml) et [docs/config.md](./docs/config.md) pour toutes les options.

Paramètres clés :

- `project_name` — utilisé dans toutes les invites de recherche
- `project_tech_stack` — aide les agents de recherche technologique
- `codebase_path` — requis pour l'analyse de la base de code et les maquettes de style projet
- `default_wireframe_detail` — `text` / `basic-html` / `detailed-html`
- `default_speckit_mode` — `ask` / `classic` / `v-model`

## Exigences

- **SpecKit** >= 0.1.0
- **Agent avec capacités de recherche sur le Web** — pour la phase de recherche (Phases 1)
- **Agent avec accès au système de fichiers** — pour l'analyse de la base de code et la création d'artefacts

### Mode V-Model (facultatif, requis uniquement pour `feature_mode: v-model`)

- **[`leocamello/spec-kit-v-model`](https://github.com/leocamello/spec-kit-v-model)** >= 0.5.0 — extension SpecKit externe qui
  implémente la progression formelle des artefacts du modèle V (exigences →
  système / architecture / conception de modules, associé au système / intégration /
  plans de tests unitaires, points de contrôle de trace, examen par les pairs, ingestion des résultats de tests,
  rapport d'audit). Product Forge délègue les phases V1 à V13 à ce plugin lorsque
  `feature_mode: v-model` est sélectionné.

Installer :

  ```bash
  specify extension add v-model \
    --from https://github.com/leocamello/spec-kit-v-model/archive/refs/tags/v0.5.0.zip
  ```

> **Dépendance matérielle uniquement pour le mode v-model.** Sans ce plugin,
> Les modes `lite` et `standard` fonctionnent exactement de la même manière : rien ne se dégrade.
> Lorsque vous appelez `/speckit.product-forge.forge --mode=v-model` sans
> là, l'orchestrateur abandonne avec la commande install ci-dessus et fait
> **ne** pas revenir silencieusement au mode standard. C'est intentionnel...
> travaux réglementés / critiques pour la sécurité (médical CEI 62304, automobile
> ISO 26262, avionique DO-178C) ne doit pas être expédié sans l'accord formel
> artefacts. La sélection de domaine réside dans `v-model-config.yml` au
> racine du projet et est lu par les commandes déléguées. Plein débit entrant
> [docs/v-model-integration.md](./docs/v-model-integration.md).

### Phases 8A à 8B : tests

- **[`playwright-cli`](https://github.com/microsoft/playwright-cli)** — agent de navigateur interactif utilisé par Phase 8B (`test-run`) pour exécuter des cas de test étape par étape, capturer des captures d'écran, enregistrer des traces et gérer les sessions d'authentification.

Installer :

  ```bash
  npm install -g playwright-cli
  ```

- **Navigateurs Playwright** — requis pour les exécutions CI/CD `playwright-cli` (pilotées par agent) et `.spec.ts` :
  ```bash
  npx playwright install
  ```

> **Remarque :** Les phases 8A et 8B sont facultatives. Si vous sautez les phases de test, `playwright-cli` n'est pas nécessaire.

## Licence

MIT — voir [LICENCE](./LICENSE)

## Auteur

Valentin Yakovlev — [github.com/VaiYav](https://github.com/VaiYav)

Les contributions sont les bienvenues. Voir [CHANGELOG.md](./CHANGELOG.md) pour l'historique des versions.
