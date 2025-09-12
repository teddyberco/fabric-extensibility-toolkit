/**
 * WOPI Host Service for Excel Online Integration
 * Implements Web Application Open Platform Interface for embedding Excel in Fabric
 */

export interface WOPIFileInfo {
  BaseFileName: string;
  OwnerId: string;
  Size: number;
  UserId: string;
  UserFriendlyName: string;
  Version: string;
  SupportsUpdate: boolean;
  SupportsLocks: boolean;
  SupportsGetLock: boolean;
  SupportsExtendedLockLength: boolean;
  UserCanWrite: boolean;
  UserCanRename: boolean;
  UserCanNotWriteRelative: boolean;
  HostEditUrl: string;
  HostViewUrl: string;
  CloseUrl: string;
  FileSharingUrl?: string;
  HostRestUrl: string;
  SHA256?: string;
}

export interface WOPIToken {
  access_token: string;
  access_token_ttl: number;
}

export interface WOPILockInfo {
  Lock?: string;
  LockExpiration?: number;
}

export class WOPIHostService {
  private static instance: WOPIHostService;
  private baseUrl: string;
  private workloadClient: any;

  private constructor() {
    this.baseUrl = process.env.FRONTEND_URL || 'http://localhost:60006';
  }

  public static getInstance(): WOPIHostService {
    if (!WOPIHostService.instance) {
      WOPIHostService.instance = new WOPIHostService();
    }
    return WOPIHostService.instance;
  }

  public initialize(workloadClient: any): void {
    this.workloadClient = workloadClient;
  }

  /**
   * Generate Excel Online URL for embedding
   */
  public async getExcelOnlineUrl(fileId: string, action: 'edit' | 'view' = 'edit'): Promise<string> {
    // WOPI Discovery endpoint - would be configured for your Fabric environment
    const wopiDiscoveryUrl = 'https://onenote.officeapps.live.com/hosting/discovery';
    
    // In production, you'd fetch this from WOPI discovery
    const excelOnlineBaseUrl = 'https://excel.officeapps.live.com/x/_layouts/15/Doc.aspx';
    
    // Generate access token for file
    const accessToken = await this.generateAccessToken(fileId);
    
    // WOPI Host endpoints for this file
    const wopiSrc = `${this.baseUrl}/wopi/files/${fileId}`;
    
    // Construct Excel Online URL
    const params = new URLSearchParams({
      'sourcedoc': fileId,
      'action': action,
      'wopisrc': wopiSrc,
      'access_token': accessToken.access_token,
      'access_token_ttl': accessToken.access_token_ttl.toString()
    });

    return `${excelOnlineBaseUrl}?${params.toString()}`;
  }

  /**
   * Generate access token for WOPI file access
   */
  private async generateAccessToken(fileId: string): Promise<WOPIToken> {
    // In production, this would integrate with Fabric's token system
    // and generate a secure token for file access
    
    const token = {
      access_token: this.generateSecureToken(fileId),
      access_token_ttl: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };

    return token;
  }

  private generateSecureToken(fileId: string): string {
    // In production, this would be a proper JWT or similar secure token
    // that includes user identity, file permissions, expiration, etc.
    const payload = {
      fileId,
      userId: 'current-user-id',
      permissions: ['read', 'write'],
      issued: Date.now()
    };
    
    // This would be properly signed in production
    return btoa(JSON.stringify(payload));
  }

  /**
   * Create Excel file from Lakehouse data for WOPI editing
   */
  public async createExcelFromLakehouseData(
    tableName: string, 
    data: any[][], 
    metadata: any
  ): Promise<string> {
    try {
      // Generate unique file ID
      const fileId = `lakehouse_${tableName}_${Date.now()}`;
      
      // Create Excel file from data (this would integrate with OneLake)
      const excelData = this.convertToExcelFormat(data, metadata);
      
      // Save to storage backend (OneLake in production)
      await this.saveToStorage(fileId, excelData);
      
      return fileId;
    } catch (error) {
      console.error('Failed to create Excel file from Lakehouse data:', error);
      throw new Error('Excel file creation failed');
    }
  }

  private convertToExcelFormat(data: any[][], metadata: any): Blob {
    // Convert data to Excel format
    // In production, this would create a proper .xlsx file
    const csvContent = data.map(row => row.join(',')).join('\n');
    return new Blob([csvContent], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  private async saveToStorage(fileId: string, data: Blob): Promise<void> {
    // In production, this would save to OneLake or your chosen storage
    console.log(`Saving file ${fileId} to storage:`, data);
  }

  /**
   * Handle WOPI callback for saving changes back to Lakehouse
   */
  public async handleWOPICallback(fileId: string, changes: any): Promise<void> {
    try {
      // Extract the modified data from Excel
      const modifiedData = await this.extractDataFromExcel(changes);
      
      // Save back to Lakehouse (this would use Fabric's Lakehouse APIs)
      await this.saveLakehouseChanges(fileId, modifiedData);
      
      console.log(`Successfully saved changes from Excel back to Lakehouse for file: ${fileId}`);
    } catch (error) {
      console.error('Failed to save Excel changes to Lakehouse:', error);
      throw error;
    }
  }

  private async extractDataFromExcel(changes: any): Promise<any[][]> {
    // Extract data from Excel changes
    // This would parse the Excel file format and extract the data
    return changes.data || [];
  }

  private async saveLakehouseChanges(fileId: string, data: any[][]): Promise<void> {
    // Save changes back to the original Lakehouse table
    // This would use Fabric's Lakehouse write APIs
    console.log(`Saving changes to Lakehouse for file: ${fileId}`, data);
  }
}