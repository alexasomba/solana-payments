[English](README.md) · [Español](README.es-ES.md) · [Français](README.fr-FR.md)

# Extension du workflow de branchement Git

Initialisation du référentiel Git, création de branche de fonctionnalités, numérotation (séquentielle/horodatage), validation, détection à distance et validation automatique pour Spec Kit.

## Aperçu

Cette extension fournit des opérations Git en tant que module optionnel autonome. Il gère :

- **Initialisation du référentiel** avec messages de validation configurables
- **Création de branche de fonctionnalités** avec numérotation séquentielle (`001-feature-name`) ou horodatée (`20260319-143022-feature-name`)
- **Validation des branches** pour garantir que les branches respectent les conventions de dénomination
- **Détection à distance Git** pour l'intégration de GitHub (par exemple, création de problèmes)
- **Commit automatique** après les commandes principales (configurable par commande avec des messages personnalisés)

## Commandes

| Commande                 | Descriptif                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| `speckit.git.initialize` | Initialiser un dépôt Git avec un message de validation configurable                                     |
| `speckit.git.feature`    | Créer une branche de fonctionnalités avec une numérotation séquentielle ou horodatée                    |
| `speckit.git.validate`   | Valider la branche actuelle suit les conventions de dénomination des branches de fonctionnalités        |
| `speckit.git.remote`     | Détecter l'URL distante Git pour l'intégration GitHub                                                   |
| `speckit.git.commit`     | Modifications à validation automatique (activation/désactivation configurable par commande et messages) |

## Crochets

| Événement              | Commande                 | Facultatif | Descriptif                                                                  |
| ---------------------- | ------------------------ | ---------- | --------------------------------------------------------------------------- |
| `before_constitution`  | `speckit.git.initialize` | Non        | Init git repo avant la constitution                                         |
| `before_specify`       | `speckit.git.feature`    | Non        | Créer une branche de fonctionnalité avant la spécification                  |
| `before_clarify`       | `speckit.git.commit`     | Oui        | Valider les modifications en suspens avant clarification                    |
| `before_plan`          | `speckit.git.commit`     | Oui        | Valider les modifications en suspens avant de planifier                     |
| `before_tasks`         | `speckit.git.commit`     | Oui        | Valider les modifications en suspens avant la génération des tâches         |
| `before_implement`     | `speckit.git.commit`     | Oui        | Valider les modifications en suspens avant la mise en œuvre                 |
| `before_checklist`     | `speckit.git.commit`     | Oui        | Valider les modifications en suspens avant la liste de contrôle             |
| `before_analyze`       | `speckit.git.commit`     | Oui        | Valider les modifications en suspens avant l'analyse                        |
| `before_taskstoissues` | `speckit.git.commit`     | Oui        | Valider les modifications en attente avant la synchronisation des problèmes |
| `after_constitution`   | `speckit.git.commit`     | Oui        | Validation automatique après la mise à jour de la constitution              |
| `after_specify`        | `speckit.git.commit`     | Oui        | Validation automatique après spécification                                  |
| `after_clarify`        | `speckit.git.commit`     | Oui        | Validation automatique après clarification                                  |
| `after_plan`           | `speckit.git.commit`     | Oui        | Validation automatique après la planification                               |
| `after_tasks`          | `speckit.git.commit`     | Oui        | Validation automatique après génération de tâches                           |
| `after_implement`      | `speckit.git.commit`     | Oui        | Validation automatique après la mise en œuvre                               |
| `after_checklist`      | `speckit.git.commit`     | Oui        | Validation automatique après la liste de contrôle                           |
| `after_analyze`        | `speckit.git.commit`     | Oui        | Validation automatique après analyse                                        |
| `after_taskstoissues`  | `speckit.git.commit`     | Oui        | Validation automatique après la synchronisation des problèmes               |

## Configuration

La configuration est stockée dans `.specify/extensions/git/git-config.yml` :

```yaml
# Branch numbering strategy: "sequential" or "timestamp"
branch_numbering: sequential

# Custom commit message for git init
init_commit_message: "[Spec Kit] Initial commit"

# Auto-commit per command (all disabled by default)
# Example: enable auto-commit after specify
auto_commit:
  default: false
  after_specify:
    enabled: true
    message: "[Spec Kit] Add specification"
```

## Installation

```bash
# Install the bundled git extension (no network required)
specify extension add git
```

## Désactivation

```bash
# Disable the git extension (spec creation continues without branching)
specify extension disable git

# Re-enable it
specify extension enable git
```

## Dégradation gracieuse

Lorsque Git n'est pas installé ou que le répertoire n'est pas un dépôt Git :

- Les répertoires de spécifications sont toujours créés sous `specs/`
- La création de branche est ignorée avec un avertissement
- La validation de branche est ignorée avec un avertissement
- La détection à distance renvoie des résultats vides

## Scripts

L'extension regroupe des scripts multiplateformes :

- `scripts/bash/create-new-feature.sh` — Implémentation de Bash
- `scripts/bash/git-common.sh` — Utilitaires Git partagés (Bash)
- `scripts/powershell/create-new-feature.ps1` — Implémentation PowerShell
- `scripts/powershell/git-common.ps1` — Utilitaires Git partagés (PowerShell)
