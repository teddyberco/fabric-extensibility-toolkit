param (
    [string]$ApplicationName = "Teddy Excel Workload - Production",
    [string]$WorkloadName = "Org.TeddyWorkload",
    [string]$TenantId,
    [string]$ProductionUrl # e.g., https://your-webapp.azurewebsites.net
)

function PostAADRequest {
    param (
        [string]$url,
        [string]$body
    )
    
    # Use Azure CLI's @<file> to avoid issues with different shells / OSs
    $tempFile = [System.IO.Path]::GetTempFileName()
    $body | Out-File -FilePath $tempFile
    $azrestResult = az rest --method POST --url $url --headers "Content-Type=application/json" --body "@$tempFile"
    Remove-Item $tempFile
    return $azrestResult
}

function PrintInfo {
    param (
        [string]$key,
        [string]$value
    )
    $boldText = [char]27 + "[1m"
    $resetText = [char]27 + "[0m"
    Write-Host ("${boldText}$key : ${resetText}" + $value)
}

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Creating Production Entra App for Fabric Workload" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Get current login info
$accountInfo = az account show | ConvertFrom-Json
if (-not $accountInfo) {
    Write-Host "❌ Not logged in to Azure CLI. Please run 'az login' first." -ForegroundColor Red
    Exit 1
}

Write-Host "✅ Logged in as: $($accountInfo.user.name)" -ForegroundColor Green
Write-Host "   Tenant: $($accountInfo.tenantId)" -ForegroundColor Gray
Write-Host ""

# Prompt for missing parameters
if (-not $TenantId) {
    $TenantId = Read-Host "Enter the target tenant ID (where the workload will be deployed)"
}

if (-not $ProductionUrl) {
    $ProductionUrl = Read-Host "Enter the production URL (e.g., https://your-webapp.azurewebsites.net)"
}

# Ensure URL ends with /
if (-not $ProductionUrl.EndsWith("/")) {
    $ProductionUrl += "/"
}

Write-Host ""
Write-Host "Configuration:" -ForegroundColor Yellow
PrintInfo -key "Application Name" -value $ApplicationName
PrintInfo -key "Workload Name" -value $WorkloadName
PrintInfo -key "Target Tenant" -value $TenantId
PrintInfo -key "Production URL" -value $ProductionUrl
Write-Host ""

# Generate random suffix for audience URI to avoid collisions
$length = Get-Random -Minimum 3 -Maximum 6
$randomString = -join ((65..90) + (97..122) | Get-Random -Count $length | ForEach-Object { [char]$_ })
$applicationIdUri = "api://localdevinstance/$TenantId/$WorkloadName/$randomString"

Write-Host "🔨 Creating application..." -ForegroundColor Cyan

# Create SPA application for FERemote hosting (frontend-only)
$application = @{
    displayName = $ApplicationName
    signInAudience = "AzureADMultipleOrgs"
    optionalClaims = @{
        accessToken = @(
            @{
                essential = $false
                name = "idtyp"
            }
        )
    }
    spa = @{
        redirectUris = @(
            # Production Fabric URLs
            "https://app.powerbi.com/workloadSignIn/$TenantId/$WorkloadName"
            "https://app.fabric.microsoft.com/workloadSignIn/$TenantId/$WorkloadName"
            # MSIT URLs (if needed)
            "https://msit.powerbi.com/workloadSignIn/$TenantId/$WorkloadName"
            "https://msit.fabric.microsoft.com/workloadSignIn/$TenantId/$WorkloadName"
            # Local dev (optional - can be removed for pure production)
            "http://localhost:60006/close"
        )
    }
    identifierUris = @($applicationIdUri)
    requiredResourceAccess = @(
        @{
            resourceAppId  = "00000009-0000-0000-c000-000000000000" # Power BI Service
            resourceAccess = @(
                @{
                    id   = "7ba630b9-8110-4e27-8d17-81e5f2218787" # Fabric.Extend
                    type = "Scope"
                }
            )
        }
    )
}

# Convert to JSON
$applicationJson = ($application | ConvertTo-Json -Compress -Depth 10)

# Create application
try {
    $result = PostAADRequest -url https://graph.microsoft.com/v1.0/applications -body $applicationJson
    $resultObject = $result | ConvertFrom-Json
    
    $applicationObjectId = $resultObject.id
    $applicationId = $resultObject.appId
    
    if (-not $applicationId) {
        Write-Host "❌ Failed to create application" -ForegroundColor Red
        Exit 1
    }
    
    Write-Host "✅ Application created successfully!" -ForegroundColor Green
    Write-Host ""
    
} catch {
    Write-Host "❌ Error creating application: $_" -ForegroundColor Red
    Exit 1
}

# Add client secret (valid for 180 days)
Write-Host "🔑 Creating client secret..." -ForegroundColor Cyan

$startUtcDateTimeString = [DateTime]::UtcNow
$endUtcDateTimeString = $startUtcDateTimeString.AddDays(180)

$startUtcDateTimeString = $startUtcDateTimeString.ToString('u') -replace ' ', 'T'
$endUtcDateTimeString = $endUtcDateTimeString.ToString('u') -replace ' ', 'T'

$passwordCreds = @{
    passwordCredential = @{
        displayName = "ProdSecret"
        endDateTime = $endUtcDateTimeString
        startDateTime = $startUtcDateTimeString
    }
}

$passwordCredsJson = ($passwordCreds | ConvertTo-Json -Compress -Depth 10)

try {
    $addPasswordResult = PostAADRequest -url ("https://graph.microsoft.com/v1.0/applications/$applicationObjectId/addPassword") -body $passwordCredsJson
    $addPasswordObject = ($addPasswordResult | ConvertFrom-Json)
    $secret = $addPasswordObject.secretText
    
    if ($secret) {
        Write-Host "✅ Client secret created (expires in 180 days)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Failed to create secret - please add it manually in Azure Portal" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Failed to create secret - please add it manually: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "✅ Production Entra App Created Successfully!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

Write-Host "📋 Application Details:" -ForegroundColor Cyan
PrintInfo -key "Application Name" -value $ApplicationName
PrintInfo -key "Application ID" -value $applicationId
PrintInfo -key "Object ID" -value $applicationObjectId
PrintInfo -key "Audience URI" -value $applicationIdUri
if ($secret) {
    PrintInfo -key "Client Secret" -value $secret
    Write-Host "   ⚠️  Save this secret now - you won't be able to see it again!" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Update Workload/.env.prod with the Application ID:" -ForegroundColor White
Write-Host "      FRONTEND_APPID=$applicationId" -ForegroundColor Gray
Write-Host ""
Write-Host "   2. Update production URL in .env.prod:" -ForegroundColor White
Write-Host "      FRONTEND_URL=$ProductionUrl" -ForegroundColor Gray
Write-Host ""
Write-Host "   3. Admin consent (Tenant Admin only) - wait 1-2 minutes then visit:" -ForegroundColor White
Write-Host "      https://login.microsoftonline.com/$TenantId/adminconsent?client_id=$applicationId" -ForegroundColor Gray
Write-Host ""
Write-Host "   4. View application in Azure Portal:" -ForegroundColor White
Write-Host "      https://ms.portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Overview/appId/$applicationId/isMSAApp~/false" -ForegroundColor Gray
Write-Host ""
Write-Host "   5. Build and deploy:" -ForegroundColor White
Write-Host "      .\scripts\Build\BuildRelease.ps1 -WorkloadName '$WorkloadName' -FrontendAppId '$applicationId' -WorkloadVersion '1.0.0' -Environment 'prod'" -ForegroundColor Gray
Write-Host ""

# Create a summary file
$summaryFile = ".\EntraApp-Production-Summary.txt"
$summary = @"
================================================
Production Entra App Configuration
================================================
Created: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

Application Name: $ApplicationName
Workload Name: $WorkloadName
Target Tenant: $TenantId
Production URL: $ProductionUrl

Application ID: $applicationId
Object ID: $applicationObjectId
Audience URI: $applicationIdUri
$(if ($secret) { "Client Secret: $secret" })

================================================
Update Workload/.env.prod:
================================================
FRONTEND_APPID=$applicationId
FRONTEND_URL=$ProductionUrl

================================================
Admin Consent URL (Tenant Admin):
================================================
https://login.microsoftonline.com/$TenantId/adminconsent?client_id=$applicationId

================================================
Azure Portal:
================================================
https://ms.portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Overview/appId/$applicationId/isMSAApp~/false

================================================
Build Command:
================================================
.\scripts\Build\BuildRelease.ps1 -WorkloadName '$WorkloadName' -FrontendAppId '$applicationId' -WorkloadVersion '1.0.0' -Environment 'prod'
"@

$summary | Out-File -FilePath $summaryFile -Encoding UTF8
Write-Host "💾 Configuration saved to: $summaryFile" -ForegroundColor Green
Write-Host ""

return @{
    ApplicationId = $applicationId
    ObjectId = $applicationObjectId
    AudienceUri = $applicationIdUri
    Secret = $secret
}
