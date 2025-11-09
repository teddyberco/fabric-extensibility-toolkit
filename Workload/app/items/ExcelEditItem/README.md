# Excel Edit Item - Fabric-Native Excel Editing

## Overview

The ExcelEdit item provides a complete Fabric-native workflow for editing Lakehouse data with Excel capabilities, all without leaving the Microsoft Fabric environment.

## Features

### 🏠 **Fabric-Native Architecture**
- **DataHub Integration**: Select lakehouses using Fabric's DataHub SDK
- **Connected Workbooks**: Edit data using `@microsoft/connected-workbooks` 
- **OneLake Storage**: Save edited data directly to OneLake folders
- **No External Navigation**: Complete experience within Fabric

### 📊 **Workflow Steps**

1. **Lakehouse Selection** 
   - Browse available lakehouses via DataHub SDK
   - Filter by workspace and permissions
   - Mock data includes Sales, Customer Analytics, and Inventory lakehouses

2. **Table Selection**
   - View table metadata (columns, row count, last modified)
   - Preview table schema and data types
   - Support for multiple data types (string, decimal, datetime, int)

3. **Excel Creation with Schema Preservation**
   - Query lakehouse table via Spark Livy API
   - Extract original schema for type-aware operations
   - Generate Excel file with real data (up to 1000 rows)
   - Professional styling with Microsoft blue headers

4. **Excel Editing**
   - Integration with Excel Online via OneDrive for Business
   - In-Fabric Excel editing capabilities
   - Live data preview and manipulation
   - Professional Excel experience without leaving Fabric

5. **OneLake Storage**
   - Save edited data to user's OneLake folders
   - Folder browsing and selection
   - Automatic file naming with timestamps
   - Preservation of data formatting

6. **Save to Lakehouse with Type Preservation**
   - Parse Excel file client-side using ExcelJS
   - Validate schema compatibility with original table
   - Convert Excel strings to proper Spark types:
     - Boolean: `"true"` → `True`, `"false"` → `False`
     - Integer/Long: `"42"` → `42`
     - Float/Double: `"3.14"` → `3.14`
     - Timestamp: `"2023-01-01T00:00:00"` → Python datetime
     - String: Preserved as-is
   - Execute SQL INSERT OVERWRITE for Delta Lake compatibility
   - Preserve Delta Lake transaction history

### 🔧 **Technical Implementation**

#### Key Components
- **ExcelEditItemEditorDefault.tsx**: Main workflow component with state management
- **ExcelClientSide.ts**: Client-side Excel generation and lakehouse write operations
- **SparkQueryHelper.ts**: Spark Livy session management and query execution
- **WorkflowState enum**: State management for multi-step process
- **LakehouseInfo/TableInfo/OneLakeFolder interfaces**: TypeScript type safety

#### State Management
```typescript
enum WorkflowState {
  INITIAL = 'initial',
  SELECTING_LAKEHOUSE = 'selecting_lakehouse', 
  SELECTING_TABLE = 'selecting_table',
  LOADING_DATA = 'loading_data',
  EXCEL_EDITING = 'excel_editing',
  SAVING_TO_ONELAKE = 'saving_to_onelake',
  COMPLETED = 'completed'
}
```

#### Data Flow

**Read Path (Lakehouse → Excel):**
1. **DataHub SDK** → List lakehouses and tables
2. **Spark Livy API** → Query table data with schema extraction
3. **SparkQueryHelper** → Execute PySpark code and poll for results
4. **ExcelClientSide** → Generate Excel file with styled headers
5. **Excel Online** → Display in embedded iframe for editing

**Write Path (Excel → Lakehouse):**
1. **Graph API** → Download Excel file using `@microsoft.graph.downloadUrl`
2. **ExcelJS** → Parse Excel binary data client-side
3. **Type Conversion** → Convert Excel strings to Spark types
4. **Spark Livy API** → Create DataFrame with original schema
5. **SQL INSERT OVERWRITE** → Write to Delta Lake table via temp view

### 🚀 **Usage Scenario**

**Business Analyst Workflow:**
1. **Create ExcelEdit Item**: User creates new ExcelEdit item in their workspace
2. **Connect to Data**: Select relevant lakehouse (e.g., "Sales Analytics")
3. **Choose Dataset**: Pick table (e.g., "Monthly Sales Performance") 
4. **Edit in Excel**: Use familiar Excel interface within Fabric
5. **Save Results**: Store edited data to OneLake folder for sharing

### 📦 **Dependencies**

- `exceljs`: Client-side Excel file parsing and generation
- `@ms-fabric/workload-client`: Fabric SDK integration
- `@fluentui/react-components`: UI components
- **Fabric REST APIs**:
  - Lakehouse API: Get lakehouse properties and table lists
  - Spark Livy API: Session management and query execution
  - Microsoft Graph API: Excel file downloads and OneDrive integration
- **DataHub SDK**: Lakehouse discovery
- **OneLake SDK**: File storage integration

### 🛠 **Development Notes**

#### Current Implementation
- ✅ **Real lakehouse data** queried via Spark Livy API
- ✅ **Schema preservation** from lakehouse to Excel and back
- ✅ **Type conversion** for Boolean, Long, Double, String, Timestamp, Date types
- ✅ **Excel Online integration** via OneDrive for Business
- ✅ **SQL INSERT OVERWRITE** for Delta Lake compatibility
- ✅ **Client-side Excel processing** - no backend required for parsing
- ✅ **Error handling** with validation and detailed error messages
- Progress indicator with workflow steps

#### Technical Details

**Type Conversion Logic:**
```typescript
// Boolean: Excel "true"/"false" strings → Python True/False
if (field.type === 'BooleanType') {
  convertedValue = value.toLowerCase() === 'true';
}

// Integer/Long: Excel number strings → Python int
if (field.type === 'IntegerType' || field.type === 'LongType') {
  convertedValue = parseInt(value, 10);
}

// Float/Double: Excel decimal strings → Python float
if (field.type === 'FloatType' || field.type === 'DoubleType') {
  convertedValue = parseFloat(value);
}

// Timestamp: ISO 8601 strings → Python datetime
if (field.type === 'TimestampType') {
  convertedValue = `datetime.fromisoformat("${value}")`;
}
```

**SQL INSERT OVERWRITE Approach:**
```python
# Create DataFrame with original schema
df = spark.createDataFrame(data, schema)

# Create temporary view for SQL operation
df.createOrReplaceTempView("temp_insert_view")

# Use INSERT OVERWRITE for Delta Lake compatibility
spark.sql(f"INSERT OVERWRITE TABLE {table_name} SELECT * FROM temp_insert_view")
```

#### Production Roadmap
1. ✅ **DataHub SDK Integration**: Real lakehouse discovery implemented
2. ✅ **Excel Online Integration**: Full Excel editing via OneDrive
3. ✅ **Lakehouse Write**: SQL INSERT OVERWRITE with type preservation
4. ✅ **Error Handling**: Comprehensive validation and error messages
5. 🔄 **Performance Optimization**: Consider pagination for tables > 1000 rows

### 📋 **Configuration**

The ExcelEdit item is configured in:
- **Environment**: `.env.dev` - `ITEM_NAMES=HelloWorld,ExcelEdit`
- **Manifest**: `Product.json` - Card configuration
- **Routing**: `App.tsx` - Route registration
- **Translations**: Multiple language support

### 🔍 **Testing**

Access the ExcelEdit item workflow:
1. Start development server: `npm run start`
2. Open browser: `http://localhost:60006`
3. Navigate to ExcelEdit item
4. Follow the guided workflow steps

### 🎯 **Business Value**

- **Familiar Interface**: Excel editing experience analysts know
- **Secure Environment**: No data leaves Fabric ecosystem  
- **Integrated Workflow**: Seamless lakehouse-to-analysis pipeline
- **Collaborative**: OneLake storage enables team sharing
- **Governed**: Fabric security and compliance maintained