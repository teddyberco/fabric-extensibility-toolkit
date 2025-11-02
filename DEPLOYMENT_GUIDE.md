# Excel Edit Workload - Production Deployment Guide

## Prerequisites

- ✅ Azure CLI installed and authenticated (`az login`)
- ✅ Azure Web App created (or use script to create one)
- ✅ Entra Application configured with correct permissions
- ✅ Fabric Admin access for manifest upload

## Quick Deployment (All Steps)

### 1. Configure Production Environment

Update `Workload/.env.prod` with your production values:

```bash
# Update these values:
WORKLOAD_NAME=Org.TeddyWorkload
FRONTEND_APPID=dc3ada4f-d601-4de2-9d50-5052dda745a5
FRONTEND_URL=https://YOUR-WEBAPP-NAME.azurewebsites.net/
```

### 2. Build Production Release

```powershell
# From repository root (d:\Git\FET\editExcel)
.\scripts\Build\BuildRelease.ps1 `
  -WorkloadName "Org.TeddyWorkload" `
  -FrontendAppId "dc3ada4f-d601-4de2-9d50-5052dda745a5" `
  -WorkloadVersion "1.0.0" `
  -Environment "prod"
```

**Output:**
- `release/ManifestPackage.1.0.0.nupkg` - Manifest for Fabric
- `release/app/` - Compiled frontend application

### 3. Deploy to Azure Web App

#### Option A: Use Existing Web App

```powershell
.\scripts\Deploy\DeployToAzureWebApp.ps1 `
  -WebAppName "teddy-excel-workload" `
  -ResourceGroupName "fabric-workloads-rg"
```

#### Option B: Create New Web App First

```powershell
# Create resource group
az group create --name "fabric-workloads-rg" --location "eastus"

# Create App Service Plan
az appservice plan create `
  --name "fabric-workload-plan" `
  --resource-group "fabric-workloads-rg" `
  --sku B1 `
  --is-linux

# Create Web App
az webapp create `
  --name "teddy-excel-workload" `
  --resource-group "fabric-workloads-rg" `
  --plan "fabric-workload-plan" `
  --runtime "NODE:18-lts"

# Then deploy
.\scripts\Deploy\DeployToAzureWebApp.ps1 `
  -WebAppName "teddy-excel-workload" `
  -ResourceGroupName "fabric-workloads-rg"
```

### 4. Configure Azure Web App Settings

After deployment, configure required settings:

```powershell
# Enable HTTPS only
az webapp update `
  --name "teddy-excel-workload" `
  --resource-group "fabric-workloads-rg" `
  --https-only true

# Configure CORS (if needed)
az webapp cors add `
  --name "teddy-excel-workload" `
  --resource-group "fabric-workloads-rg" `
  --allowed-origins "https://*.fabric.microsoft.com" "https://*.powerbi.com"
```

### 5. Update Entra Application Redirect URIs

Add your Azure Web App URL to your Entra application:

```powershell
# Get your Web App URL
az webapp show `
  --name "teddy-excel-workload" `
  --resource-group "fabric-workloads-rg" `
  --query "defaultHostName" -o tsv
```

Then in Azure Portal:
1. Go to **Azure Active Directory** → **App Registrations**
2. Find your app (dc3ada4f-d601-4de2-9d50-5052dda745a5)
3. Go to **Authentication** → **Single-page application**
4. Add redirect URI: `https://teddy-excel-workload.azurewebsites.net/`

### 6. Upload Manifest to Fabric

**Manual Steps (Required):**

1. Navigate to [Microsoft Fabric Admin Portal](https://admin.fabric.microsoft.com)
2. Sign in with Fabric admin credentials
3. Go to **Workload Management** section
4. Click **"Upload workload"**
5. Select file: `d:\Git\FET\editExcel\release\ManifestPackage.1.0.0.nupkg`
6. Click **"Add"** to activate the workload

### 7. Test Deployment

1. **Test Web App:**
   ```powershell
   # Open in browser
   start https://teddy-excel-workload.azurewebsites.net/
   ```

2. **Test in Fabric:**
   - Go to a Fabric workspace
   - Click experience switcher (bottom-left)
   - Your workload should appear: "Org.TeddyWorkload"
   - Create a new "ExcelEdit" item
   - Verify it loads and functions correctly

---

## Environment-Specific Configurations

### Development (.env.dev)
- Local development with DevGateway
- Uses `http://localhost:60006/`

### Production (.env.prod)
- Azure Web App deployment
- Uses `https://your-webapp.azurewebsites.net/`

---

## Troubleshooting

### Issue: "Build fails with npm errors"

```powershell
cd Workload
npm install
npm run build:prod
```

### Issue: "Web App shows 404 errors"

Check `web.config` routing configuration in `release/app/web.config`

### Issue: "Authentication fails"

1. Verify Entra app redirect URIs include your Web App URL
2. Check `FRONTEND_APPID` matches your Entra application
3. Verify API permissions are granted

### Issue: "Workload not appearing in Fabric"

1. Verify manifest uploaded successfully in Admin Portal
2. Check workload status is "Active in tenant"
3. Confirm `WORKLOAD_NAME` matches between `.env.prod` and manifest
4. Wait up to 10 minutes for propagation

### Issue: "CORS errors in browser"

Update Content Security Policy headers in `web.config`:

```xml
<add name="Content-Security-Policy" value="frame-ancestors 'self' https://*.fabric.microsoft.com https://*.powerbi.com" />
```

---

## Quick Reference Commands

### Build Only
```powershell
.\scripts\Build\BuildRelease.ps1 -Environment "prod"
```

### Deploy Only
```powershell
.\scripts\Deploy\DeployToAzureWebApp.ps1 -WebAppName "YOUR-WEBAPP" -ResourceGroupName "YOUR-RG"
```

### Build + Deploy (Combined)
```powershell
# Build
.\scripts\Build\BuildRelease.ps1 -Environment "prod"

# Deploy
.\scripts\Deploy\DeployToAzureWebApp.ps1 -WebAppName "teddy-excel-workload" -ResourceGroupName "fabric-workloads-rg"
```

### Force Deploy (Skip Confirmation)
```powershell
.\scripts\Deploy\DeployToAzureWebApp.ps1 `
  -WebAppName "teddy-excel-workload" `
  -ResourceGroupName "fabric-workloads-rg" `
  -Force $true
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Microsoft Fabric                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │        Workload Hub (Admin Portal)                   │   │
│  │  - Manifest: ManifestPackage.1.0.0.nupkg             │   │
│  │  - Points to: Frontend URL                           │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                   │
│                          │ (iFrame load)                     │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           User Workspace                             │   │
│  │  - Experience Switcher shows "Org.TeddyWorkload"     │   │
│  │  - Create ExcelEdit items                            │   │
│  │  - Loads from: Azure Web App                         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ (HTTPS requests)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Azure Web App                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Name: teddy-excel-workload.azurewebsites.net        │   │
│  │  Contents:                                           │   │
│  │    - index.html                                      │   │
│  │    - bundle.js (React app)                           │   │
│  │    - assets/ (icons, styles)                         │   │
│  │    - web.config (routing rules)                      │   │
│  │                                                       │   │
│  │  Configuration:                                      │   │
│  │    - HTTPS only                                      │   │
│  │    - CORS for Fabric domains                         │   │
│  │    - CSP headers configured                          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ (Authentication)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Azure Active Directory (Entra)                 │
│  - Application ID: dc3ada4f-d601-4de2-9d50-5052dda745a5     │
│  - Redirect URI: https://teddy-excel-workload...net/        │
│  - Permissions: Fabric API                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Next Steps After Deployment

1. ✅ Test all item types (ExcelEdit, HelloWorld)
2. ✅ Verify Spark session pre-warming works
3. ✅ Test Excel file download with real data
4. ✅ Monitor Azure Web App logs for errors
5. ✅ Set up Application Insights for monitoring
6. ✅ Configure alerts for failures
7. ✅ Document user guide and admin instructions

---

## Production Checklist

Before going live:

- [ ] `.env.prod` configured with correct values
- [ ] Entra application redirect URIs updated
- [ ] Azure Web App created and configured
- [ ] Frontend deployed and accessible
- [ ] Manifest uploaded to Fabric Admin Portal
- [ ] Workload appears in Fabric workspace
- [ ] All item types tested
- [ ] Authentication flows working
- [ ] Spark integration tested with real lakehouse
- [ ] Error handling validated
- [ ] Performance acceptable
- [ ] Monitoring configured
- [ ] Documentation complete
- [ ] Support process established

---

**Need Help?**
- Check the troubleshooting section above
- Review deployment logs in Azure Portal
- Check Fabric Admin Portal for workload status
- Verify browser console for client-side errors
