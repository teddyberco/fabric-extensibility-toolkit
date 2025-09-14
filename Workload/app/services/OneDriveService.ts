/**
 * OneDrive Service for Real Excel Workbook Storage
 * 
 * This service handles authentication with Microsoft Graph API and manages
 * Excel file storage in OneDrive for real Excel Online embedding.
 */

import { Client } from '@microsoft/microsoft-graph-client';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ExcelFileMetadata {
  fileName: string;
  tableSchema: Array<{ name: string; dataType: string }>;
  rowCount: number;
  createdAt: string;
  oneLakeTable: string;
}

interface OneDriveUploadResult {
  fileId: string;
  fileName: string;
  embedUrl: string;
  downloadUrl: string;
  webUrl: string;
}

export class OneDriveService {
  private msalClient: ConfidentialClientApplication | null = null;
  private graphClient: Client | null = null;
  private readonly folderPath = '/Fabric Workload/Excel Files';
  private readonly useAzCli = process.env.USE_AZURE_CLI_AUTH === 'true';

  constructor() {
    // Only initialize MSAL if not using Azure CLI auth
    if (!this.useAzCli && process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET) {
      this.msalClient = new ConfidentialClientApplication({
        auth: {
          clientId: process.env.AZURE_CLIENT_ID,
          clientSecret: process.env.AZURE_CLIENT_SECRET,
          authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID || 'common'}`
        }
      });
    }
  }

  /**
   * Authenticate and initialize Microsoft Graph client
   */
  async authenticate(): Promise<void> {
    try {
      let accessToken: string;

      if (this.useAzCli) {
        // Use Azure CLI authentication in development
        console.log('🔐 Using Azure CLI authentication...');
        accessToken = await this.getAzCliToken();
      } else if (this.msalClient) {
        // Use client credentials flow for production
        console.log('🔐 Using Azure AD app authentication...');
        const clientCredentialRequest = {
          scopes: ['https://graph.microsoft.com/.default'],
        };

        const response = await this.msalClient.acquireTokenByClientCredential(clientCredentialRequest);
        
        if (!response || !response.accessToken) {
          throw new Error('Failed to acquire access token');
        }
        accessToken = response.accessToken;
      } else {
        throw new Error('No authentication method available. Set USE_AZURE_CLI_AUTH=true or provide Azure AD app credentials.');
      }

      // Initialize Graph client with acquired token
      this.graphClient = Client.init({
        authProvider: (done) => {
          done(null, accessToken);
        }
      });

      console.log('✅ OneDrive service authenticated successfully');
    } catch (error) {
      console.error('❌ OneDrive authentication failed:', error);
      throw new Error(`OneDrive authentication failed: ${error}`);
    }
  }

  /**
   * Get access token from Azure CLI
   */
  private async getAzCliToken(): Promise<string> {
    try {
      const { stdout } = await execAsync('az account get-access-token --resource https://graph.microsoft.com --query accessToken --output tsv');
      const token = stdout.trim();
      
      if (!token) {
        throw new Error('No access token returned from Azure CLI');
      }
      
      return token;
    } catch (error) {
      throw new Error(`Azure CLI authentication failed. Make sure you're logged in with 'az login': ${error}`);
    }
  }

  /**
   * Upload Excel file to OneDrive and get embed URL
   */
  async uploadExcelFile(
    fileBuffer: Buffer, 
    fileName: string, 
    metadata: ExcelFileMetadata
  ): Promise<OneDriveUploadResult> {
    if (!this.graphClient) {
      await this.authenticate();
    }

    try {
      console.log(`📤 Uploading Excel file: ${fileName}`);

      // Ensure folder exists
      await this.ensureFolderExists();

      // Upload file to OneDrive
      const uploadPath = `${this.folderPath}/${fileName}`;
      const uploadResponse = await this.graphClient!
        .api(`/me/drive/root:${uploadPath}:/content`)
        .put(fileBuffer);

      console.log('✅ File uploaded successfully:', uploadResponse.id);

      // Generate embed URL for iframe embedding
      const embedLink = await this.graphClient!
        .api(`/me/drive/items/${uploadResponse.id}/createLink`)
        .post({
          type: 'embed',
          scope: 'anonymous' // Allow anonymous viewing/editing
        });

      // Also get direct web URL for fallback
      const webLink = await this.graphClient!
        .api(`/me/drive/items/${uploadResponse.id}/createLink`)
        .post({
          type: 'edit',
          scope: 'anonymous'
        });

      return {
        fileId: uploadResponse.id,
        fileName: fileName,
        embedUrl: embedLink.link.webUrl,
        downloadUrl: uploadResponse['@microsoft.graph.downloadUrl'],
        webUrl: webLink.link.webUrl
      };

    } catch (error) {
      console.error('❌ OneDrive upload failed:', error);
      throw new Error(`Failed to upload Excel file: ${error.message}`);
    }
  }

  /**
   * Create Excel file from OneLake table data
   */
  async createExcelFromOneLakeData(
    tableName: string,
    tableData: any[],
    schema: Array<{ name: string; dataType: string }>
  ): Promise<OneDriveUploadResult> {
    // Import ExcelJS dynamically to avoid bundling issues
    const ExcelJS = require('exceljs');
    
    try {
      console.log(`📊 Creating Excel file from OneLake table: ${tableName}`);

      // Create new workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(tableName);

      // Set up headers with styling
      const headers = schema.map(col => col.name);
      worksheet.addRow(headers);
      
      // Style the header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '0078D4' }
      };

      // Add data rows
      tableData.forEach(row => {
        worksheet.addRow(row);
      });

      // Auto-size columns
      worksheet.columns.forEach((column: any) => {
        column.width = 15; // Default width
      });

      // Create table for filtering and sorting
      worksheet.addTable({
        name: `Table_${tableName}`,
        ref: `A1:${String.fromCharCode(64 + headers.length)}${tableData.length + 1}`,
        headerRow: true,
        style: {
          theme: 'TableStyleMedium2',
          showRowStripes: true,
        }
      });

      // Generate file buffer
      const fileBuffer = await workbook.xlsx.writeBuffer();
      
      // Create metadata
      const metadata: ExcelFileMetadata = {
        fileName: `${tableName}_${Date.now()}.xlsx`,
        tableSchema: schema,
        rowCount: tableData.length,
        createdAt: new Date().toISOString(),
        oneLakeTable: tableName
      };

      // Upload to OneDrive
      return await this.uploadExcelFile(
        Buffer.from(fileBuffer),
        metadata.fileName,
        metadata
      );

    } catch (error) {
      console.error('❌ Excel creation failed:', error);
      throw new Error(`Failed to create Excel file: ${error.message}`);
    }
  }

  /**
   * Get embed URL for existing OneDrive file
   */
  async getEmbedUrl(fileId: string): Promise<string> {
    if (!this.graphClient) {
      await this.authenticate();
    }

    try {
      const embedLink = await this.graphClient!
        .api(`/me/drive/items/${fileId}/createLink`)
        .post({
          type: 'embed',
          scope: 'anonymous'
        });

      return embedLink.link.webUrl;
    } catch (error) {
      console.error('❌ Failed to get embed URL:', error);
      throw new Error(`Failed to generate embed URL: ${error.message}`);
    }
  }

  /**
   * List Excel files in the Fabric folder
   */
  async listExcelFiles(): Promise<any[]> {
    if (!this.graphClient) {
      await this.authenticate();
    }

    try {
      const filesResponse = await this.graphClient!
        .api(`/me/drive/root:${this.folderPath}:/children`)
        .filter('name endswith \'.xlsx\'')
        .get();

      return filesResponse.value || [];
    } catch (error) {
      console.error('❌ Failed to list files:', error);
      return [];
    }
  }

  /**
   * Ensure the Fabric folder exists in OneDrive
   */
  private async ensureFolderExists(): Promise<void> {
    try {
      // Check if folder exists
      await this.graphClient!
        .api(`/me/drive/root:${this.folderPath}`)
        .get();
      
      console.log('✅ Fabric folder already exists');
    } catch (error) {
      // Folder doesn't exist, create it
      console.log('📁 Creating Fabric folder in OneDrive');
      
      await this.graphClient!
        .api('/me/drive/root/children')
        .post({
          name: 'Fabric Workload',
          folder: {},
          '@microsoft.graph.conflictBehavior': 'replace'
        });

      await this.graphClient!
        .api('/me/drive/root:/Fabric Workload:/children')
        .post({
          name: 'Excel Files',
          folder: {},
          '@microsoft.graph.conflictBehavior': 'replace'
        });

      console.log('✅ Fabric folder structure created');
    }
  }
}

// Singleton instance
export const oneDriveService = new OneDriveService();