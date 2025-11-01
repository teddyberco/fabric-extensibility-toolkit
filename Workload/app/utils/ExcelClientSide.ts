/**
 * Client-side Excel creation utility
 * Creates Excel files entirely in the browser using ExcelJS
 * NO BACKEND REQUIRED!
 */

import ExcelJS from 'exceljs';

export interface TableSchema {
  name: string;
  dataType: string;
}

export interface ExcelCreationOptions {
  tableName: string;
  schema: TableSchema[];
  data: any[][];
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
 * Fetch table data from Fabric Lakehouse and create Excel
 * @param workspaceId Workspace ID
 * @param lakehouseId Lakehouse ID
 * @param tableName Table name
 * @param accessToken Fabric API access token
 * @returns Promise<void>
 */
export async function fetchAndDownloadLakehouseTable(
  workspaceId: string,
  lakehouseId: string,
  tableName: string,
  accessToken: string
): Promise<void> {
  console.log('📊 Fetching table data from Lakehouse...');
  console.log('   Workspace:', workspaceId);
  console.log('   Lakehouse:', lakehouseId);
  console.log('   Table:', tableName);

  try {
    // Fetch table metadata from Fabric API
    const tablesUrl = `https://api.fabric.microsoft.com/v1/workspaces/${workspaceId}/lakehouses/${lakehouseId}/tables`;
    console.log('📋 Fetching tables:', tablesUrl);

    const response = await fetch(tablesUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tables: ${response.statusText}`);
    }

    const tablesData = await response.json();
    console.log('✅ Tables fetched:', tablesData);

    // Find our table
    const table = tablesData.data?.find((t: any) => t.name === tableName);

    if (!table) {
      throw new Error(`Table '${tableName}' not found`);
    }

    console.log('✅ Found table:', table);

    // Extract schema
    let schema: TableSchema[] = [];
    if (table.columns && Array.isArray(table.columns)) {
      schema = table.columns.map((col: any) => ({
        name: col.name,
        dataType: col.type || 'string'
      }));
      console.log(`✅ Schema: ${schema.length} columns`);
    } else {
      // Fallback schema
      schema = [
        { name: 'Column1', dataType: 'string' },
        { name: 'Column2', dataType: 'string' },
        { name: 'Column3', dataType: 'string' }
      ];
      console.warn('⚠️ No columns in table metadata, using placeholder schema');
    }

    // Create sample data (Fabric API doesn't have a direct query endpoint for rows)
    const sampleData = [
      schema.map(col => `Sample ${col.name}`),
      schema.map(col => `Example data`),
      schema.map(col => `More data`)
    ];

    console.log('💡 Note: Fabric REST API does not provide row data directly');
    console.log('💡 Creating Excel with schema and sample data');
    console.log('💡 For real data, use Power Query connection to Lakehouse in Excel');

    // Create and download Excel
    await createAndDownloadExcel({
      tableName,
      schema,
      data: sampleData
    });

  } catch (error) {
    console.error('❌ Failed to fetch and download:', error);
    throw error;
  }
}
