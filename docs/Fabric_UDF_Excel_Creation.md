# Using Fabric User Data Functions for Excel Creation

## Overview

Instead of deploying a separate backend (Azure Functions, App Service, etc.), we use **Fabric User Data Functions (UDF)** to handle Excel file creation directly within the Fabric ecosystem.

## Architecture

```
┌─────────────────────┐
│  Excel Editor       │
│  (Frontend)         │
│  in iframe          │
└──────────┬──────────┘
           │
           │ REST call with auth token
           │
           ▼
┌─────────────────────┐
│  Fabric UDF         │
│  (Python)           │
│  - Query lakehouse  │
│  - Create Excel     │
│  - Return binary    │
└──────────┬──────────┘
           │
           │ Spark SQL query
           │
           ▼
┌─────────────────────┐
│  Lakehouse          │
│  (Delta Tables)     │
└─────────────────────┘
```

## Step 1: Create UDF Item in Fabric

1. **In your Fabric workspace**, create a new **User Data Functions** item
2. **Name it**: `ExcelCreationService`
3. **Add the Python code** below

### UDF Python Code (`function_app.py`)

```python
import datetime
import fabric.functions as fn
import logging
import io
import base64

# Import libraries for Excel creation and data access
try:
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Border, Side
except ImportError:
    logging.warning("openpyxl not installed, install via Libraries management")

# Initialize UDF context
udf = fn.UserDataFunctions()

@udf.function()
def create_excel_from_lakehouse(
    workspace_id: str,
    lakehouse_id: str, 
    table_name: str,
    max_rows: int = 10000
) -> dict:
    """
    Create an Excel file from a Fabric lakehouse table.
    
    Args:
        workspace_id: The Fabric workspace GUID
        lakehouse_id: The lakehouse item GUID
        table_name: Name of the table to export
        max_rows: Maximum number of rows to include (default 10,000)
    
    Returns:
        dict with:
        - success: bool
        - excel_base64: Base64 encoded Excel file
        - filename: Suggested filename
        - metadata: Row count, column count, etc.
    """
    logging.info(f"Creating Excel for table: {table_name}")
    logging.info(f"Workspace: {workspace_id}, Lakehouse: {lakehouse_id}")
    
    try:
        # Step 1: Query the lakehouse table using Spark SQL
        # Note: You'll need to connect to the lakehouse via UDF connections
        # For now, we'll create a demo Excel with placeholder
        
        # TODO: Add lakehouse connection decorator
        # @udf.connection(name="lakehouse_connection")
        # Then use: spark.sql(f"SELECT * FROM {table_name} LIMIT {max_rows}")
        
        # Demo data for testing (replace with actual query)
        demo_headers = ["ID", "Name", "Email", "City", "Revenue"]
        demo_data = [
            [1, "Customer A", "customer.a@email.com", "Seattle", 75000],
            [2, "Customer B", "customer.b@email.com", "Portland", 68000],
            [3, "Customer C", "customer.c@email.com", "San Francisco", 95000],
        ]
        
        # Step 2: Create Excel workbook using openpyxl
        wb = Workbook()
        ws = wb.active
        ws.title = table_name[:31]  # Excel sheet name limit
        
        # Add headers with styling
        header_font = Font(bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="0078D4", end_color="0078D4", fill_type="solid")
        
        ws.append(demo_headers)
        for cell in ws[1]:
            cell.font = header_font
            cell.fill = header_fill
        
        # Add data rows
        for row in demo_data:
            ws.append(row)
        
        # Auto-adjust column widths
        for column in ws.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            ws.column_dimensions[column_letter].width = adjusted_width
        
        # Step 3: Save to bytes buffer
        excel_buffer = io.BytesIO()
        wb.save(excel_buffer)
        excel_buffer.seek(0)
        excel_bytes = excel_buffer.read()
        
        # Step 4: Encode as base64 for JSON transport
        excel_base64 = base64.b64encode(excel_bytes).decode('utf-8')
        
        logging.info(f"✅ Excel created: {len(excel_bytes)} bytes, {len(demo_data)} rows")
        
        return {
            "success": True,
            "excel_base64": excel_base64,
            "filename": f"{table_name}_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx",
            "metadata": {
                "table_name": table_name,
                "row_count": len(demo_data),
                "column_count": len(demo_headers),
                "file_size_bytes": len(excel_bytes),
                "created_at": datetime.datetime.now().isoformat()
            }
        }
        
    except Exception as e:
        logging.error(f"❌ Excel creation failed: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "filename": None,
            "excel_base64": None
        }


@udf.function()
def get_lakehouse_table_info(
    workspace_id: str,
    lakehouse_id: str,
    table_name: str
) -> dict:
    """
    Get metadata about a lakehouse table (schema, row count).
    This can be called before Excel creation to show preview info.
    """
    logging.info(f"Getting table info for: {table_name}")
    
    try:
        # TODO: Query actual table schema from lakehouse
        # For now return demo info
        
        return {
            "success": True,
            "table_name": table_name,
            "schema": [
                {"name": "ID", "type": "int"},
                {"name": "Name", "type": "string"},
                {"name": "Email", "type": "string"},
                {"name": "City", "type": "string"},
                {"name": "Revenue", "type": "double"}
            ],
            "estimated_row_count": 213,
            "workspace_id": workspace_id,
            "lakehouse_id": lakehouse_id
        }
        
    except Exception as e:
        logging.error(f"❌ Failed to get table info: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }
```

## Step 2: Install Required Libraries

In the UDF item:
1. Go to **Libraries** section
2. Add **`openpyxl`** from PyPI
3. Publish the UDF

## Step 3: Update Frontend to Call UDF

Replace the current `/api/excel/create-real` call with a UDF REST call:

### Frontend Changes (`ExcelEditItemEditorDefault.tsx` or similar)

```typescript
async function createExcelViaFabricUDF(
  workloadClient: any,
  workspaceId: string,
  lakehouseId: string,
  tableName: string
): Promise<{ success: boolean; downloadUrl?: string; error?: string }> {
  
  try {
    console.log('📊 Calling Fabric UDF to create Excel...');
    
    // Get authentication token from WorkloadClient
    const authToken = await workloadClient.getAccessToken();
    
    // UDF endpoint URL (get this from Fabric after publishing)
    // Format: https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/items/{udfItemId}/jobs/instances?jobType=RunUserDataFunction
    const udfEndpoint = process.env.FABRIC_UDF_EXCEL_ENDPOINT || 
      'https://api.fabric.microsoft.com/v1/workspaces/{WORKSPACE_ID}/items/{UDF_ITEM_ID}/jobs/instances?jobType=RunUserDataFunction';
    
    // Call the UDF function
    const response = await fetch(udfEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        executionData: {
          functionName: 'create_excel_from_lakehouse',
          parameters: {
            workspace_id: workspaceId,
            lakehouse_id: lakehouseId,
            table_name: tableName,
            max_rows: 10000
          }
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`UDF call failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.status === 'Succeeded') {
      const output = result.output;
      
      if (output.success && output.excel_base64) {
        // Convert base64 to blob for download
        const binaryString = atob(output.excel_base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        
        const downloadUrl = URL.createObjectURL(blob);
        
        console.log('✅ Excel created via UDF:', output.metadata);
        
        return {
          success: true,
          downloadUrl,
          filename: output.filename
        };
      } else {
        throw new Error(output.error || 'UDF returned unsuccessful result');
      }
    } else {
      throw new Error(`UDF execution failed: ${result.status}`);
    }
    
  } catch (error) {
    console.error('❌ Fabric UDF Excel creation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
```

## Step 4: Configure Environment Variables

Add to `.env.prod`:

```bash
# Fabric UDF Configuration
FABRIC_UDF_WORKSPACE_ID=d93a1ddb-3f94-4a2f-9b43-0afe4cdb9f17
FABRIC_UDF_ITEM_ID=<your-udf-item-guid>
FABRIC_UDF_EXCEL_ENDPOINT=https://api.fabric.microsoft.com/v1/workspaces/d93a1ddb-3f94-4a2f-9b43-0afe4cdb9f17/items/<udf-item-id>/jobs/instances?jobType=RunUserDataFunction
```

## Step 5: Deployment Steps

1. **Create UDF in Fabric Workspace**
   - Navigate to your workspace `d93a1ddb-3f94-4a2f-9b43-0afe4cdb9f17`
   - Create new User Data Functions item
   - Paste the Python code
   - Add `openpyxl` library

2. **Publish the UDF**
   - Click "Publish" to save changes
   - Copy the Function URL from the Functions Explorer

3. **Update Frontend**
   - Replace `/api/excel/create-real` calls with `createExcelViaFabricUDF`
   - Add UDF endpoint to `.env.prod`
   - Rebuild frontend: `npm run build`

4. **Redeploy Frontend**
   - Deploy updated frontend to Azure Static Web App
   - Test Excel creation

## Benefits Over Separate Backend

✅ **No infrastructure management** - Fabric handles hosting  
✅ **Built-in authentication** - Uses Fabric tokens  
✅ **Direct lakehouse access** - No need for separate connection strings  
✅ **Cost effective** - Pay per execution, no idle costs  
✅ **Same security context** - Inherits Fabric workspace permissions  
✅ **Easy updates** - Change Python code and republish, no redeployment  

## Next Steps

1. Enhance UDF to query actual lakehouse data using Spark SQL
2. Add lakehouse connection decorator for real data access
3. Support filtering, sorting, and pagination parameters
4. Add error handling and logging for production
5. Optionally: Upload Excel to OneLake instead of returning base64

## Alternative: Direct Download via UDF

Instead of base64 encoding, you can have the UDF upload the Excel to OneLake and return a download URL:

```python
# In the UDF function:
# Upload to OneLake
onelake_path = f"workspaces/{workspace_id}/lakehouses/{lakehouse_id}/Files/exports/{filename}"
# Use Fabric SDK to upload file
# Return the OneLake path as download URL
```

This avoids size limits on the REST response.
