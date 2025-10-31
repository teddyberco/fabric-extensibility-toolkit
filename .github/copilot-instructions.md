# GitHub Copilot Instructions for Microsoft Fabric Extensibility Toolkit

## ⚠️ CRITICAL: Development Server Startup

**⚠️ MANDATORY FOR STARTING THE DEV SERVER:**
```powershell
d:\Git\FET\fabric-extensibility-toolkit\scripts\Run\StartDevServer.ps1
```

**❌ NEVER use direct npm commands for server startup:**
```bash
cd Workload && npm start  # FAILS - bypasses proper environment setup
npm start  # FAILS - wrong directory and missing setup
```

**✅ ALWAYS use the PowerShell script for development:**
```powershell
# Use the official startup script (handles Codespaces, environment setup, etc.)
d:\Git\FET\fabric-extensibility-toolkit\scripts\Run\StartDevServer.ps1

# For other npm operations, use compound commands:
cd D:\Git\FET\fabric-extensibility-toolkit\Workload && npm install
cd D:\Git\FET\fabric-extensibility-toolkit\Workload && npm run build
```

## 📋 Overview

This file contains **GitHub Copilot-specific** instructions that extend the generic AI guidance found in the `.ai/` folder. All AI tools should first reference the generic instructions, then apply the Copilot-specific enhancements below.

## 🔗 Base AI Instructions

**REQUIRED**: Before using these instructions, always reference the generic AI guidance:

- **Primary Context**: `.ai/context/fabric-workload.md` - Project structure and conventions
- **Platform Knowledge**: `.ai/context/fabric.md` - Microsoft Fabric platform understanding  
- **Available Commands**: `.ai/commands/` - All automation tasks and procedures
  - Item Operations: `.ai/commands/item/` (createItem.md, deleteItem.md)
  - Workload Operations: `.ai/commands/workload/` (runWorkload.md, updateWorkload.md, deployWorkload.md, publishworkload.md)

## ⚠️ Critical Working Directory Requirements

**MANDATORY**: For server startup, ALWAYS use the PowerShell script:

```powershell
# ✅ CORRECT - Use the official startup script
d:\Git\FET\fabric-extensibility-toolkit\scripts\Run\StartDevServer.ps1

# ❌ INCORRECT - Will fail with incorrect environment setup
cd Workload && npm start  # Bypasses environment detection
npm start                 # Wrong directory and missing setup
```

**For other npm operations**, use compound commands from the Workload directory:

```powershell
# ✅ Required for npm operations other than server startup
cd D:\Git\FET\fabric-extensibility-toolkit\Workload && npm install  # ✅ Required
cd D:\Git\FET\fabric-extensibility-toolkit\Workload && npm run build # ✅ Required
cd D:\Git\FET\fabric-extensibility-toolkit\Workload && npm test     # ✅ Required

# ⚠️ CRITICAL: When using run_in_terminal tool for npm operations:
# npm creates a new process and resets the working directory
# ANY npm command (except server startup) MUST use: cd D:\Git\FET\fabric-extensibility-toolkit\Workload && npm X
# Do NOT use separate cd and npm commands - npm creates new processes that reset directory
```

**Technical Reason**: The `StartDevServer.ps1` script handles environment detection (Codespaces vs local), proper directory navigation, and environment-specific configurations. For other npm operations, the `package.json`, `tsconfig.json`, and all Node.js configurations are located in the `Workload/` subdirectory, not the repository root. Additionally, `npm` commands spawn new processes that reset the working directory, so compound commands with absolute paths are essential.

**⚠️ CRITICAL REMINDER FOR COPILOT**: 
- Server startup: Use `d:\Git\FET\fabric-extensibility-toolkit\scripts\Run\StartDevServer.ps1`
- Other npm commands: Use `cd D:\Git\FET\fabric-extensibility-toolkit\Workload && npm X`
- NEVER use separate cd and npm commands
- This is the #1 most common error - proper startup script and compound commands are MANDATORY

## 🤖 GitHub Copilot Enhanced Features

### Agent Activation
Use `@fabric` or these keywords for specialized GitHub Copilot assistance:
- `fabric workload` - Extensibility Toolkit-specific development help with autocomplete
- `fabric item` - Item creation with intelligent code generation
- `fabric auth` - Authentication patterns with secure defaults
- `fabric api` - API integration with type inference
- `fabric deploy` - Deployment automation with validation

### Enhanced Capabilities
GitHub Copilot provides additional features beyond generic AI tools:
- 🔮 **Predictive Coding**: Auto-completion for Fabric patterns and TypeScript interfaces
- 🔍 **Context-Aware Suggestions**: Smart suggestions based on current file and cursor position
- ⚡ **Real-time Validation**: Immediate feedback on code quality and Fabric compliance
- 🎯 **Pattern Recognition**: Learns from existing codebase patterns for consistent suggestions
- 📝 **Inline Documentation**: Generates JSDoc comments following Fabric conventions

## 🎯 GitHub Copilot Integration

### Command Reference System
GitHub Copilot integrates with the generic `.ai/commands/` structure:

| **Generic Command** | **GitHub Copilot Enhancement** |
|-------------------|-------------------------------|
| `.ai/commands/item/createItem.md` | Auto-generates 4-file structure with intelligent TypeScript interfaces |
| `.ai/commands/item/deleteItem.md` | Validates dependencies before suggesting removal |
| `.ai/commands/workload/runWorkload.md` | Provides environment validation and startup optimization |
| `.ai/commands/workload/updateWorkload.md` | Suggests configuration updates with impact analysis |
| `.ai/commands/workload/deployWorkload.md` | Validates deployment readiness with security checks |
| `.ai/commands/workload/publishworkload.md` | Ensures production-ready manifest compliance |

### Context Enhancement
Beyond the generic `.ai/context/` files, GitHub Copilot provides:
- **Real-time IntelliSense**: Auto-completion for Fabric APIs and TypeScript definitions
- **Error Prevention**: Immediate feedback on common Fabric development pitfalls
- **Pattern Matching**: Suggests code based on similar implementations in the workspace
- **Dependency Tracking**: Understands relationships between manifest and implementation files

## 🧠 GitHub Copilot Behavioral Enhancements

### Smart Suggestions
- **File Creation**: When creating items, automatically suggests the 4-file pattern structure
- **Import Resolution**: Auto-imports Fabric platform types and client libraries
- Prefer components from `@fluentui/react-components` (v9) over `@fluentui/react` (v8). Replace imports like `import { DefaultButton } from '@fluentui/react'` with `import { Button } from '@fluentui/react-components'`. Verify API and prop differences (appearance, tokens, and shorthands) when migrating components.
- **Toolbar Components**: ALWAYS suggests `Tooltip` + `ToolbarButton` pattern for toolbar actions. Auto-imports both from `@fluentui/react-components` and wraps ToolbarButtons in Tooltips with proper accessibility attributes
- **Error Recovery**: Provides specific fixes for common Fabric authentication and manifest issues
- **Code Completion**: Understands Fabric-specific patterns like `callNotificationOpen()` and `saveItemDefinition()`

### Workspace Intelligence
- **Manifest Sync**: Detects when implementation changes require manifest updates
- **Environment Awareness**: Suggests appropriate `.env` configurations based on current context
- **Build Validation**: Predicts build issues before they occur
- **Routing Updates**: Automatically suggests route additions when new items are created

## 🚀 GitHub Copilot Quick Actions

### Smart Code Generation
Instead of manual file creation, GitHub Copilot can generate complete structures:

```typescript
// Type "fabric item create MyCustom" to generate:
// - MyCustomItemModel.ts with intelligent interface
// - MyCustomItemEditor.tsx with Fluent UI components
// - MyCustomItemEditorEmpty.tsx with onboarding flow
// - MyCustomItemEditorRibbon.tsx with action buttons
```

### Enhanced Development Commands
GitHub Copilot understands context-aware shortcuts:

```powershell
# ⚠️ CRITICAL: Use official startup script for development server
d:\Git\FET\fabric-extensibility-toolkit\scripts\Run\StartDevServer.ps1  # ✅ Required for startup

# For other npm operations, use absolute path compound commands:
cd D:\Git\FET\fabric-extensibility-toolkit\Workload && npm install  # ✅ Required for dependencies
cd D:\Git\FET\fabric-extensibility-toolkit\Workload && npm run build # ✅ Required for builds
cd D:\Git\FET\fabric-extensibility-toolkit\Workload && npm test     # ✅ Required for testing

# ❌ NEVER use these patterns - they will fail:
npm start         # Fails - bypasses environment setup and wrong directory
cd Workload; npm start  # Fails - bypasses proper environment detection
cd Workload
npm start         # Fails - bypasses startup script with environment handling

# ⚠️ COPILOT REMINDER: THE PATTERNS ARE:
# Server startup: d:\Git\FET\fabric-extensibility-toolkit\scripts\Run\StartDevServer.ps1
# Other npm ops: cd D:\Git\FET\fabric-extensibility-toolkit\Workload && npm [COMMAND]

# Smart environment detection with .env-based configuration
fabric dev start    # Automatically uses .env.dev configuration

# Intelligent build with validation
fabric build check  # Pre-validates templates and manifest generation

# Context-aware deployment
fabric deploy prod   # Uses .env.prod for environment-specific manifests
```

### Auto-completion Patterns
GitHub Copilot recognizes Fabric patterns and suggests:
- **API Calls**: Complete authentication and error handling
- **Component Structure**: Fluent UI patterns with proper TypeScript, including mandatory `Tooltip` + `ToolbarButton` patterns for all toolbar implementations
- **Manifest Updates**: Template processing with placeholder replacement
- **Route Configuration**: Automatic route registration
- **Environment Management**: .env-based configuration patterns

### Workspace-Aware Features
- **File Relationships**: Understands manifest template ↔ implementation dependencies
- **Environment Detection**: Suggests appropriate configurations for dev/test/prod
- **Template Processing**: Recognizes placeholder patterns like `{{WORKLOAD_NAME}}`
- **Error Resolution**: Provides specific fixes for Fabric development issues
- **Pattern Learning**: Adapts suggestions based on existing codebase patterns

---

## 📚 Reference Architecture

For complete understanding, GitHub Copilot users should reference:
- **Generic Foundation**: All files in `.ai/context/` and `.ai/commands/`
- **Copilot Enhancements**: This file's specific GitHub Copilot features
- **Live Workspace**: Current implementation patterns and recent changes

This dual approach ensures consistency across all AI tools while providing GitHub Copilot users with enhanced, context-aware development assistance.
