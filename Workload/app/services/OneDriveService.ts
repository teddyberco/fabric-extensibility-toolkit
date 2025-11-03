import { WorkloadClientAPI } from '@ms-fabric/workload-client';

export interface OneDriveUploadResult {
  fileId: string;
  fileName: string;
  embedUrl?: string;
  downloadUrl: string;
  webUrl: string;
  size: number;
}

export class OneDriveService {
  private readonly folderPath = 'Fabric Excel Files';

  constructor(private workloadClient: WorkloadClientAPI) {}
  
  private async getGraphAccessToken(): Promise<string> {
    const token = await this.workloadClient.auth.acquireFrontendAccessToken({
      scopes: ['Files.ReadWrite', 'Files.ReadWrite.All']
    });
    
    if (!token || !token.token) {
      throw new Error('Failed to acquire access token for Microsoft Graph');
    }
    
    return token.token;
  }
  
  async uploadExcelFile(blob: Blob, fileName: string): Promise<OneDriveUploadResult> {
    try {
      console.log(`📤 Uploading Excel file to OneDrive: ${fileName}`);
      console.log(`   File size: ${Math.round(blob.size / 1024)} KB`);

      const accessToken = await this.getGraphAccessToken();
      const uploadPath = `${this.folderPath}/${fileName}`;
      const uploadUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/${uploadPath}:/content`;

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        },
        body: blob
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('❌ OneDrive upload failed:', uploadResponse.status, errorText);
        
        // Check for common errors
        const errorObj = JSON.parse(errorText);
        if (errorObj.error?.message?.includes('SPO license')) {
          throw new Error('OneDrive for Business is not available (no SharePoint Online license). Please use the Download button instead.');
        }
        
        throw new Error(`OneDrive upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }

      const fileMetadata = await uploadResponse.json();
      console.log('✅ File uploaded to OneDrive successfully');
      console.log(`   File ID: ${fileMetadata.id}`);
      console.log(`   Web URL: ${fileMetadata.webUrl}`);

      const embedUrl = await this.getOfficeOnlinePreviewUrl(fileMetadata.id, accessToken);

      return {
        fileId: fileMetadata.id,
        fileName: fileMetadata.name,
        embedUrl,
        downloadUrl: fileMetadata['@microsoft.graph.downloadUrl'] || fileMetadata.webUrl,
        webUrl: fileMetadata.webUrl,
        size: fileMetadata.size
      };
    } catch (error) {
      console.error('❌ OneDrive upload failed:', error);
      throw error;
    }
  }

  private async getOfficeOnlinePreviewUrl(
    fileId: string,
    accessToken: string
  ): Promise<string | undefined> {
    try {
      console.log('🔗 Getting Office Online embed URL...');

      const previewUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/preview`;
      const previewResponse = await fetch(previewUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          viewer: 'excel',
          chromeless: false
        })
      });

      if (!previewResponse.ok) {
        console.warn('⚠️ Could not get embed URL:', previewResponse.status);
        return undefined;
      }

      const previewData = await previewResponse.json();
      console.log('✅ Office Online embed URL retrieved');
      return previewData.getUrl;
    } catch (error) {
      console.warn('⚠️ Error getting embed URL:', error);
      return undefined;
    }
  }

  async checkOneDriveAccess(): Promise<boolean> {
    try {
      const accessToken = await this.getGraphAccessToken();
      const response = await fetch('https://graph.microsoft.com/v1.0/me/drive', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      return response.ok;
    } catch (error) {
      console.warn('⚠️ OneDrive access check failed:', error);
      return false;
    }
  }
}