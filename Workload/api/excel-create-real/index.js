/**
 * Azure Function: Create Real Excel Workbook
 * Handles Excel file creation for production deployment
 */

const ExcelJS = require('exceljs');

module.exports = async function (context, req) {
  context.log('📊 Excel creation request received');
  
  try {
    const { tableName, tableData, schema, workspaceId, lakehouseId } = req.body;
    
    if (!tableName || !schema || !Array.isArray(schema)) {
      return {
        status: 400,
        body: {
          success: false,
          error: 'Missing required parameters: tableName, schema'
        }
      };
    }

    context.log(`Creating Excel for table: ${tableName}`);
    
    // Create Excel workbook using ExcelJS
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(tableName);
    
    // Add headers
    const headers = schema.map(col => col.name);
    worksheet.addRow(headers);
    
    // Style headers
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFCCCCCC' }
    };
    
    // Add data rows
    if (tableData && Array.isArray(tableData)) {
      tableData.forEach(row => {
        worksheet.addRow(row);
      });
    }
    
    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 15;
    });
    
    // Generate Excel buffer
    const buffer = await workbook.xlsx.writeBuffer();
    
    context.log(`✅ Excel created: ${buffer.length} bytes, ${tableData?.length || 0} rows`);
    
    // For production, return base64 encoded Excel file for download
    // In a full implementation, you'd upload to Azure Blob Storage and return URL
    const base64Excel = buffer.toString('base64');
    const fileName = `${tableName}_${Date.now()}.xlsx`;
    
    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: {
        success: true,
        fileId: `excel_${tableName}_${Date.now()}`,
        fileName: fileName,
        embedUrl: null, // Azure Function doesn't serve embedded Excel viewer
        webUrl: null,
        downloadUrl: `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64Excel}`,
        base64: base64Excel,
        message: 'Excel file created successfully (download-only mode in production)',
        metadata: {
          tableName,
          rowCount: tableData?.length || 0,
          columnCount: headers.length,
          size: buffer.length
        }
      }
    };
    
  } catch (error) {
    context.log.error('❌ Excel creation error:', error);
    
    return {
      status: 500,
      body: {
        success: false,
        error: error.message,
        fallbackMessage: 'Excel creation failed'
      }
    };
  }
};
