# Microsoft Fabric Extensibility Toolkit - Workload Application

This folder contains the complete workload application for Microsoft Fabric extensibility development, including frontend code, item implementations, platform clients, and manifest configurations.

## 📁 Structure Overview

```text
Workload/
├── app/                      # Frontend application source code
│   ├── items/               # Custom Fabric item implementations
│   ├── clients/             # Fabric Platform API clients
│   ├── controller/          # Business logic and orchestration
│   ├── controls/            # Reusable UI components
│   ├── assets/              # Images, icons, and localization files
│   └── [core app files]     # App.tsx, index.ts, routing, etc.
├── Manifest/                # Workload and item definitions
│   ├── items/              # Per-item Fabric configuration
│   ├── assets/             # Workload icons and branding
│   └── [manifest files]    # WorkloadManifest.xml, Product.json, etc.
├── devServer/               # Development server configuration
├── .env.dev                 # Development environment settings
├── .env.test                # Test environment settings
├── .env.prod                # Production environment settings
└── package.json             # Node.js dependencies and scripts
```

## 🎯 Custom Fabric Items

This workload contains two custom Fabric items that demonstrate different patterns and capabilities:

### 1. HelloWorld Item
**Purpose**: Template and reference implementation for learning Fabric extensibility

**Key Features**:
- Foundational item structure and patterns
- Empty state with onboarding flow
- Settings and about pages
- Translation support
- Minimal Fabric API usage

**Use Cases**:
- Learning Fabric development patterns
- Starting point for new custom items
- Reference implementation for best practices
- Rapid prototyping foundation

**Documentation**: See `app/items/HelloWorldItem/docs/` for detailed architecture and usage

### 2. WorkspaceManager Item
**Purpose**: Advanced workspace management and operations tool

**Key Features**:
- **Workspace Item Discovery**: Lists all items in current workspace with metadata
- **Bulk Delete Operations**: Select and delete multiple items simultaneously
- **Report Rebinding**: Change semantic model bindings for Power BI reports
- **Semantic Model Cloning**: Clone semantic models with full definition copying
- **Operations History**: Track all operations performed with timestamps
- **Advanced Fabric API Usage**: Demonstrates complex async operation patterns

**Technical Highlights**:
- **Async Operation Handling**: Implements three-layer async pattern (POST 202 → Poll → GET result)
- **Location Header Pattern**: Proper result retrieval from operation responses
- **Definition-Based APIs**: Complete getDefinition and create with definition workflows
- **Real-time Status**: Live polling of long-running operations
- **Error Recovery**: Comprehensive error handling and user feedback

**Use Cases**:
- Workspace administration and management
- Bulk operations on multiple items
- Testing and development workspace cleanup
- Production workspace maintenance
- Learning advanced Fabric API patterns

**Documentation**: See `app/items/WorkspaceManagerItem/docs/` for architecture details

## 🔌 Fabric Platform Integration

### API Clients (`app/clients/`)

The workload includes comprehensive TypeScript clients for Fabric Platform APIs:

| **Client** | **Purpose** | **API Coverage** |
|-----------|------------|-----------------|
| `FabricPlatformClient.ts` | Core platform integration | Base authentication and request handling |
| `ItemClient.ts` | Item operations | CRUD, getDefinition, updateDefinition |
| `WorkspaceClient.ts` | Workspace operations | List items, manage workspace |
| `OneLakeStorageClient.ts` | OneLake integration | File storage and data access |
| `SparkClient.ts` | Compute operations | Job submission and monitoring |
| `JobSchedulerClient.ts` | Scheduling | Task automation |
| `ConnectionClient.ts` | Data sources | Connection management |
| `GatewayClient.ts` | On-premises connectivity | Gateway integration |
| `CapacityClient.ts` | Resource management | Capacity operations |

**Key Features**:
- **TypeScript typed**: Full type definitions for API requests/responses
- **Error handling**: Standardized error handling and logging
- **Authentication**: Integrated with Fabric authentication service
- **Async patterns**: Support for long-running operations
- **Extensible**: Easy to add new API endpoints

### Controllers (`app/controller/`)

Business logic and orchestration layers:

- **ItemCRUDController**: Item lifecycle operations (create, read, update, delete)
- **AuthenticationController**: Token acquisition and validation
- **NotificationController**: User notifications and feedback
- **DialogController**: Modal dialogs and confirmations
- **ErrorHandlingController**: Global error handling and logging
- **NavigationController**: Routing and URL management
- **SettingsController**: User preferences and configuration

## 🎨 UI Framework

### Fluent UI v9 Components
The workload uses **@fluentui/react-components** (v9) for consistent Microsoft design:

```typescript
import {
  Button,
  Card,
  Dialog,
  Dropdown,
  Table,
  Badge,
  Spinner
} from "@fluentui/react-components";
```

**Pattern: Tooltip + ToolbarButton**
All toolbar actions follow the accessibility pattern:
```tsx
<Tooltip content="Action description" relationship="label">
  <ToolbarButton icon={<IconComponent />} onClick={handleAction}>
    Label
  </ToolbarButton>
</Tooltip>
```

### Custom Controls (`app/controls/`)
- **ResizableTable**: Advanced table with column resizing
- **ItemEditorLoadingProgressBar**: Loading indicators
- **Custom dialogs**: Reusable modal patterns
- **Theme integration**: Fabric theme support

## 🌍 Internationalization

Translation support using React i18n:

```text
app/assets/locales/
├── en/
│   └── translation.json    # English translations
├── de/
│   └── translation.json    # German translations
└── [other languages]
```

**Usage**:
```typescript
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
const title = t('WorkspaceManager_Title');
```

## 📋 Manifest Configuration

### Workload Manifest (`Manifest/`)

**WorkloadManifest.xml**: Main workload configuration
- Authentication scopes and permissions
- Backend service endpoints
- Frontend application registration
- Item type registrations

**Product.json**: Workload metadata
- Display names and descriptions
- Version information
- Publisher details
- Workload Hub information

### Item Definitions (`Manifest/items/`)

Each custom item has its own configuration folder:

```text
Manifest/items/
├── HelloWorld/
│   ├── HelloWorldItem.json    # Fabric JSON configuration
│   └── HelloWorldItem.xml     # Item type definition
└── WorkspaceManager/
    ├── WorkspaceManagerItem.json
    └── WorkspaceManagerItem.xml
```

**Template Processing**:
- XML files contain placeholders: `{{WORKLOAD_NAME}}`, `{{FRONTEND_APP_ID}}`
- Placeholders replaced during build from `.env.*` files
- Environment-specific manifest generation (dev/test/prod)

## ⚙️ Environment Configuration

### Environment Files

**`.env.dev`** - Development environment
```bash
WORKLOAD_NAME=MyWorkload
FRONTEND_APP_ID=12345678-1234-1234-1234-123456789abc
BACKEND_SERVICE_BASE_URL=https://dev-backend.example.com
WORKLOAD_VERSION=1.0.0
```

**`.env.test`** - Staging environment
**`.env.prod`** - Production environment

### Configuration Usage

Environment variables are used throughout the application:

```typescript
import { EnvironmentConstants } from './constants';

// Access Fabric API base URL
const apiUrl = EnvironmentConstants.FabricApiBaseUrl;

// Access workload configuration
const workloadName = process.env.WORKLOAD_NAME;
```

## 🚀 Development Workflow

### Prerequisites
- Node.js 18+ and npm/yarn
- PowerShell 7
- .NET SDK
- Azure CLI (for Entra App setup)
- VS Code or similar IDE

### Setup
```powershell
# Initial project setup (once)
.\scripts\Setup\SetupWorkload.ps1

# Developer environment setup (each developer)
.\scripts\Setup\SetupDevEnvironment.ps1
```

### Development Commands
```powershell
# Start development server
.\scripts\Run\StartDevServer.ps1

# Start DevGateway (in separate terminal)
.\scripts\Run\StartDevGateway.ps1

# Access the workload
# Navigate to: https://app.fabric.microsoft.com
# Your custom items will appear in the workspace
```

### Build and Deployment
```powershell
# Build frontend application
.\scripts\Build\BuildFrontend.ps1 -Environment prod

# Build manifest package
.\scripts\Build\BuildManifestPackage.ps1 -Environment prod

# Complete build
.\scripts\Build\BuildAll.ps1 -Environment prod

# Deploy to Azure Web App
.\scripts\Deploy\DeployToAzureWebApp.ps1
```

## 📦 Build Output

All builds generate artifacts in the `build/` directory (not committed to version control):

```text
build/
├── Frontend/                        # Built frontend application
│   ├── index.html
│   ├── bundle.js
│   └── [other assets]
├── Manifest/                        # Processed manifest files
│   ├── temp/                       # Temporary processing files
│   │   ├── WorkloadManifest.xml   # Processed manifest
│   │   └── items/                 # Processed item definitions
│   └── [WorkloadName].[Version].nupkg  # NuGet package
└── DevGateway/                     # DevGateway configuration
    └── workload-dev-mode.json
```

## 🔐 Authentication & Permissions

### Required Fabric API Scopes

**HelloWorld Item** (Minimal):
- `Item.ReadWrite.All` - Basic item operations
- `Workspace.Read.All` - Workspace context

**WorkspaceManager Item** (Advanced):
- `Item.ReadWrite.All` - Item CRUD operations
- `Item.Execute.All` - Execute operations like getDefinition
- `Workspace.ReadWrite.All` - Workspace item listing
- `SemanticModel.ReadWrite.All` - Semantic model operations

### Entra App Configuration

The workload requires an Azure Entra App with:
- Delegated permissions for Fabric APIs
- Frontend app ID registered in manifest
- Redirect URIs configured for local development
- Token acquisition for user context

**Setup Script**: `.\scripts\Setup\CreateDevAADApp.ps1`

## 🎓 Learning Path

### Beginners
1. **Start with HelloWorld Item**: Understand basic Fabric item structure
2. **Explore app structure**: Review App.tsx, routing, and navigation
3. **Study ItemClient**: Learn basic Fabric API patterns
4. **Modify UI**: Customize components and styling
5. **Add translations**: Implement internationalization

### Intermediate
1. **Study WorkspaceManager**: Understand advanced patterns
2. **Implement async operations**: Learn 202 polling patterns
3. **Add new operations**: Extend with custom functionality
4. **Integrate more APIs**: Use additional Fabric Platform clients
5. **Error handling**: Implement robust error recovery

### Advanced
1. **Create custom items**: Build domain-specific items
2. **Backend integration**: Connect to custom services
3. **OneLake integration**: Implement data storage
4. **Spark jobs**: Submit and monitor compute operations
5. **Production deployment**: Deploy to Azure and Fabric Workload Hub

## 📊 WorkspaceManager Deep Dive

### Async Operation Pattern

The WorkspaceManager demonstrates the complete Fabric REST API async pattern:

**Three-Layer Architecture**:
```typescript
// 1. Initiate operation → 202 Accepted with Location header
const response = await fetch(operationUrl, { method: 'POST', ... });
const operationLocation = response.headers.get('location');

// 2. Poll operation until complete
while (attempts < maxAttempts) {
  const pollResponse = await fetch(operationLocation, { method: 'GET', ... });
  const status = await pollResponse.json();
  
  if (status.status === 'Succeeded') {
    // 3. Get result from Location header in poll response
    const resultLocation = pollResponse.headers.get('location');
    const result = await fetch(resultLocation, { method: 'GET', ... });
    return await result.json();
  }
}
```

**Applied Operations**:
- **getDefinition**: Retrieve semantic model definition (11 parts)
- **Create with definition**: Clone semantic model with full content
- **updateDefinition**: Update existing items
- **Rebind operations**: Change report connections

### Key Implementation Details

**Semantic Model Cloning Workflow**:
1. Fetch source model definition via async getDefinition
2. Poll operation until definition retrieved
3. Extract definition parts (model.bim, definition.pbism, etc.)
4. Create new model with definition via async create
5. Poll create operation until complete
6. Retrieve created item ID from result
7. Display success notification

**Location Header Pattern**:
```typescript
// Result URLs come from API headers, not manual construction
const resultLocation = pollResponse.headers.get('location');
// Example: https://wabi-west-europe-f-primary-redirect.analysis.windows.net/v1/operations/{id}/result
```

**Error Handling**:
- Operation timeouts (max 30 attempts × 2 seconds)
- Failed operations with error details
- Network errors and retries
- User-friendly error messages
- Comprehensive console logging

## 🧪 Testing

### Development Testing
- **Component rendering**: Verify UI components load correctly
- **API integration**: Test Fabric API calls with real data
- **Error scenarios**: Test timeout and failure handling
- **State management**: Verify state persistence and updates

### User Testing
- **Workspace operations**: Test item listing and filtering
- **Bulk operations**: Test multi-item delete
- **Report rebinding**: Test semantic model reconnection
- **Model cloning**: Test end-to-end cloning workflow
- **Operations history**: Verify tracking and display

### Console Debugging
The WorkspaceManager includes comprehensive console logging:
```
🔍 Loading workspace items...
📡 GET response status: 200
✅ Loaded 42 items from workspace
⏳ Clone operation started: samplemodel (Copy)
🔍 Poll attempt 1: Status 200
✅ Definition result retrieved: {definition: {...}}
📦 Definition parts count: 11
⏳ Create operation is asynchronous
🔍 Create poll attempt 1: Status 200
✅ Create result retrieved: {id: '...', ...}
✅ New semantic model created successfully
```

## 🤝 Contributing

When adding new items or features:

1. **Follow naming conventions**: `[ItemName]Item` pattern
2. **Add documentation**: Create README in item folder
3. **Update manifest**: Add item configuration to `Manifest/items/`
4. **Register routes**: Add routing in `App.tsx`
5. **Add translations**: Update locale files
6. **Test thoroughly**: Verify all operations work
7. **Update this README**: Document new capabilities

## 📚 Additional Resources

- **[Fabric Extensibility Documentation](https://learn.microsoft.com/fabric/extensibility-toolkit)**
- **[Project Setup Guide](../docs/Project_Setup.md)**
- **[Project Structure](../docs/Project_Structure.md)**
- **[HelloWorld Item Architecture](./app/items/HelloWorldItem/docs/Architecture.md)**
- **[Fabric Platform API Reference](https://learn.microsoft.com/rest/api/fabric/)**

## 🆘 Support

For questions, issues, or feedback:
- **Issues**: Use the GitHub Issues tab
- **Discussions**: GitHub Discussions for questions
- **Documentation**: Check the `/docs` folder
- **Examples**: Review HelloWorld and WorkspaceManager implementations

---

**Last Updated**: November 2025
**Workload Version**: 1.0.0
**Fabric SDK Version**: Latest
