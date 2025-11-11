param (
    [Parameter(Mandatory=$true)]
    [string]$AppId = "dc3ada4f-d601-4de2-9d50-5052dda745a5"
)

Write-Host "Adding Fabric API permissions to AAD App: $AppId" -ForegroundColor Green

# Ensure user is logged in
$loginResult = az login --allow-no-subscriptions
if ($LASTEXITCODE -ne 0) {
    Write-Error "Azure login failed"
    exit 1
}

# Get the existing app
Write-Host "Fetching existing application..." -ForegroundColor Yellow
$appJson = az ad app show --id $AppId
$app = $appJson | ConvertFrom-Json

# Fabric API permissions (Power BI Service API)
$fabricApiId = "00000009-0000-0000-c000-000000000000"
$permissions = @{
    "Workspace.Read.All" = "b2f1b2fa-f35c-407c-979c-a858a808ba85"
    "Item.Read.All" = "d2bc95fc-440e-4b0e-bafd-97182de7aef5"
    "Item.ReadWrite.All" = "7a27a256-301d-4359-b77b-c2b759d2e362"
    "Report.ReadWrite.All" = "7504609f-c495-4c64-8542-686125a5a36f"
    "Fabric.Extend" = "7ba630b9-8110-4e27-8d17-81e5f2218787"
}

# Build the required resource access array
$existingAccess = $app.requiredResourceAccess | Where-Object { $_.resourceAppId -eq $fabricApiId }

if ($existingAccess) {
    Write-Host "Found existing Fabric API permissions" -ForegroundColor Yellow
    $resourceAccess = @($existingAccess.resourceAccess)
} else {
    Write-Host "No existing Fabric API permissions found, creating new entry" -ForegroundColor Yellow
    $resourceAccess = @()
}

# Add missing permissions
$existingIds = $resourceAccess | ForEach-Object { $_.id }

foreach ($permissionName in $permissions.Keys) {
    $permissionId = $permissions[$permissionName]
    if ($existingIds -contains $permissionId) {
        Write-Host "  ✓ Permission '$permissionName' already exists" -ForegroundColor Gray
    } else {
        Write-Host "  + Adding permission '$permissionName'" -ForegroundColor Green
        $resourceAccess += @{
            id = $permissionId
            type = "Scope"
        }
    }
}

# Build the complete requiredResourceAccess array
$otherApis = $app.requiredResourceAccess | Where-Object { $_.resourceAppId -ne $fabricApiId }
$allResourceAccess = @(
    @{
        resourceAppId = $fabricApiId
        resourceAccess = $resourceAccess
    }
)

if ($otherApis) {
    $allResourceAccess += $otherApis
}

# Update the application
Write-Host "`nUpdating application with new permissions..." -ForegroundColor Yellow

$updateBody = @{
    requiredResourceAccess = $allResourceAccess
} | ConvertTo-Json -Depth 10

$tempFile = [System.IO.Path]::GetTempFileName()
$updateBody | Out-File -FilePath $tempFile -Encoding UTF8

try {
    az rest --method PATCH `
        --url "https://graph.microsoft.com/v1.0/applications/$($app.id)" `
        --headers "Content-Type=application/json" `
        --body "@$tempFile"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Successfully updated application permissions!" -ForegroundColor Green
        Write-Host "`n⚠️  IMPORTANT: You still need to grant admin consent!" -ForegroundColor Yellow
        Write-Host "`nOption 1 - Use this URL (requires admin rights):" -ForegroundColor Cyan
        $tenantId = (az account show | ConvertFrom-Json).tenantId
        Write-Host "https://login.microsoftonline.com/$tenantId/adminconsent?client_id=$AppId" -ForegroundColor White
        Write-Host "`nOption 2 - Go to Azure Portal:" -ForegroundColor Cyan
        Write-Host "https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/CallAnAPI/appId/$AppId" -ForegroundColor White
        Write-Host "Then click 'Grant admin consent for [your tenant]'" -ForegroundColor White
    } else {
        Write-Error "Failed to update application"
        exit 1
    }
} finally {
    Remove-Item $tempFile -ErrorAction SilentlyContinue
}
