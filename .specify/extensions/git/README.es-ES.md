[English](README.md) · [Español](README.es-ES.md) · [Français](README.fr-FR.md)

# Extensión de flujo de trabajo de ramificación (branching) en Git

Inicialización de repositorios Git, creación de ramas de funcionalidades (_feature branches_), numeración (secuencial o basada en marca de tiempo), validación, detección de repositorios remotos y confirmación automática (_auto-commit_) para Spec Kit.

## Descripción general

Esta extensión proporciona operaciones de Git como un módulo opcional e independiente. Gestiona:

- **Inicialización de repositorios** con mensajes de confirmación (_commit messages_) configurables.
- **Creación de ramas de funcionalidades** con numeración secuencial (`001-feature-name`) o basada en marca de tiempo (`20260319-143022-feature-name`).
- **Validación de ramas** para asegurar que sigan las convenciones de nomenclatura establecidas.
- **Detección de repositorios remotos** para la integración con GitHub (por ejemplo, para la creación de _issues_).
- **Confirmación automática (_auto-commit_)** tras la ejecución de comandos principales (configurable por comando, con mensajes personalizados).

## Comandos

| Comando                  | Descripción                                                                                                                                                    |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `speckit.git.initialize` | Inicializa un repositorio Git con un mensaje de confirmación configurable.                                                                                     |
| `speckit.git.feature`    | Crea una rama de funcionalidad con numeración secuencial o basada en marca de tiempo.                                                                          |
| `speckit.git.validate`   | Valida que la rama actual siga las convenciones de nomenclatura para ramas de funcionalidades.                                                                 |
| `speckit.git.remote`     | Detecta la URL del repositorio remoto de Git para la integración con GitHub.                                                                                   |
| `speckit.git.commit`     | Realiza una confirmación automática (_auto-commit_) de los cambios (configurable por comando, con opción de habilitar/deshabilitar y mensajes personalizados). |

## _Hooks_ (puntos de enganche)

| Evento                 | Comando                  | Opcional | Descripción                                                            |
| ---------------------- | ------------------------ | -------- | ---------------------------------------------------------------------- |
| `before_constitution`  | `speckit.git.initialize` | No       | Inicializa el repositorio Git antes de la constitución.                |
| `before_specify`       | `speckit.git.feature`    | No       | Crear rama de funcionalidad antes de la especificación                 |
| `before_clarify`       | `speckit.git.commit`     | Sí       | Confirmar cambios pendientes antes de la aclaración                    |
| `before_plan`          | `speckit.git.commit`     | Sí       | Confirmar cambios pendientes antes de la planificación                 |
| `before_tasks`         | `speckit.git.commit`     | Sí       | Confirmar cambios pendientes antes de la generación de tareas          |
| `before_implement`     | `speckit.git.commit`     | Sí       | Confirmar cambios pendientes antes de la implementación                |
| `before_checklist`     | `speckit.git.commit`     | Sí       | Confirmar cambios pendientes antes de la lista de verificación         |
| `before_analyze`       | `speckit.git.commit`     | Sí       | Confirmar cambios pendientes antes del análisis                        |
| `before_taskstoissues` | `speckit.git.commit`     | Sí       | Confirmar cambios pendientes antes de la sincronización de incidencias |
| `after_constitution`   | `speckit.git.commit`     | Sí       | Confirmación automática tras la actualización de la constitución       |
| `after_specify`        | `speckit.git.commit`     | Sí       | Confirmación automática tras la especificación                         |
| `after_clarify`        | `speckit.git.commit`     | Sí       | Confirmación automática tras la aclaración                             |
| `after_plan`           | `speckit.git.commit`     | Sí       | Confirmación automática tras la planificación                          |
| `after_tasks`          | `speckit.git.commit`     | Sí       | Confirmación automática tras la generación de tareas                   |
| `after_implement`      | `speckit.git.commit`     | Sí       | Confirmación automática tras la implementación                         |
| `after_checklist`      | `speckit.git.commit`     | Sí       | Confirmación automática tras la lista de verificación                  |
| `after_analyze`        | `speckit.git.commit`     | Sí       | Confirmación automática tras el análisis                               |
| `after_taskstoissues`  | `speckit.git.commit`     | Sí       | Confirmación automática tras la sincronización de incidencias          |

## Configuración

La configuración se almacena en `.specify/extensions/git/git-config.yml`:

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

## Instalación

```bash
# Install the bundled git extension (no network required)
specify extension add git
```

## Desactivación

```bash
# Disable the git extension (spec creation continues without branching)
specify extension disable git

# Re-enable it
specify extension enable git
```

## Degradación controlada

Cuando Git no está instalado o el directorio no es un repositorio Git:

- Los directorios de especificaciones (spec) se crean de todos modos en `specs/`
- La creación de ramas se omite y se muestra una advertencia
- La validación de ramas se omite y se muestra una advertencia
- La detección de repositorios remotos devuelve resultados vacíos

## Scripts

La extensión incluye scripts multiplataforma:

- `scripts/bash/create-new-feature.sh` — Implementación en Bash
- `scripts/bash/git-common.sh` — Utilidades de Git compartidas (Bash)
- `scripts/powershell/create-new-feature.ps1` — Implementación en PowerShell
- `scripts/powershell/git-common.ps1` — Utilidades de Git compartidas (PowerShell)
