/**
 * Client-side Excel creation utility
 * Creates Excel files entirely in the browser using ExcelJS
 * Uses Spark Livy API for querying real lakehouse data
 * NO BACKEND REQUIRED!
 */

import ExcelJS from 'exceljs';
import { WorkloadClientAPI } from '@ms-fabric/workload-client';
import { SparkLivyClient } from '../clients/SparkLivyClient';
import { getOrCreateSparkSession, executeSparkQuery } from './SparkQueryHelper';

export interface TableSchema {
  name: string;
  dataType: string;
}

export interface ExcelCreationOptions {
  tableName: string;
  schema: TableSchema[];
  data: any[][];
  sqlConnectionString?: string; // Optional SQL endpoint connection string
  workspaceId?: string; // Optional workspace ID
  lakehouseId?: string; // Optional lakehouse ID
}

/**
 * Create an Excel file client-side and download it
 * @param options Excel creation options
 * @returns Promise<void>
 */
export async function createAndDownloadExcel(options: ExcelCreationOptions): Promise<void> {
  console.log('📊 Creating Excel file client-side...');
  console.log('   Table:', options.tableName);
  console.log('   Columns:', options.schema.length);
  console.log('   Rows:', options.data.length);

  // Create workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(options.tableName);

  // Add header row
  const headers = options.schema.map(col => col.name);
  worksheet.addRow(headers);

  // Style the header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, size: 12 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' } // Microsoft blue
  };
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }; // White text
  headerRow.height = 25;

  // Add data rows
  options.data.forEach(row => {
    worksheet.addRow(row);
  });

  // Auto-fit columns
  worksheet.columns.forEach((column, index) => {
    let maxLength = headers[index].length;
    options.data.forEach(row => {
      const cellValue = String(row[index] || '');
      maxLength = Math.max(maxLength, cellValue.length);
    });
    column.width = Math.min(maxLength + 2, 50); // Max 50 chars wide
  });

  // Add borders to all cells
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });

  // Add connection instructions worksheet if SQL connection string is provided
  if (options.sqlConnectionString) {
    const instructionsSheet = workbook.addWorksheet('📖 How to Get Real Data');
    
    // Add title
    instructionsSheet.getCell('A1').value = '🔗 Connect to Lakehouse SQL Endpoint';
    instructionsSheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF0078D4' } };
    
    // Add instructions
    const instructions = [
      '',
      'This Excel file contains the TABLE SCHEMA only.',
      'To get REAL DATA from the Lakehouse, follow these steps:',
      '',
      '📌 Method 1: Power Query (Recommended)',
      '1. In Excel, go to: Data → Get Data → From Database → From SQL Server',
      `2. Server: ${options.sqlConnectionString}`,
      `3. Database: Leave empty or use workspace name`,
      '4. Data Connectivity mode: DirectQuery or Import',
      '5. Authentication: Microsoft Account (use your Fabric account)',
      `6. Select table: ${options.tableName}`,
      '7. Click "Load" to import the real data',
      '',
      '📌 Method 2: SQL Server Management Studio (SSMS)',
      `1. Connect to: ${options.sqlConnectionString}`,
      '2. Authentication: Microsoft Entra (Azure Active Directory)',
      `3. Query: SELECT * FROM [${options.tableName}]`,
      '',
      '📌 Connection Details:',
      `   SQL Endpoint: ${options.sqlConnectionString}`,
      `   Table Name: ${options.tableName}`,
      '   Authentication: Microsoft Entra ID',
      '   Port: 1433 (default SQL Server port)',
      '',
      '💡 Tip: Power Query allows live refresh - your Excel stays connected to Lakehouse!',
      '',
      '📚 Documentation:',
      '   https://learn.microsoft.com/en-us/fabric/data-warehouse/connectivity',
    ];

    instructions.forEach((line, index) => {
      instructionsSheet.getCell(`A${index + 2}`).value = line;
      if (line.startsWith('📌') || line.startsWith('💡') || line.startsWith('📚')) {
        instructionsSheet.getCell(`A${index + 2}`).font = { bold: true, size: 11 };
      }
    });

    // Auto-fit column width
    instructionsSheet.getColumn('A').width = 100;
  }

  // Generate Excel file as blob
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  // Download the file
  const fileName = `${options.tableName}_${new Date().getTime()}.xlsx`;
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);

  console.log('✅ Excel file created and downloaded!');
  console.log('   File name:', fileName);
  console.log('   File size:', Math.round(buffer.byteLength / 1024), 'KB');
}

/**
 * Fetch table data from Fabric Lakehouse using Spark Livy and create Excel
 * @param workloadClient Workload client for authentication (SparkLivyClient will get tokens internally)
 * @param workspaceId Workspace ID
 * @param lakehouseId Lakehouse ID
 * @param tableName Table name
 * @returns Promise<void>
 */
export async function fetchAndDownloadLakehouseTable(
  workloadClient: WorkloadClientAPI,
  workspaceId: string,
  lakehouseId: string,
  tableName: string,
  existingSessionId?: string | null
): Promise<void> {
  console.log('📊 Fetching table data from Lakehouse using Spark Livy...');
  console.log('   Workspace:', workspaceId);
  console.log('   Lakehouse:', lakehouseId);
  console.log('   Table:', tableName);
  if (existingSessionId) {
    console.log('   Using existing Spark session:', existingSessionId);
  }

  try {
    // Create Spark Livy client (it will handle token acquisition internally with proper scopes)
    const sparkClient = new SparkLivyClient(workloadClient);
    
    // Step 1: Get or create Spark session (reuse if provided)
    let session: any;
    if (existingSessionId) {
      console.log('♻️ Reusing existing Spark session:', existingSessionId);
      session = { id: existingSessionId };
    } else {
      console.log('⏳ Getting or creating Spark session (this may take 30-60 seconds on first use)...');
      session = await getOrCreateSparkSession(sparkClient, workspaceId, lakehouseId);
      console.log('✅ Spark session ready:', session.id);
    }
    
    // Step 2: Execute SQL query to get table data
    console.log('🔍 Executing query via Spark Livy...');
    const queryResult = await executeSparkQuery(sparkClient, workspaceId, lakehouseId, session.id, tableName, 1000);
    console.log('✅ Query executed successfully');
    console.log('   Rows fetched:', queryResult.rows?.length || 0);
    console.log('   Execution time:', queryResult.executionTimeMs, 'ms');
    
    // Step 3: Parse results and create Excel
    if (!queryResult.rows || queryResult.rows.length === 0) {
      throw new Error('No data returned from query');
    }
    
    // Extract schema from first row
    const firstRow = queryResult.rows[0];
    const schema: TableSchema[] = Object.keys(firstRow).map(key => ({
      name: key,
      dataType: typeof firstRow[key]
    }));
    
    // Convert data to 2D array
    const data = queryResult.rows.map(row => 
      Object.values(row).map(val => val === null ? '' : String(val))
    );
    
    console.log('💡 Creating Excel with REAL DATA from Lakehouse!');
    console.log(`   Schema: ${schema.length} columns`);
    console.log(`   Data: ${data.length} rows`);
    
    // Step 4: Create and download Excel with real data
    await createAndDownloadExcel({
      tableName,
      schema,
      data
    });
    
    console.log('✅ Excel file created with REAL DATA from Spark Livy!');
  } catch (error: any) {
    console.error('❌ Error fetching table data:', error);
    throw error;
  }
}

/**
 * Fetch table data from Fabric Lakehouse using Spark Livy (returns data instead of downloading)
 * Useful for OneDrive upload flow where we need the blob for upload, not download
 * @param workloadClient Workload client for authentication
 * @param workspaceId Workspace ID
 * @param lakehouseId Lakehouse ID
 * @param tableName Table name
 * @param existingSessionId Optional existing Spark session ID to reuse
 * @returns Promise with data and schema
 */
export async function fetchLakehouseTableData(
  workloadClient: WorkloadClientAPI,
  workspaceId: string,
  lakehouseId: string,
  tableName: string,
  existingSessionId?: string | null
): Promise<{ data: any[][]; schema: TableSchema[]; sessionId: string }> {
  console.log('📊 Fetching table data from Lakehouse using Spark Livy...');
  
  try {
    const sparkClient = new SparkLivyClient(workloadClient);
    
    // Get or create Spark session (reuse if provided)
    let session: any;
    if (existingSessionId) {
      console.log('♻️ Reusing existing Spark session:', existingSessionId);
      session = { id: existingSessionId };
    } else {
      console.log('⏳ Getting or creating Spark session...');
      session = await getOrCreateSparkSession(sparkClient, workspaceId, lakehouseId);
      console.log('✅ Spark session ready:', session.id);
    }
    
    // Execute SQL query to get table data
    console.log('🔍 Executing query via Spark Livy...');
    const queryResult = await executeSparkQuery(sparkClient, workspaceId, lakehouseId, session.id, tableName, 1000);
    console.log('✅ Query executed successfully');
    console.log('   Rows fetched:', queryResult.rows?.length || 0);
    
    if (!queryResult.rows || queryResult.rows.length === 0) {
      throw new Error('No data returned from query');
    }
    
    // Extract schema from first row
    const firstRow = queryResult.rows[0];
    const schema: TableSchema[] = Object.keys(firstRow).map(key => ({
      name: key,
      dataType: typeof firstRow[key]
    }));
    
    // Convert data to 2D array
    const data = queryResult.rows.map(row => 
      Object.values(row).map(val => val === null ? '' : String(val))
    );
    
    console.log(`✅ Data fetched: ${schema.length} columns, ${data.length} rows`);
    
    return { data, schema, sessionId: session.id };
  } catch (error: any) {
    console.error('❌ Error fetching table data:', error);
    throw error;
  }
}
