# Self-Provisioning Workload Architecture

## Overview

The Excel Editor workload implements a **self-provisioning architecture** where it automatically creates and manages its own backend infrastructure using Fabric User Data Functions (UDF).

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│ Excel Editor Workload (Frontend in iframe)              │
│  - Detects when Excel creation is needed                │
│  - Checks if UDF backend exists                         │
│  - Creates UDF if missing                               │
│  - Invokes UDF to generate Excel files                  │
└──────────────────┬───────────────────────────────────────┘
                   │
                   │ Fabric REST API
                   │ (authentication via WorkloadClient)
                   ▼
┌──────────────────────────────────────────────────────────┐
│ Fabric User Data Function (Auto-Created)                │
│  - Item Name: "Excel_Creation_Service"                  │
│  - Type: UserDataFunction                               │
│  - Python Runtime                                        │
│  - Function: create_excel_from_lakehouse()              │
└──────────────────┬───────────────────────────────────────┘
                   │
                   │ Spark SQL / Fabric Connections
                   │
                   ▼
┌──────────────────────────────────────────────────────────┐
│ Lakehouse (Delta Tables)                                │
│  - Source data for Excel exports                        │
└──────────────────────────────────────────────────────────┘
```

## Benefits

### 1. **Zero Manual Configuration**
- No separate backend deployment required
- No Azure Functions, App Service, or Container Apps to manage
- Workload handles its own infrastructure provisioning

### 2. **Workspace-Scoped Backend**
- Each workspace gets its own UDF instance
- Isolated compute per workspace
- Inherits workspace security and permissions

### 3. **Self-Healing**
- If UDF is deleted, workload recreates it automatically
- Stored UDF item ID in workload state for fast lookup
- Falls back gracefully to client-side Excel creation

### 4. **Cost Effective**
- Pay-per-execution model (no idle costs)
- No infrastructure overhead
- Fabric manages scaling and availability

### 5. **Native Fabric Integration**
- Uses Fabric authentication (WorkloadClient)
- Direct access to lakehouse via Spark SQL
- Same security boundary as the workload

## Implementation Details

### UDF Lifecycle Management (`FabricUDFService.ts`)

```typescript
class FabricUDFService {
  // 1. Check if UDF exists
  async ensureUDFExists(existingUDFItemId?: string): Promise<UDFItemInfo>
  
  // 2. Create UDF if needed
  private async createUDFItem(): Promise<UDFItemInfo>
  
  // 3. Upload Python code
  private async uploadUDFCode(udfItemId: string): Promise<void>
  
  // 4. Invoke UDF function
  async createExcelFromLakehouse(udfItemId: string, request: CreateExcelRequest): Promise<CreateExcelResponse>
}
```

### State Persistence

The workload stores the UDF item ID in its item definition:

```typescript
interface ExcelEditWorkflowState {
  // ... other state ...
  
  // Fabric UDF infrastructure (managed by workload)
  udfItemId?: string;  // ID of the Excel Creation Service UDF item
  udfWorkspaceId?: string;  // Workspace where UDF is deployed
}
```

This allows fast lookup on subsequent uses without re-scanning the workspace.

### First-Time Flow

1. **User clicks "Download Excel with Real Data"**
2. **Workload checks `itemState.udfItemId`**
   - If present → Get UDF info and invoke
   - If missing → Create new UDF
3. **Create UDF**:
   - `POST /v1/workspaces/{id}/items` with type `UserDataFunction`
   - Upload Python code (`function_app.py`)
   - Store UDF item ID in state
4. **Invoke UDF**:
   - `POST /v1/workspaces/{id}/items/{udfId}/jobs/instances?jobType=RunUserDataFunction`
   - Pass lakehouse connection parameters
5. **Process Response**:
   - Decode base64 Excel file
   - Trigger browser download
   - Show success notification

### Subsequent Uses

1. **User clicks "Download Excel"**
2. **Workload finds `itemState.udfItemId`**
3. **Verify UDF exists** (quick GET request)
4. **Invoke UDF** immediately
5. **Download Excel**

## UDF Python Code

The UDF contains a single function that:
- Accepts workspace ID, lakehouse ID, table name
- Queries lakehouse table using Spark SQL (future enhancement)
- Creates Excel workbook using `openpyxl`
- Returns base64 encoded Excel file

```python
@udf.function()
def create_excel_from_lakehouse(
    workspace_id: str,
    lakehouse_id: str, 
    table_name: str,
    max_rows: int = 10000
) -> dict:
    # Query lakehouse
    # Create Excel
    # Return base64
```

## Deployment Checklist

### Automatic (Workload Handles)
✅ Create UDF item in workspace  
✅ Upload Python function code  
✅ Store UDF item ID for reuse  
✅ Invoke UDF with correct parameters  
✅ Handle UDF responses and errors  
✅ Fall back to client-side creation on failure  

### Manual (One-Time per Workspace)
⚠️ **Add `openpyxl` library** to UDF via Fabric portal  
   - Go to Excel_Creation_Service UDF item
   - Libraries → Add `openpyxl`
   - Publish

⚠️ **Configure Lakehouse connection** (optional for real data)  
   - Add lakehouse connection to UDF
   - Update Python code to query via Spark

## Error Handling

### UDF Creation Fails
- **Cause**: Insufficient permissions, workspace capacity limits
- **Fallback**: Use client-side Excel creation (ExcelJS)
- **User Impact**: Still get Excel file, just without real lakehouse data

### UDF Invocation Fails
- **Cause**: UDF deleted, runtime error, timeout
- **Fallback**: Recreate UDF and retry, or use client-side
- **User Impact**: Slight delay, transparent recovery

### Code Upload Fails
- **Cause**: API limitations, network issues
- **Manual Step**: Upload code manually in Fabric portal
- **User Impact**: Must manually configure UDF first time

## Future Enhancements

### 1. Real Lakehouse Data Querying
```python
# Add lakehouse connection decorator
@udf.connection(name="lakehouse_connection")
@udf.function()
def create_excel_from_lakehouse(lakehouse_connection, ...):
    # Use connection to query via Spark SQL
    df = spark.sql(f"SELECT * FROM {table_name} LIMIT {max_rows}")
    data = df.collect()
```

### 2. OneLake Storage
Instead of returning base64, upload Excel to OneLake and return URL:
```python
# Upload to OneLake
onelake_path = f"workspaces/{workspace_id}/lakehouses/{lakehouse_id}/Files/exports/{filename}"
# Return download URL instead of base64
```

### 3. Multi-Table Support
Create workbooks with multiple sheets from multiple tables.

### 4. Custom Formatting
Accept styling parameters for headers, colors, fonts, etc.

### 5. Scheduled Exports
Integrate with Fabric Pipelines for scheduled Excel generation.

## Comparison: Traditional vs Self-Provisioning

| Aspect | Traditional Backend | Self-Provisioning UDF |
|--------|---------------------|----------------------|
| Deployment | Deploy separate Azure Function/App Service | Workload creates UDF automatically |
| Authentication | Configure App Registration, manage secrets | Uses Fabric WorkloadClient token |
| Scaling | Configure scaling rules, monitor capacity | Fabric handles automatically |
| Cost | Always-on or consumption plan with cold starts | True pay-per-execution, no idle cost |
| Maintenance | Update backend code, redeploy infrastructure | Update UDF code in Fabric portal |
| Lakehouse Access | Configure connection strings, manage credentials | Direct access via Fabric connections |
| Security | Separate security boundary, manage CORS | Same security context as workload |

## Conclusion

The self-provisioning architecture makes the Excel Editor workload **truly autonomous**. It provisions its own compute resources on-demand, making deployment as simple as uploading the manifest. No separate backend infrastructure, no complex configuration, no operational overhead.

The workload **owns its entire stack** - from frontend UI to backend processing - all within the Fabric ecosystem.
