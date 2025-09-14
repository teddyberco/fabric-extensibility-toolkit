/**
 * Real Excel Integration Service
 * 
 * This service replaces the demo Excel interface with real Excel Online embedding
 * using OneDrive storage and Microsoft Graph API.
 */

import { oneDriveService } from './OneDriveService';

interface RealExcelOptions {
  tableName: string;
  tableData: any[];
  schema: Array<{ name: string; dataType: string }>;
  userId?: string;
}

interface ExcelEmbedResult {
  success: boolean;
  embedUrl?: string;
  fileId?: string;
  fileName?: string;
  webUrl?: string;
  error?: string;
}

export class RealExcelService {
  
  /**
   * Create and embed a real Excel workbook from OneLake data
   */
  async createRealExcelWorkbook(options: RealExcelOptions): Promise<ExcelEmbedResult> {
    try {
      console.log('🎯 Creating real Excel workbook for table:', options.tableName);

      // Step 1: Authenticate with OneDrive
      await oneDriveService.authenticate();

      // Step 2: Create Excel file from OneLake data
      const uploadResult = await oneDriveService.createExcelFromOneLakeData(
        options.tableName,
        options.tableData,
        options.schema
      );

      console.log('✅ Real Excel workbook created successfully:');
      console.log('  📁 File ID:', uploadResult.fileId);
      console.log('  🔗 Embed URL:', uploadResult.embedUrl);
      console.log('  🌐 Web URL:', uploadResult.webUrl);

      return {
        success: true,
        embedUrl: uploadResult.embedUrl,
        fileId: uploadResult.fileId,
        fileName: uploadResult.fileName,
        webUrl: uploadResult.webUrl
      };

    } catch (error) {
      console.error('❌ Real Excel creation failed:', error);
      
      return {
        success: false,
        error: error.message || 'Failed to create real Excel workbook'
      };
    }
  }

  /**
   * Get embed URL for existing Excel file
   */
  async getExcelEmbedUrl(fileId: string): Promise<ExcelEmbedResult> {
    try {
      console.log('🔗 Getting embed URL for file:', fileId);

      const embedUrl = await oneDriveService.getEmbedUrl(fileId);

      return {
        success: true,
        embedUrl: embedUrl,
        fileId: fileId
      };

    } catch (error) {
      console.error('❌ Failed to get embed URL:', error);
      
      return {
        success: false,
        error: error.message || 'Failed to get embed URL'
      };
    }
  }

  /**
   * List available Excel workbooks
   */
  async listAvailableWorkbooks(): Promise<any[]> {
    try {
      console.log('📋 Listing available Excel workbooks');

      const files = await oneDriveService.listExcelFiles();
      
      return files.map(file => ({
        id: file.id,
        name: file.name,
        size: file.size,
        createdDateTime: file.createdDateTime,
        lastModifiedDateTime: file.lastModifiedDateTime,
        webUrl: file.webUrl
      }));

    } catch (error) {
      console.error('❌ Failed to list workbooks:', error);
      return [];
    }
  }

  /**
   * Enhanced Excel URL with proper iframe parameters
   */
  getOptimizedEmbedUrl(baseEmbedUrl: string): string {
    try {
      const url = new URL(baseEmbedUrl);
      
      // Add parameters for better iframe experience
      url.searchParams.set('em', '2'); // Enable editing mode
      url.searchParams.set('wdAr', '1'); // Auto resize
      url.searchParams.set('wdHideGridlines', '0'); // Show gridlines
      url.searchParams.set('wdHideHeaders', '0'); // Show headers
      url.searchParams.set('wdDownloadButton', '1'); // Show download button
      url.searchParams.set('wdInConfigurator', '1'); // Configuration mode
      
      return url.toString();
    } catch (error) {
      console.error('❌ Failed to optimize embed URL:', error);
      return baseEmbedUrl;
    }
  }

  /**
   * Test if real Excel embedding is available
   */
  async testRealExcelAvailability(): Promise<boolean> {
    try {
      // Test basic authentication
      await oneDriveService.authenticate();
      
      console.log('✅ Real Excel embedding is available');
      return true;
    } catch (error) {
      console.error('❌ Real Excel embedding not available:', error);
      return false;
    }
  }

  /**
   * Create a simple test Excel file for verification
   */
  async createTestExcelFile(): Promise<ExcelEmbedResult> {
    const testData = [
      ['Product', 'Quantity', 'Price', 'Total'],
      ['Widget A', 10, 5.99, 59.90],
      ['Widget B', 25, 3.50, 87.50],
      ['Widget C', 8, 12.75, 102.00]
    ];

    const testSchema = [
      { name: 'Product', dataType: 'string' },
      { name: 'Quantity', dataType: 'number' },
      { name: 'Price', dataType: 'number' },
      { name: 'Total', dataType: 'number' }
    ];

    return await this.createRealExcelWorkbook({
      tableName: 'test_products',
      tableData: testData.slice(1), // Remove header row
      schema: testSchema
    });
  }
}

// Singleton instance
export const realExcelService = new RealExcelService();