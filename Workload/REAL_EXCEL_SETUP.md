# Real Excel Integration Setup

This workload includes support for creating and embedding real Excel Online workbooks from Lakehouse data using Microsoft Graph API and OneDrive storage.

## Development Setup (Azure CLI Authentication)

For development, the easiest way to enable real Excel integration is using Azure CLI authentication:

### Prerequisites

1. **Install Azure CLI** if not already installed:
   ```bash
   # Download from: https://aka.ms/installazurecliwindows
   # Or use winget:
   winget install Microsoft.AzureCLI
   ```

2. **Login to Azure CLI**:
   ```bash
   az login
   ```
   This will open a browser for authentication and store your credentials locally.

3. **Verify your login**:
   ```bash
   az account show
   ```

### Enable Real Excel Integration

1. **Update configuration** in `.env.dev`:
   ```bash
   # Already configured for you:
   USE_AZURE_CLI_AUTH=true
   ENABLE_REAL_EXCEL=true
   ```

2. **Start the development server**:
   ```bash
   npm start
   ```

3. **Test real Excel creation**:
   - Navigate to an Excel Edit item
   - Click "Create Real Excel" button
   - The system will use your Azure CLI credentials to create a real Excel file in OneDrive

## Production Setup (Azure AD App Registration)

For production deployment, you'll need to create an Azure AD App Registration:

### 1. Create Azure AD App

1. Go to [Azure Portal](https://portal.azure.com) > Azure Active Directory > App registrations
2. Click "New registration"
3. Configure:
   - **Name**: "Fabric Workload Excel Integration"
   - **Supported account types**: "Accounts in this organizational directory only"
   - **Redirect URI**: Not needed for this flow
4. Click "Register"

### 2. Configure API Permissions

1. Go to **API permissions** > **Add a permission**
2. Select **Microsoft Graph** > **Application permissions**
3. Add these permissions:
   - `Files.ReadWrite.All` - To create and manage Excel files
   - `Sites.ReadWrite.All` - To access OneDrive/SharePoint
4. Click **Grant admin consent**

### 3. Create Client Secret

1. Go to **Certificates & secrets** > **New client secret**
2. Add description: "Fabric Workload Excel Integration"
3. Set expiration as needed
4. **Copy the secret value** (you won't see it again)

### 4. Update Production Configuration

Update your production `.env` file:

```bash
# Production Azure AD Configuration
USE_AZURE_CLI_AUTH=false
ENABLE_REAL_EXCEL=true
AZURE_CLIENT_ID=your-app-client-id
AZURE_CLIENT_SECRET=your-app-client-secret
AZURE_TENANT_ID=your-tenant-id
```

## How It Works

1. **File Creation**: Excel files are created using ExcelJS library with data from Lakehouse tables
2. **Storage**: Files are uploaded to OneDrive in the `/Fabric Workload/Excel Files/` folder
3. **Embedding**: Excel Online embed URLs are generated for iframe integration
4. **Authentication**: 
   - Dev: Uses your personal Azure CLI credentials
   - Prod: Uses Azure AD app credentials for service-to-service auth

## Troubleshooting

### "Authentication failed" error

**Development:**
- Run `az login` to refresh your credentials
- Verify with `az account show`

**Production:**
- Check client ID, secret, and tenant ID are correct
- Verify API permissions are granted

### "File creation failed" error

- Check OneDrive permissions
- Verify the `/Fabric Workload/Excel Files/` folder exists or can be created

### Fallback to Demo Excel

If real Excel creation fails, the system automatically falls back to the demo Excel interface. This ensures the workload always functions, even without Azure configuration.

## File Structure

- `OneDriveService.ts` - Microsoft Graph API integration
- `RealExcelService.ts` - High-level Excel creation service  
- `wopiHost.js` - WOPI Host endpoints for Excel Online
- `.env.dev` - Development configuration