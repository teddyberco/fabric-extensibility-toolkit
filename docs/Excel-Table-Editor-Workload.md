# Excel Table Editor - Fabric Workload

A Microsoft Fabric workload that enables editing lakehouse tables using Excel Online, built with the Fabric Extensibility Toolkit.

## Overview

This workload allows users to:
- Select tables from their Fabric lakehouses
- Export table data to Excel Online (via OneDrive)
- Edit data in a familiar Excel interface
- Save changes back to the lakehouse (planned)
- Manage multiple tables in a single workload item

## Architecture

### Technology Stack

- **Frontend**: React + TypeScript + Fluent UI v9
- **Data Access**: Fabric REST APIs + Spark Livy
- **Excel Integration**: OneDrive for Business + Excel Online embedding
- **State Management**: Fabric Item Definition API
- **Authentication**: Microsoft Entra ID (Single Page App)

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User selects lakehouse table via OneLake catalog        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Query table data via Spark Livy (up to 1000 rows)       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Generate Excel file using ExcelJS in browser            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Upload to OneDrive for Business                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Get Excel Online embed URL with edit permissions        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Display Excel Online editor in iframe                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. User edits data in Excel Online                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. Save changes back to lakehouse (TODO)                   │
└─────────────────────────────────────────────────────────────┘
```

## Features

### ✅ Implemented

**Table Management**
- Add multiple tables from different lakehouses
- View table list in grid layout with cards
- Delete tables from the workload item
- Navigate between table editor and overview

**Excel Integration**
- Generate Excel files with real lakehouse data
- Upload to OneDrive for Business
- Embed Excel Online with edit permissions
- Refresh access tokens for long editing sessions
- Handle OneDrive licensing fallbacks

**User Interface**
- Ribbon-based actions (Add Table, Refresh Excel, Save, etc.)
- Loading states and error handling
- Empty state with guided onboarding
- Professional Fluent UI v9 components
- Responsive grid layout

**Data Access**
- Spark Livy session management (reuse idle sessions)
- Query execution with polling (2-5 seconds typical)
- Support for up to 1000 rows per table
- Token acquisition with proper scopes

### 🚧 Planned

- Save Excel changes back to lakehouse
- Table schema validation and type conversion
- Batch operations (edit multiple tables)
- Export to other formats (CSV, Parquet)
- Auto-refresh for expiring tokens
- Collaborative editing support

## Key Components

### Frontend Components

| Component | Lines | Purpose |
|-----------|-------|---------|
| `ExcelEditItemEditor.tsx` | 460+ | Parent router with view state management |
| `ExcelEditItemEditorDefault.tsx` | 860+ | Main UI with table management and Excel viewer |
| `ExcelEditItemEditorEmpty.tsx` | 236 | Empty state with table selection |
| `ExcelEditItemRibbon.tsx` | 220+ | Ribbon with actions (Add, Refresh, Save) |
| `ExcelEditItemModel.ts` | 100+ | TypeScript interfaces and state definitions |

### Services & Utilities

| File | Lines | Purpose |
|------|-------|---------|
| `SparkQueryHelper.ts` | 265 | Spark Livy session management + query execution |
| `ExcelClientSide.ts` | 333 | Excel generation with Spark Livy integration |
| `OneDriveService.ts` | 150+ | OneDrive upload and embed URL management |
| `FabricPlatformClient.ts` | 200+ | Fabric REST API wrapper |

### APIs Used

**Fabric REST APIs:**
- `GET /v1/workspaces/{id}/lakehouses/{id}` - Lakehouse properties
- `GET /v1/workspaces/{id}/lakehouses/{id}/tables` - Table schema
- `GET /v1/workspaces/{id}/sqlEndpoints/{id}/connectionString` - SQL connection string
- Spark Livy API (`/livyApi/versions/2024-07-30/sessions`, `/statements`)

**Microsoft Graph APIs:**
- `PUT /me/drive/root:/path/to/file:/content` - Upload Excel file
- `POST /me/drive/items/{id}/preview` - Get Excel Online embed URL

**Required Permissions:**
- `Lakehouse.ReadWrite.All` - Read/write lakehouse data
- `Files.ReadWrite`, `Files.ReadWrite.All` - OneDrive file operations

## Development

### Prerequisites

- Node.js 18+
- PowerShell 7
- Fabric workspace with capacity
- Azure Entra application configured
- OneDrive for Business license (for Excel Online editing)

### Setup

1. **Clone and install dependencies:**
   ```powershell
   cd Workload
   npm install
   ```

2. **Configure environment:**
   - Copy `.env.dev.sample` to `.env.dev`
   - Update `WORKLOAD_NAME`, `FRONTEND_APPID`, etc.

3. **Start development servers:**
   ```powershell
   # Terminal 1: Dev Gateway
   .\scripts\Run\StartDevGateway.ps1

   # Terminal 2: Frontend
   .\scripts\Run\StartDevServer.ps1
   ```

4. **Access in Fabric:**
   - Navigate to your Fabric workspace
   - Create new item of type "Excel Table Editor"

### Project Structure

```
Workload/
├── app/
│   ├── items/
│   │   └── ExcelEditItem/
│   │       ├── ExcelEditItemEditor.tsx           # Main router
│   │       ├── ExcelEditItemEditorDefault.tsx    # Table management UI
│   │       ├── ExcelEditItemEditorEmpty.tsx      # Empty state
│   │       ├── ExcelEditItemRibbon.tsx           # Ribbon actions
│   │       └── ExcelEditItemModel.ts             # State definitions
│   ├── services/
│   │   └── OneDriveService.ts                    # OneDrive integration
│   ├── utils/
│   │   ├── ExcelClientSide.ts                    # Excel generation
│   │   └── SparkQueryHelper.ts                   # Spark Livy client
│   └── clients/
│       └── FabricPlatformClient.ts               # Fabric API wrapper
└── Manifest/
    ├── WorkloadManifest.xml                      # Workload configuration
    ├── Product.json                              # Workload metadata
    └── items/
        └── ExcelEdit/
            ├── ExcelEditItem.xml                 # Item definition (backend)
            └── ExcelEditItem.json                # Item definition (frontend)
```

## Deployment

### Build Production Release

```powershell
# Build frontend and manifest
.\scripts\Build\BuildRelease.ps1

# Build manifest only (production config)
.\scripts\Build\BuildManifestPackage.ps1 -Environment "prod"
```

### Configure Production Environment

Update `Workload/.env.prod`:
```bash
WORKLOAD_NAME=Org.TeddyWorkload
FRONTEND_APPID=your-production-app-id
FRONTEND_URL=https://editexcel.demo.extensibility-test-domain.net
```

### Deploy to Azure

**Option 1: Azure Web App**
```powershell
.\scripts\Deploy\DeployToAzureWebApp.ps1 `
  -WebAppName "editexcel" `
  -ResourceGroupName "fabric-workloads"
```

**Option 2: Azure Static Web Apps**
```powershell
az staticwebapp create `
  --name "editexcel" `
  --resource-group "fabric-workloads" `
  --location "eastus2" `
  --sku "Free"
```

### Upload to Fabric

1. Go to [Fabric Admin Portal](https://admin.fabric.microsoft.com)
2. Navigate to **Workload Management**
3. Upload manifest: `build/Manifest/Org.TeddyWorkload.1.0.0.nupkg`
4. Configure workload settings and permissions

## Usage

### Creating a Workload Item

1. Navigate to your Fabric workspace
2. Click **New** → **More options**
3. Select **Excel Table Editor** (under your workload)
4. Click **Create**

### Adding Tables

1. Click **Add Table** in the ribbon
2. Browse OneLake catalog
3. Select a lakehouse table
4. Click **Select**

### Editing in Excel Online

1. Select a table card
2. Click **Edit** button
3. Wait for Excel Online to load (~5-10 seconds)
4. Edit data in the embedded Excel viewer
5. Click **Refresh Excel** if the session expires

### Saving Changes (Coming Soon)

1. Click **Save to Lakehouse** in the ribbon
2. Confirm table schema compatibility
3. Changes will be written back to the lakehouse table

## Troubleshooting

### "OneDrive not available" error

**Cause**: User doesn't have OneDrive for Business license

**Solution**: 
- Use "Download Excel" button to save locally
- Or: Purchase OneDrive for Business license

### Excel Online shows "refused to connect"

**Cause**: Access token expired (tokens expire after ~5 minutes)

**Solution**: Click **Refresh Excel** button in the ribbon

### "Add Table" button not visible

**Cause**: Callback registration timing issue

**Solution**: 
- Refresh the page
- Check browser console for errors
- Verify you're in Canvas Overview or Empty view (not Table Editor)

### Spark session creation slow (30-60 seconds)

**Cause**: First-time session creation per workspace/lakehouse

**Solution**: 
- Wait for initial session to be created
- Subsequent queries will reuse the session (2-5 seconds)

### Domain not in tenant domains list

**Cause**: Fabric doesn't recognize your deployment domain

**Solution**: 
- Use custom domain verified in your tenant
- Update `.env.prod` with verified domain
- Rebuild manifest: `.\scripts\Build\BuildManifestPackage.ps1 -Environment "prod"`

## Technical Notes

### OneDrive Integration

The workload uploads Excel files to the user's OneDrive for Business account in a folder called "Fabric Excel Files". The files are then accessed via Excel Online embed URLs with edit permissions.

**Token Requirements:**
- `Files.ReadWrite` or `Files.ReadWrite.All` scope
- User must have OneDrive for Business license

**URL Format:**
```
https://[tenant]-my.sharepoint.com/_layouts/15/Doc.aspx?
  sourcedoc=[fileId]&
  action=edit&
  [accessToken]
```

### Spark Livy Session Management

The workload manages Spark Livy sessions efficiently:

1. **Check for idle sessions**: Reuse existing sessions when possible
2. **Create new session**: Only if no idle session exists (30-60 sec)
3. **Submit statement**: Execute Spark SQL query
4. **Poll for results**: Check every 2 seconds until complete
5. **Parse results**: Convert JSON to Excel-compatible format

**Session Lifecycle:**
- Sessions remain idle for ~15 minutes after last use
- Multiple users share sessions per workspace/lakehouse
- Sessions auto-terminate after timeout

### State Management

Workload state is stored in Fabric Item Definition API:

```typescript
interface ExcelEditWorkflowState {
  workflowStep: 'canvas-overview' | 'table-editing';
  canvasItems: CanvasItem[];           // List of tables
  currentEditingItem?: CanvasItem;     // Currently editing table
  selectedLakehouse?: LakehouseInfo;
  selectedTable?: TableInfo;
  preferences?: UserPreferences;
}
```

State is automatically saved to Fabric and persists across sessions.

## Performance Considerations

### Excel File Size
- Limited to 1000 rows per table to keep files manageable
- Typical file size: 100-500 KB for most tables
- Larger tables can be filtered/paginated before export

### Query Performance
- First query per workspace: 30-60 seconds (session creation)
- Subsequent queries: 2-5 seconds (session reuse)
- Complex queries: 10-30 seconds (depends on table size)

### OneDrive Upload
- Upload time: 1-3 seconds for typical files
- Depends on file size and network speed
- Happens in background while UI shows loading state

## Future Enhancements

### Planned Features
- [ ] Save Excel changes back to lakehouse
- [ ] Table schema validation
- [ ] Data type conversion (Excel → Lakehouse types)
- [ ] Batch operations (edit multiple tables)
- [ ] Export to CSV, Parquet, JSON
- [ ] Auto-refresh for expiring tokens
- [ ] Collaborative editing support
- [ ] Change tracking and audit log
- [ ] Custom table transformations

### Technical Improvements
- [ ] Add unit tests for all components
- [ ] Implement E2E tests with Playwright
- [ ] Add performance monitoring (Application Insights)
- [ ] Implement caching for table metadata
- [ ] Add progressive loading for large tables
- [ ] Support for incremental data loads

## Contributing

This workload is built as part of the Fabric Extensibility Toolkit. To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

## Resources

- [Microsoft Fabric Documentation](https://learn.microsoft.com/fabric/)
- [Fabric Extensibility Toolkit](https://learn.microsoft.com/fabric/extensibility-toolkit)
- [Excel Online Integration](https://learn.microsoft.com/graph/api/driveitem-preview)
- [Spark Livy API](https://learn.microsoft.com/fabric/data-engineering/lakehouse-api)
- [OneDrive for Business](https://learn.microsoft.com/graph/api/resources/onedrive)

## Support

For issues, questions, or feedback:
- Create an issue in this repository
- Contact the Fabric Extensibility team
- Join the [Fabric Community](https://community.fabric.microsoft.com/)
