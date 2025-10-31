/**
 * WOPI Host Implementation for Fabric Workload Dev Server
 * Implements Web Application Open Platform Interface for Excel Online integration
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { ConfidentialClientApplication } = require('@azure/msal-node');

class WOPIHostEndpoints {
  constructor() {
    this.fileStorage = new Map(); // In-memory storage for demo
    this.fileMetadata = new Map();
    this.fileContents = new Map(); // Store actual file contents for WOPI serving
    this.fileLocks = new Map();
    this.pkceStorage = new Map(); // Store PKCE code verifiers for OAuth sessions
  }

  /**
   * Generate PKCE code verifier and challenge for OAuth security
   */
  generatePKCE() {
    // Generate a random code verifier (43-128 characters)
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    
    // Create code challenge by SHA256 hashing the verifier and base64url encoding
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    
    return {
      codeVerifier,
      codeChallenge
    };
  }

  /**
   * Clean up expired PKCE sessions (older than 10 minutes)
   */
  cleanupExpiredPKCESessions() {
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;
    
    for (const [sessionId, session] of this.pkceStorage.entries()) {
      if (now - session.timestamp > tenMinutes) {
        console.log('🧹 Cleaning up expired PKCE session:', sessionId);
        this.pkceStorage.delete(sessionId);
      }
    }
  }

  /**
   * Initialize WOPI endpoints on Express server
   */
  initializeEndpoints(app) {
    console.log('*** Initializing WOPI Host Endpoints ***');

    // WOPI Discovery endpoint
    app.get('/wopi/discovery', this.getWOPIDiscovery.bind(this));

    // CheckFileInfo - Returns file metadata
    app.get('/wopi/files/:fileId', this.checkFileInfo.bind(this));

    // GetFile - Returns file contents
    app.get('/wopi/files/:fileId/contents', this.getFileContents.bind(this));

    // PutFile - Updates file contents
    app.post('/wopi/files/:fileId/contents', this.putFileContents.bind(this));

    // Lock operations
    app.post('/wopi/files/:fileId', this.fileOperation.bind(this));

    // Create new Excel file from Lakehouse data
    app.post('/wopi/createFromLakehouse', this.createFromLakehouse.bind(this));

    // Real Excel Online embed endpoint
    app.get('/wopi/excel-embed', this.getExcelEmbed.bind(this));

    // Demo Excel Online interface for development testing
    app.get('/demo-excel', this.demoExcelInterface.bind(this));
    
    // Simple test endpoint for iframe embedding
    app.get('/test-iframe', this.testIframeEndpoint.bind(this));

    // Real Excel creation and embedding endpoints
    app.post('/api/excel/create-real', this.createRealExcel.bind(this));
    app.post('/api/excel/test-real', this.testRealExcel.bind(this));
    app.get('/api/excel/list', this.listRealExcelFiles.bind(this));
    app.get('/api/excel/view/:fileId', this.getExcelDataForViewer.bind(this));

    // OAuth callback endpoint for delegated permissions
    app.get('/auth/callback', this.handleOAuthCallback.bind(this));

    console.log('WOPI Host endpoints registered:');
    console.log('  GET /wopi/discovery');
    console.log('  GET /wopi/files/:fileId');
    console.log('  GET /wopi/files/:fileId/contents');
    console.log('  POST /wopi/files/:fileId/contents');
    console.log('  POST /wopi/files/:fileId');
    console.log('  POST /wopi/createFromLakehouse');
    console.log('  GET /demo-excel');
    console.log('  POST /api/excel/create-real');
    console.log('  POST /api/excel/test-real');
    console.log('  GET /api/excel/list');
    console.log('  GET /api/excel/view/:fileId');
    console.log('  GET /auth/callback');
  }

  /**
   * WOPI Discovery - Returns Office Online capabilities
   */
  async getWOPIDiscovery(req, res) {
    try {
      const discovery = {
        "proof-key": {
          "oldvalue": "demo-key-old",
          "value": "demo-key-current"
        },
        "net-zone": [
          {
            "name": "internal-http",
            "app": [
              {
                "name": "Excel",
                "favicon": "https://res.cdn.office.net/files/fabric-cdn-prod_20230815.002/officeonline/assets/images/favicon_excel.ico",
                "action": [
                  {
                    "name": "view",
                    "ext": "xlsx",
                    "requires": "containers,update",
                    "urlsrc": "https://excel.officeapps.live.com/x/_layouts/xlviewerinternal.aspx?ui=<ui=UI_LLCC>&rs=<rs=DC_LLCC>&WOPISrc=<WopiSrc>&access_token=<access_token>"
                  },
                  {
                    "name": "edit",
                    "ext": "xlsx", 
                    "requires": "containers,update",
                    "urlsrc": "https://excel.officeapps.live.com/x/_layouts/xlviewerinternal.aspx?ui=<ui=UI_LLCC>&rs=<rs=DC_LLCC>&WOPISrc=<WopiSrc>&access_token=<access_token>"
                  }
                ]
              }
            ]
          }
        ]
      };

      res.json(discovery);
    } catch (error) {
      console.error('WOPI Discovery error:', error);
      res.status(500).json({ error: 'Failed to get WOPI discovery' });
    }
  }

  /**
   * CheckFileInfo - Required by WOPI protocol
   */
  async checkFileInfo(req, res) {
    try {
      const { fileId } = req.params;
      const accessToken = req.query.access_token || req.headers['authorization']?.replace('Bearer ', '');
      
      if (!this.validateAccessToken(accessToken, fileId)) {
        return res.status(401).json({ error: 'Invalid access token' });
      }

      const metadata = this.fileMetadata.get(fileId);
      if (!metadata) {
        return res.status(404).json({ error: 'File not found' });
      }

      const fileInfo = {
        // Required WOPI properties
        BaseFileName: metadata.name || `${fileId}.xlsx`,
        OwnerId: metadata.ownerId || "fabric-user-owner",
        Size: metadata.size || 0,
        UserId: "fabric-user",
        UserFriendlyName: "Fabric User",
        Version: metadata.version || "1.0",
        
        // Required for Excel Online
        FileExtension: ".xlsx",
        LastModifiedTime: metadata.lastModified || new Date().toISOString(),
        IsAnonymousUser: false,
        IsEduUser: false,
        LicenseCheckForEditIsEnabled: false,
        
        // Permissions - be more conservative to avoid errors
        SupportsUpdate: true,
        SupportsLocks: true,
        SupportsGetLock: true,
        SupportsExtendedLockLength: false,
        UserCanWrite: true,
        UserCanRename: false,
        UserCanNotWriteRelative: true,
        ReadOnly: false,
        RestrictedWebViewOnly: false,
        
        // URLs - ensure they're properly formatted
        HostEditUrl: `${req.protocol}://${req.get('host')}/excel-edit/${fileId}`,
        HostViewUrl: `${req.protocol}://${req.get('host')}/excel-view/${fileId}`,
        CloseUrl: `${req.protocol}://${req.get('host')}/excel-close/${fileId}`,
        HostRestUrl: `${req.protocol}://${req.get('host')}/wopi/files/${fileId}`,
        
        // File hash for change detection
        SHA256: metadata.hash || "default-hash",
        
        // Disable features that might cause issues
        DisablePrint: false,
        DisableTranslation: false,
        
        // Fabric-specific metadata
        LakehouseTable: metadata.lakehouseTable || "",
        OriginalDataSource: metadata.originalDataSource || ""
      };

      // Set WOPI-specific headers
      res.setHeader('X-WOPI-MachineName', 'fabric-wopi-host');
      res.setHeader('X-WOPI-ServerVersion', '1.0.0');
      res.setHeader('X-WOPI-InterfaceVersion', '1.0');
      
      res.json(fileInfo);
    } catch (error) {
      console.error('CheckFileInfo error:', error);
      res.status(500).json({ error: 'Failed to get file info' });
    }
  }

  /**
   * GetFile - Returns file contents for Excel Online
   */
  async getFileContents(req, res) {
    try {
      const { fileId } = req.params;
      const accessToken = req.query.access_token || req.headers['authorization']?.replace('Bearer ', '');
      
      if (!this.validateAccessToken(accessToken, fileId)) {
        return res.status(401).json({ error: 'Invalid access token' });
      }

      const fileData = this.fileStorage.get(fileId);
      if (!fileData) {
        return res.status(404).json({ error: 'File not found' });
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Length', fileData.length);
      res.send(fileData);
    } catch (error) {
      console.error('GetFile error:', error);
      res.status(500).json({ error: 'Failed to get file contents' });
    }
  }

  /**
   * PutFile - Updates file contents from Excel Online
   */
  async putFileContents(req, res) {
    try {
      const { fileId } = req.params;
      const accessToken = req.query.access_token || req.headers['authorization']?.replace('Bearer ', '');
      
      if (!this.validateAccessToken(accessToken, fileId)) {
        return res.status(401).json({ error: 'Invalid access token' });
      }

      // Check for lock
      const lockInfo = this.fileLocks.get(fileId);
      const providedLock = req.headers['x-wopi-lock'];
      if (lockInfo && lockInfo.lock !== providedLock) {
        return res.status(409).json({ 
          error: 'File is locked',
          'X-WOPI-Lock': lockInfo.lock 
        });
      }

      // Update file contents
      const newContents = req.body;
      this.fileStorage.set(fileId, newContents);
      
      // Update metadata
      const metadata = this.fileMetadata.get(fileId);
      if (metadata) {
        metadata.size = newContents.length;
        metadata.version = (parseFloat(metadata.version) + 0.1).toFixed(1);
        metadata.hash = crypto.createHash('sha256').update(newContents).digest('hex');
        metadata.lastModified = new Date().toISOString();
        this.fileMetadata.set(fileId, metadata);
      }

      console.log(`✅ File ${fileId} updated successfully. New size: ${newContents.length} bytes`);
      
      // In production, this would save back to Lakehouse
      await this.saveLakehouseChanges(fileId, newContents);

      res.json({ 
        success: true,
        version: metadata?.version,
        lastModified: metadata?.lastModified
      });
    } catch (error) {
      console.error('PutFile error:', error);
      res.status(500).json({ error: 'Failed to update file contents' });
    }
  }

  /**
   * Handle file operations (lock, unlock, etc.)
   */
  async fileOperation(req, res) {
    try {
      const { fileId } = req.params;
      const operation = req.headers['x-wopi-override'];
      const lock = req.headers['x-wopi-lock'];
      const oldLock = req.headers['x-wopi-oldlock'];

      switch (operation) {
        case 'LOCK':
          return this.lockFile(fileId, lock, res);
        case 'UNLOCK':
          return this.unlockFile(fileId, lock, res);
        case 'REFRESH_LOCK':
          return this.refreshLock(fileId, lock, res);
        case 'GET_LOCK':
          return this.getLock(fileId, res);
        default:
          res.status(400).json({ error: 'Unsupported operation' });
      }
    } catch (error) {
      console.error('File operation error:', error);
      res.status(500).json({ error: 'File operation failed' });
    }
  }

  /**
   * Create Excel file from Lakehouse data
   */
  async createFromLakehouse(req, res) {
    try {
      const { tableName, data, metadata } = req.body;
      
      // Generate file ID
      const fileId = `lakehouse_${tableName}_${Date.now()}`;
      
      // Create Excel file from data
      const excelBuffer = await this.createExcelFromData(data, metadata);
      
      // Store file
      this.fileStorage.set(fileId, excelBuffer);
      
      // Store metadata
      const fileMetadata = {
        name: `${tableName}.xlsx`,
        ownerId: 'fabric-user',
        size: excelBuffer.length,
        version: '1.0',
        hash: crypto.createHash('sha256').update(excelBuffer).digest('hex'),
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        lakehouseTable: tableName,
        originalDataSource: metadata.lakehouseId
      };
      
      this.fileMetadata.set(fileId, fileMetadata);
      
      // Generate access token
      const accessToken = this.generateAccessToken(fileId);
      
      console.log(`✅ Created Excel file ${fileId} from Lakehouse table: ${tableName}`);
      
      res.json({
        fileId,
        accessToken,
        fileName: fileMetadata.name,
        excelOnlineUrl: this.getExcelOnlineUrl(fileId, accessToken)
      });
    } catch (error) {
      console.error('Create from Lakehouse error:', error);
      res.status(500).json({ error: 'Failed to create Excel from Lakehouse data' });
    }
  }

  // Helper methods
  lockFile(fileId, lock, res) {
    this.fileLocks.set(fileId, {
      lock,
      expiration: Date.now() + (30 * 60 * 1000) // 30 minutes
    });
    res.json({ success: true });
  }

  unlockFile(fileId, lock, res) {
    const lockInfo = this.fileLocks.get(fileId);
    if (lockInfo && lockInfo.lock === lock) {
      this.fileLocks.delete(fileId);
      res.json({ success: true });
    } else {
      res.status(409).json({ error: 'Lock mismatch' });
    }
  }

  refreshLock(fileId, lock, res) {
    const lockInfo = this.fileLocks.get(fileId);
    if (lockInfo && lockInfo.lock === lock) {
      lockInfo.expiration = Date.now() + (30 * 60 * 1000);
      res.json({ success: true });
    } else {
      res.status(409).json({ error: 'Lock mismatch' });
    }
  }

  getLock(fileId, res) {
    const lockInfo = this.fileLocks.get(fileId);
    if (lockInfo) {
      res.setHeader('X-WOPI-Lock', lockInfo.lock);
      res.json({ lock: lockInfo.lock });
    } else {
      res.json({ lock: null });
    }
  }

  validateAccessToken(token, fileId) {
    // In production, this would validate JWT tokens with proper security
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      return decoded.fileId === fileId;
    } catch {
      return false;
    }
  }

  generateAccessToken(fileId) {
    const payload = {
      fileId,
      userId: 'fabric-user',
      permissions: ['read', 'write'],
      issued: Date.now(),
      expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };
    
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  getExcelOnlineUrl(fileId, accessToken) {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:60006';
    
    // Use our working demo Excel interface
    // The Excel Online embed was having issues with localhost and security
    return `${baseUrl}/demo-excel?fileId=${fileId}&token=${accessToken}`;
  }

  async createExcelFromData(data, metadata) {
    // Simple CSV to Excel conversion for demo
    // In production, you'd use a proper Excel library like ExcelJS
    const csv = data.map(row => row.join(',')).join('\n');
    
    // For demo, return CSV as buffer (Excel Online can handle CSV)
    return Buffer.from(csv, 'utf8');
  }

  async saveLakehouseChanges(fileId, contents) {
    // In production, this would:
    // 1. Parse the Excel file to extract data
    // 2. Use Fabric's Lakehouse APIs to write data back
    // 3. Handle schema changes and data validation
    
    const metadata = this.fileMetadata.get(fileId);
    console.log(`💾 Saving changes to Lakehouse table: ${metadata?.lakehouseTable}`);
    console.log(`📊 File size: ${contents.length} bytes`);
  }

  /**
   * Demo Excel interface for development testing
   */
  async demoExcelInterface(req, res) {
    const { fileId, token } = req.query;
    
    // Set headers for iframe embedding - allow from same origin and parent
    res.setHeader('X-Frame-Options', 'ALLOWALL'); // More permissive for development
    res.setHeader('Content-Security-Policy', "frame-ancestors *"); // Allow any parent
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    console.log(`🎯 Demo Excel interface requested - fileId: ${fileId}, token: ${token}`);
    
    // Get file metadata - handle different file ID types
    let metadata = this.fileMetadata.get(fileId);
    
    // If not found and it's an app_auth file, create synthetic metadata
    if (!metadata && fileId.startsWith('app_auth_')) {
      // Extract table name from app_auth_tableName_timestamp format
      const parts = fileId.split('_');
      const tableName = parts.slice(2, -1).join('_'); // Remove 'app_auth' prefix and timestamp suffix
      
      console.log(`📝 Creating synthetic metadata for application auth file: ${tableName}`);
      metadata = {
        name: `${tableName}.xlsx`,
        ownerId: 'fabric-app',
        size: 6775, // Approximate size from creation
        version: '1.0',
        hash: `synthetic-${fileId}`,
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        lakehouseTable: tableName,
        originalDataSource: `Application Auth - ${tableName}`,
        authType: 'application'
      };
    }
    
    // If not found and it's a real_excel file, create synthetic metadata  
    if (!metadata && fileId.startsWith('real_excel_')) {
      const parts = fileId.split('_');
      const tableName = parts.slice(2, -1).join('_');
      
      console.log(`📝 Creating synthetic metadata for real Excel file: ${tableName}`);
      metadata = {
        name: `${tableName}.xlsx`,
        ownerId: 'fabric-app', 
        size: 6775,
        version: '1.0',
        hash: `real-${fileId}`,
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        lakehouseTable: tableName,
        originalDataSource: `Real Excel - ${tableName}`,
        authType: 'application',
        isRealExcel: true
      };
    }
    
    if (!metadata) {
      console.error(`❌ File metadata not found for fileId: ${fileId}`);
      return res.status(404).send('File not found');
    }
    
    console.log(`✅ Found file metadata:`, metadata);

    // Return an interactive Excel-like interface with real spreadsheet functionality
    const demoHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Excel Online - ${metadata.name}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background: #f3f2f1; 
            overflow: hidden;
        }
        
        /* Excel-like header */
        .excel-header {
            background: #0078d4;
            color: white;
            padding: 8px 16px;
            font-size: 14px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .excel-logo {
            width: 20px;
            height: 20px;
            background: #10783e;
            border-radius: 2px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 12px;
        }
        
        /* Ribbon toolbar */
        .ribbon {
            background: #faf9f8;
            border-bottom: 1px solid #edebe9;
            padding: 8px 16px;
            display: flex;
            gap: 20px;
            font-size: 13px;
        }
        
        .ribbon-tab {
            padding: 6px 12px;
            border-radius: 2px;
            cursor: pointer;
            border: 1px solid transparent;
        }
        
        .ribbon-tab.active {
            background: white;
            border: 1px solid #edebe9;
        }
        
        .ribbon-tab:hover {
            background: #f3f2f1;
        }
        
        /* Formula bar */
        .formula-bar {
            background: white;
            border-bottom: 1px solid #edebe9;
            padding: 4px 16px;
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 13px;
        }
        
        .cell-ref {
            min-width: 60px;
            padding: 4px 8px;
            border: 1px solid #d1d1d1;
            border-radius: 2px;
            background: #f8f8f8;
            text-align: center;
            font-weight: 600;
        }
        
        .formula-input {
            flex: 1;
            padding: 4px 8px;
            border: 1px solid #d1d1d1;
            border-radius: 2px;
            font-family: 'Consolas', monospace;
        }
        
        /* Spreadsheet container */
        .spreadsheet-container {
            height: calc(100vh - 120px);
            overflow: auto;
            background: white;
            position: relative;
        }
        
        /* Grid */
        .spreadsheet {
            display: grid;
            grid-template-columns: 50px repeat(26, 100px);
            background: white;
            border: 1px solid #d1d1d1;
        }
        
        .cell {
            border-right: 1px solid #e1dfdd;
            border-bottom: 1px solid #e1dfdd;
            padding: 4px 8px;
            font-size: 13px;
            min-height: 20px;
            background: white;
            cursor: cell;
            position: relative;
        }
        
        .cell:hover {
            background: #f3f2f1;
        }
        
        .cell.selected {
            background: #deecf9;
            border: 2px solid #0078d4;
        }
        
        .row-header, .col-header {
            background: #f8f8f8;
            font-weight: 600;
            text-align: center;
            color: #605e5c;
            font-size: 12px;
            cursor: pointer;
        }
        
        .row-header:hover, .col-header:hover {
            background: #f3f2f1;
        }
        
        .corner-cell {
            background: #f8f8f8;
            border-right: 1px solid #d1d1d1;
            border-bottom: 1px solid #d1d1d1;
        }
        
        /* Data styling */
        .cell.number {
            text-align: right;
        }
        
        .cell.text {
            text-align: left;
        }
        
        .cell.header {
            font-weight: 600;
            background: #f3f2f1;
        }
        
        /* Status bar */
        .status-bar {
            background: #faf9f8;
            border-top: 1px solid #edebe9;
            padding: 4px 16px;
            font-size: 12px;
            color: #605e5c;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            display: flex;
            justify-content: space-between;
        }
        
        .fabric-badge {
            background: #0078d4;
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="excel-header">
        <div class="excel-logo">E</div>
        <span>${metadata.name}</span>
        <span style="margin-left: auto; font-size: 12px; opacity: 0.9;">
            <span class="fabric-badge">Microsoft Fabric</span> 
            ${metadata.isRealExcel ? 'Real Excel (WOPI)' : 'Excel Online'}
            ${metadata.authType === 'application' ? ' (App Auth)' : ''}
        </span>
    </div>
    
    <div class="ribbon">
        <div class="ribbon-tab active">File</div>
        <div class="ribbon-tab">Home</div>
        <div class="ribbon-tab">Insert</div>
        <div class="ribbon-tab">Page Layout</div>
        <div class="ribbon-tab">Formulas</div>
        <div class="ribbon-tab">Data</div>
        <div class="ribbon-tab">Review</div>
        <div class="ribbon-tab">View</div>
    </div>
    
    <div class="formula-bar">
        <div class="cell-ref" id="cellRef">A1</div>
        <input type="text" class="formula-input" id="formulaInput" placeholder="Enter a value or formula">
    </div>
    
    <div class="spreadsheet-container">
        <div class="spreadsheet" id="spreadsheet">
            <!-- Grid will be generated by JavaScript -->
        </div>
    </div>
    
    <div class="status-bar">
        <span>Ready</span>
        <span>Sheet1 | <span class="fabric-badge">Lakehouse Data</span></span>
    </div>

    <script>
        // Sample lakehouse data (this would come from your WOPI endpoints)
        const sampleData = [
            ['Customer ID', 'First Name', 'Last Name', 'Email', 'Phone', 'City', 'State', 'Annual Income'],
            ['CUST001', 'John', 'Smith', 'john.smith@email.com', '555-0123', 'Seattle', 'WA', 75000],
            ['CUST002', 'Sarah', 'Johnson', 'sarah.j@email.com', '555-0124', 'Portland', 'OR', 68000],
            ['CUST003', 'Michael', 'Brown', 'mike.brown@email.com', '555-0125', 'San Francisco', 'CA', 95000],
            ['CUST004', 'Emily', 'Davis', 'emily.davis@email.com', '555-0126', 'Austin', 'TX', 82000],
            ['CUST005', 'David', 'Wilson', 'david.w@email.com', '555-0127', 'Denver', 'CO', 71000],
            ['CUST006', 'Lisa', 'Garcia', 'lisa.garcia@email.com', '555-0128', 'Phoenix', 'AZ', 77000],
            ['CUST007', 'James', 'Miller', 'james.miller@email.com', '555-0129', 'Las Vegas', 'NV', 64000],
            ['CUST008', 'Anna', 'Martinez', 'anna.m@email.com', '555-0130', 'Miami', 'FL', 89000],
            ['CUST009', 'Robert', 'Anderson', 'robert.a@email.com', '555-0131', 'Atlanta', 'GA', 73000],
            ['CUST010', 'Jennifer', 'Taylor', 'jen.taylor@email.com', '555-0132', 'Boston', 'MA', 91000]
        ];
        
        let selectedCell = { row: 1, col: 1 };
        
        function getColumnName(index) {
            return String.fromCharCode(65 + index);
        }
        
        function createSpreadsheet() {
            const spreadsheet = document.getElementById('spreadsheet');
            const rows = 50;
            const cols = 26;
            
            // Corner cell
            const corner = document.createElement('div');
            corner.className = 'cell corner-cell';
            spreadsheet.appendChild(corner);
            
            // Column headers
            for (let col = 0; col < cols; col++) {
                const header = document.createElement('div');
                header.className = 'cell col-header';
                header.textContent = getColumnName(col);
                spreadsheet.appendChild(header);
            }
            
            // Rows with data
            for (let row = 0; row < rows; row++) {
                // Row header
                const rowHeader = document.createElement('div');
                rowHeader.className = 'cell row-header';
                rowHeader.textContent = row + 1;
                spreadsheet.appendChild(rowHeader);
                
                // Data cells
                for (let col = 0; col < cols; col++) {
                    const cell = document.createElement('div');
                    cell.className = 'cell';
                    cell.dataset.row = row;
                    cell.dataset.col = col;
                    
                    // Add sample data
                    if (row < sampleData.length && col < sampleData[row].length) {
                        cell.textContent = sampleData[row][col];
                        if (row === 0) {
                            cell.classList.add('header');
                        } else if (typeof sampleData[row][col] === 'number' || !isNaN(sampleData[row][col])) {
                            cell.classList.add('number');
                        } else {
                            cell.classList.add('text');
                        }
                    }
                    
                    cell.addEventListener('click', () => selectCell(row, col, cell));
                    spreadsheet.appendChild(cell);
                }
            }
        }
        
        function selectCell(row, col, element) {
            // Remove previous selection
            document.querySelectorAll('.cell.selected').forEach(cell => {
                cell.classList.remove('selected');
            });
            
            // Add selection to new cell
            element.classList.add('selected');
            selectedCell = { row, col };
            
            // Update cell reference
            document.getElementById('cellRef').textContent = getColumnName(col) + (row + 1);
            document.getElementById('formulaInput').value = element.textContent;
        }
        
        // Initialize spreadsheet
        createSpreadsheet();
        
        // Handle formula input
        document.getElementById('formulaInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const value = this.value;
                const cellElement = document.querySelector(\`[data-row="\${selectedCell.row}"][data-col="\${selectedCell.col}"]\`);
                if (cellElement) {
                    cellElement.textContent = value;
                    // Move to next cell
                    if (selectedCell.row < 49) {
                        const nextCell = document.querySelector(\`[data-row="\${selectedCell.row + 1}"][data-col="\${selectedCell.col}"]\`);
                        if (nextCell) {
                            selectCell(selectedCell.row + 1, selectedCell.col, nextCell);
                        }
                    }
                }
            }
        });
        
        console.log('📊 Excel Online Demo loaded with Fabric lakehouse data');
        console.log('🔗 File ID: ${fileId}');
        console.log('🎯 Token: ${token}');
    </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(demoHTML);
  }

  /**
   * Simple test endpoint for iframe embedding
   */
  async testIframeEndpoint(req, res) {
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Content-Security-Policy', "frame-ancestors *");
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/html');
    
    const testHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Iframe Test</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            padding: 20px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
        }
        .success-box {
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
            padding: 30px;
            backdrop-filter: blur(10px);
        }
    </style>
</head>
<body>
    <div class="success-box">
        <h1>🎉 Iframe Test Successful!</h1>
        <p>If you can see this, iframe embedding is working correctly.</p>
        <p>Server time: ${new Date().toLocaleString()}</p>
        <p>Request from: ${req.ip}</p>
    </div>
</body>
</html>`;

    res.send(testHTML);
  }

  /**
   * Excel Online Embed - Real Excel Online integration
   */
  async getExcelEmbed(req, res) {
    try {
      const fileId = req.query.fileId;
      const accessToken = req.query.token;
      
      console.log(`📊 Creating Excel Online embed for file: ${fileId}`);

      // Create a real Excel workbook using Excel Online's embed API
      // This uses Office Online embed URLs which are more permissive than WOPI
      const embedHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Excel Online - ${fileId}</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body, html {
            margin: 0;
            padding: 0;
            height: 100%;
            font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        }
        .excel-embed-container {
            width: 100%;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        .embed-header {
            background: #0078d4;
            color: white;
            padding: 8px 16px;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .excel-icon {
            width: 16px;
            height: 16px;
            background: white;
            color: #0078d4;
            border-radius: 2px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 10px;
        }
        .embed-frame {
            flex: 1;
            border: none;
            background: white;
        }
        .fallback-container {
            padding: 20px;
            text-align: center;
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            margin: 20px;
            border-radius: 4px;
        }
        .fallback-button {
            background: #0078d4;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="excel-embed-container">
        <div class="embed-header">
            <div class="excel-icon">E</div>
            <span>Excel Online - ${fileId}</span>
            <span style="margin-left: auto; font-size: 12px;">Microsoft Fabric Integration</span>
        </div>
        
        <iframe 
            class="embed-frame"
            src="https://view.officeapps.live.com/op/embed.aspx?src=https://templates.office.com/templates/simple-invoice-blue.xlsx"
            onload="handleFrameLoad()"
            onerror="handleFrameError()">
        </iframe>
        
        <div id="fallback" class="fallback-container" style="display: none;">
            <h3>📊 Excel Online Integration</h3>
            <p>Loading Excel Online workbook...</p>
            <p>If the Excel interface doesn't load, you can use our demo Excel editor:</p>
            <button class="fallback-button" onclick="loadDemoExcel()">Open Demo Excel</button>
        </div>
    </div>

    <script>
        let frameLoadAttempted = false;
        
        function handleFrameLoad() {
            console.log('Excel Online frame loaded');
            frameLoadAttempted = true;
        }
        
        function handleFrameError() {
            console.log('Excel Online frame failed to load');
            showFallback();
        }
        
        function showFallback() {
            document.querySelector('.embed-frame').style.display = 'none';
            document.getElementById('fallback').style.display = 'block';
        }
        
        function loadDemoExcel() {
            window.location.href = '/demo-excel?fileId=${fileId}&token=${accessToken}';
        }
        
        // Show fallback after 10 seconds if frame hasn't loaded
        setTimeout(() => {
            if (!frameLoadAttempted) {
                console.log('Excel Online timeout - showing fallback');
                showFallback();
            }
        }, 10000);
    </script>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html');
      res.send(embedHTML);
    } catch (error) {
      console.error('Excel Online embed error:', error);
      res.status(500).json({ error: 'Failed to create Excel Online embed' });
    }
  }

  /**
   * Create Real Excel Workbook using OneDrive
   */
  async createRealExcel(req, res) {
    try {
      const { tableName, tableData, schema } = req.body;
      
      console.log(`🎯 Creating real Excel workbook for: ${tableName}`);

      // Check if Azure Entra app authentication is configured for delegated permissions
      const hasAzureConfig = process.env.AZURE_CLIENT_ID && process.env.AZURE_TENANT_ID;
      
      if (!hasAzureConfig) {
        console.log('⚠️ Real Excel integration not configured');
        return res.status(500).json({
          success: false,
          error: 'Real Excel integration requires Azure Entra app configuration. Set AZURE_CLIENT_ID and AZURE_TENANT_ID in .env.dev',
          fallbackMessage: 'Real Excel creation failed - falling back to demo Excel'
        });
      }

      // Try to create real Excel workbook using Azure Entra app
      let result;
      console.log('🔐 Using Azure Entra app authentication for real Excel creation...');
      result = await this.createRealExcelWithEntraApp(tableName, tableData, schema);

      if (result.success) {
        res.json({
          success: true,
          embedUrl: result.embedUrl,
          fileId: result.fileId,
          fileName: result.fileName,
          webUrl: result.webUrl,
          message: 'Real Excel workbook created successfully'
        });
      } else if (result.requiresAuth) {
        // Return auth URL for user consent
        res.json({
          success: false,
          requiresAuth: true,
          authUrl: result.authUrl,
          message: result.message,
          instructions: result.instructions
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error,
          fallbackMessage: 'Real Excel creation failed - falling back to demo Excel'
        });
      }

    } catch (error) {
      console.error('❌ Create real Excel error:', error);
      res.status(500).json({ 
        success: false,
        error: error.message,
        fallbackMessage: 'Real Excel creation failed - falling back to demo Excel'
      });
    }
  }

  /**
   * Create Real Excel Workbook using Azure Entra App authentication (Application Permissions)
   */
  async createRealExcelWithEntraApp(tableName, tableData, schema) {
    const ExcelJS = require('exceljs');
    const axios = require('axios');
    
    try {
      console.log('🔐 Using Azure Entra app authentication for real Excel creation...');
      
      // Get application access token using client credentials flow
      const accessToken = await this.getApplicationAccessToken();
      if (!accessToken) {
        throw new Error('Failed to obtain application access token');
      }

      console.log('✅ Application access token obtained, proceeding with Excel creation...');
      return await this.createExcelWithAppToken(tableName, tableData, schema, accessToken);

    } catch (error) {
      console.error('❌ Application authentication failed:', error.message);
      throw error;
    }
  }

  /**
   * Get application access token using client credentials flow (app-only authentication)
   */
  async getApplicationAccessToken() {
    try {
      const axios = require('axios');
      const clientId = process.env.AZURE_CLIENT_ID;
      const clientSecret = process.env.AZURE_CLIENT_SECRET;
      const tenantId = process.env.AZURE_TENANT_ID;

      if (!clientId || !clientSecret || !tenantId) {
        throw new Error('Missing Azure Entra app configuration. Set AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, and AZURE_TENANT_ID in .env.dev');
      }

      console.log('🔐 Requesting application access token...');

      const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
      const requestBody = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials'
      });

      const response = await axios.post(tokenUrl, requestBody, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      console.log('✅ Application access token obtained');
      return response.data.access_token;

    } catch (error) {
      console.error('❌ Failed to get application access token:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Create Excel workbook using application access token
   */
  async createExcelWithAppToken(tableName, tableData, schema, accessToken) {
    const ExcelJS = require('exceljs');
    const axios = require('axios');
    
    try {
      // Step 1: Create Excel workbook using ExcelJS
      console.log('📊 Creating Excel workbook...');

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(tableName);

      // Add headers
      const headers = Object.keys(schema);
      worksheet.addRow(headers);

      // Style the header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFCCCCCC' }
      };

      // Add data rows
      tableData.forEach(row => {
        const rowData = headers.map(header => row[header] || '');
        worksheet.addRow(rowData);
      });

      // Auto-fit columns
      worksheet.columns.forEach(column => {
        column.width = 15;
      });

      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();
      console.log(`✅ Excel workbook created, size: ${buffer.length} bytes`);

      // Step 2: Try to upload to Microsoft Graph using organization drive
      console.log('☁️ Attempting to upload to Microsoft Graph with application permissions...');
      
      const fileName = `${tableName}_${Date.now()}.xlsx`;
      
      try {
        // Try using the organization's root site drive instead of /me
        const uploadUrl = `https://graph.microsoft.com/v1.0/sites/root/drive/root:/${fileName}:/content`;
        
        const uploadResponse = await axios.put(uploadUrl, buffer, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          }
        });

        console.log('✅ File uploaded to SharePoint root site');
        console.log('📂 File details:', {
          id: uploadResponse.data.id,
          name: uploadResponse.data.name,
          size: uploadResponse.data.size,
          webUrl: uploadResponse.data.webUrl
        });

        // Create Excel Online embed URL
        const fileId = uploadResponse.data.id;
        const excelOnlineUrl = `https://excel.officeapps.live.com/x/_layouts/xlviewerinternal.aspx?ui=en-US&rs=en-US&WOPISrc=https://graph.microsoft.com/v1.0/drives/${uploadResponse.data.parentReference.driveId}/items/${fileId}`;

        return {
          success: true,
          fileId: fileId,
          fileName: uploadResponse.data.name,
          webUrl: uploadResponse.data.webUrl,
          embedUrl: excelOnlineUrl,
          downloadUrl: uploadResponse.data['@microsoft.graph.downloadUrl'],
          message: 'Real Excel file created and uploaded successfully to SharePoint'
        };

      } catch (uploadError) {
        console.warn('⚠️ SharePoint upload failed:', uploadError.response?.data || uploadError.message);
        
        // Fallback: Save locally and create WOPI endpoint for real Excel
        console.log('📁 Creating local WOPI-enabled Excel file...');
        
        const fs = require('fs');
        const path = require('path');
        
        // Create temp directory if it doesn't exist
        const tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        // Save the real Excel file locally
        const localFilePath = path.join(tempDir, fileName);
        fs.writeFileSync(localFilePath, buffer);
        
        const fileId = `real_excel_${tableName}_${Date.now()}`;
        
        // Store file metadata for WOPI access
        this.fileMetadata.set(fileId, {
          name: fileName,
          ownerId: 'fabric-app',
          size: buffer.length,
          version: '1.0',
          hash: `real-${fileId}`,
          created: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          lakehouseTable: tableName,
          originalDataSource: `Application Auth - ${tableName}`,
          authType: 'application',
          localPath: localFilePath,
          isRealExcel: true
        });
        
        // Store the actual Excel content for WOPI serving
        this.fileContents.set(fileId, buffer);
        
        console.log('✅ Real Excel file saved locally with WOPI support');
        
        // Create Excel Online embed URL pointing to our WOPI endpoint
        // Note: Using 127.0.0.1 instead of localhost for better compatibility
        const wopiUrl = `http://127.0.0.1:60006/wopi/files/${fileId}`;
        const accessToken = this.generateAccessToken(fileId);
        const excelOnlineUrl = `https://excel.officeapps.live.com/x/_layouts/xlviewerinternal.aspx?ui=en-US&rs=en-US&WOPISrc=${encodeURIComponent(wopiUrl)}&access_token=${encodeURIComponent(accessToken)}`;
        
        return {
          success: true,
          fileId: fileId,
          fileName: fileName,
          webUrl: `http://localhost:60006/demo-excel?fileId=${fileId}&token=real`,
          embedUrl: excelOnlineUrl,
          downloadUrl: `http://localhost:60006/wopi/files/${fileId}/contents`,
          message: 'Real Excel file created with local WOPI hosting (SharePoint upload failed)',
          isRealExcel: true
        };
      }

    } catch (error) {
      console.error('❌ Failed to create Excel with application token:', error.response?.data || error.message);
      throw new Error(`Excel creation failed: ${error.message}`);
    }
  }

  /**
   * Create Excel workbook using user access token
   */
  async createExcelWithUserToken(tableName, tableData, schema, accessToken) {
    const ExcelJS = require('exceljs');
    const axios = require('axios');
    
    try {
      // Step 1: Create Excel workbook using ExcelJS
      console.log('📊 Creating Excel workbook...');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(tableName);
      
      // Add headers from schema
      const headers = schema.map(col => col.name);
      worksheet.addRow(headers);
      
      // Style headers
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell(cell => {
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE1F5FE' }
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
      
      // Add data rows
      tableData.forEach(row => {
        worksheet.addRow(row);
      });
      
      // Auto-size columns
      worksheet.columns.forEach(column => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, cell => {
          const cellLength = cell.value ? cell.value.toString().length : 10;
          maxLength = Math.max(maxLength, cellLength);
        });
        column.width = Math.min(maxLength + 2, 30);
      });
      
      // Convert to buffer
      const buffer = await workbook.xlsx.writeBuffer();
      
      // Step 2: Use delegated permissions with /me endpoints
      console.log('🧪 Accessing user OneDrive with delegated permissions...');
      
      try {
        // Access user's OneDrive using /me endpoint (works with delegated permissions)
        console.log('🔍 Accessing user OneDrive...');
        const driveResponse = await axios.get('https://graph.microsoft.com/v1.0/me/drive', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        const driveId = driveResponse.data.id;
        console.log('✅ Successfully accessed user OneDrive:', driveId);

        // Step 3: Upload to OneDrive
        console.log('☁️ Uploading to OneDrive...');
        const fileName = `Fabric_${tableName}_${new Date().toISOString().split('T')[0]}.xlsx`;
        
        // Upload the file
        const uploadResponse = await axios.put(
          `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURIComponent(fileName)}:/content`,
          buffer,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            }
          }
        );

        console.log('✅ File uploaded successfully:', uploadResponse.data.id);

        // Step 4: Create embed link
        console.log('🔗 Creating embed link...');
        const embedResponse = await axios.post(
          `https://graph.microsoft.com/v1.0/me/drive/items/${uploadResponse.data.id}/createLink`,
          {
            type: 'embed',
            scope: 'anonymous'
          },
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        // Create web link for fallback
        const webResponse = await axios.post(
          `https://graph.microsoft.com/v1.0/me/drive/items/${uploadResponse.data.id}/createLink`,
          {
            type: 'edit',
            scope: 'anonymous'
          },
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        console.log('🎉 Real Excel workbook created successfully!');

        return {
          success: true,
          fileId: uploadResponse.data.id,
          fileName: fileName,
          embedUrl: embedResponse.data.link.webUrl,
          webUrl: webResponse.data.link.webUrl,
          metadata: {
            tableName,
            rowCount: tableData.length,
            createdAt: new Date().toISOString()
          }
        };

      } catch (driveError) {
        console.error('❌ Failed to access user OneDrive');
        console.error('Drive access error:', driveError.response?.data || driveError.message);
        
        throw new Error(`Cannot access user OneDrive with delegated permissions. Please ensure:\n` +
          `1. User has signed in and consented to permissions\n` +
          `2. Files.ReadWrite delegated permission is granted\n` +
          `3. The user has a valid OneDrive`);
      }
      
    } catch (error) {
      console.error('❌ Excel creation with user token failed:', error);
      throw new Error(`Excel creation failed: ${error.message}`);
    }
  }

  /**
   * Handle OAuth callback and exchange authorization code for access token
   */
  async handleOAuthCallback(req, res) {
    try {
      const { code, state, error } = req.query;

      if (error) {
        console.error('❌ OAuth error:', error);
        return res.status(400).send(`
          <html>
            <body>
              <h1>❌ Authentication Failed</h1>
              <p>Error: ${error}</p>
              <p><a href="#" onclick="window.close()">Close this window</a></p>
            </body>
          </html>
        `);
      }

      if (!code) {
        console.error('❌ No authorization code received');
        return res.status(400).send(`
          <html>
            <body>
              <h1>❌ Authentication Failed</h1>
              <p>No authorization code received</p>
              <p><a href="#" onclick="window.close()">Close this window</a></p>
            </body>
          </html>
        `);
      }

      console.log('🔐 Received authorization code, exchanging for access token...');
      console.log('🔒 Session state:', state);

      // Exchange authorization code for access token with PKCE
      const tokenResult = await this.exchangeCodeForToken(code, state);

      if (tokenResult.success) {
        // Store the token for future use (in production, use secure storage)
        this.userAccessToken = tokenResult.accessToken;
        this.userRefreshToken = tokenResult.refreshToken;
        
        console.log('✅ User access token obtained successfully!');
        
        res.send(`
          <html>
            <body>
              <h1>✅ Authentication Successful!</h1>
              <p>You can now close this window and try creating a real Excel file again.</p>
              <p><a href="#" onclick="window.close()">Close this window</a></p>
              <script>
                // Auto-close after 3 seconds
                setTimeout(() => window.close(), 3000);
              </script>
            </body>
          </html>
        `);
      } else {
        console.error('❌ Token exchange failed:', tokenResult.error);
        res.status(500).send(`
          <html>
            <body>
              <h1>❌ Token Exchange Failed</h1>
              <p>Error: ${tokenResult.error}</p>
              <p><a href="#" onclick="window.close()">Close this window</a></p>
            </body>
          </html>
        `);
      }

    } catch (error) {
      console.error('❌ OAuth callback error:', error);
      res.status(500).send(`
        <html>
          <body>
            <h1>❌ Authentication Error</h1>
            <p>Error: ${error.message}</p>
            <p><a href="#" onclick="window.close()">Close this window</a></p>
          </body>
        </html>
      `);
    }
  }

  /**
   * Exchange authorization code for access token with PKCE support
   */
  async exchangeCodeForToken(code, sessionId) {
    try {
      const axios = require('axios');
      const clientId = process.env.AZURE_CLIENT_ID;
      const tenantId = process.env.AZURE_TENANT_ID;

      if (!clientId || !tenantId) {
        return {
          success: false,
          error: 'Missing Azure configuration'
        };
      }

      // Retrieve the stored PKCE code verifier
      const pkceSession = this.pkceStorage.get(sessionId);
      if (!pkceSession) {
        console.error('❌ PKCE session not found for session ID:', sessionId);
        return {
          success: false,
          error: 'Invalid or expired authentication session'
        };
      }

      const { codeVerifier } = pkceSession;
      console.log('🔒 Retrieved PKCE code verifier for session:', sessionId);

      const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
      const redirectUri = process.env.OAUTH_REDIRECT_URI || 'http://localhost:60006/auth/callback';
      const requestBody = new URLSearchParams({
        client_id: clientId,
        code: code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        scope: 'https://graph.microsoft.com/Files.ReadWrite https://graph.microsoft.com/User.Read offline_access',
        code_verifier: codeVerifier
      });

      console.log('🔐 Exchanging code for token with PKCE at:', tokenUrl);
      console.log('🔗 Using redirect URI for token exchange:', redirectUri);

      const response = await axios.post(tokenUrl, requestBody, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      console.log('✅ Token exchange successful');

      // Clean up the PKCE session after successful exchange
      this.pkceStorage.delete(sessionId);

      return {
        success: true,
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in
      };

    } catch (error) {
      console.error('❌ Token exchange failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error_description || error.message
      };
    }
  }

  /**
   * Get access token using Azure Entra app (client credentials flow)
   */
  async getEntraAppAccessToken() {
    try {
      const clientId = process.env.AZURE_CLIENT_ID;
      const clientSecret = process.env.AZURE_CLIENT_SECRET;
      const tenantId = process.env.AZURE_TENANT_ID;

      if (!clientId || !clientSecret || !tenantId) {
        throw new Error('Missing Azure Entra app configuration. Set AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, and AZURE_TENANT_ID in .env.dev');
      }

      console.log('🔐 Getting access token for client ID:', clientId);

      // Create MSAL instance
      const msalConfig = {
        auth: {
          clientId: clientId,
          clientSecret: clientSecret,
          authority: `https://login.microsoftonline.com/${tenantId}`
        }
      };

      const cca = new ConfidentialClientApplication(msalConfig);

      // Request access token with proper scopes for Graph API
      const clientCredentialRequest = {
        scopes: [
          'https://graph.microsoft.com/.default'
        ]
      };

      console.log('🔐 Requesting access token with scopes:', clientCredentialRequest.scopes);

      const response = await cca.acquireTokenByClientCredential(clientCredentialRequest);

      if (response && response.accessToken) {
        console.log('✅ Access token acquired successfully');
        return response.accessToken;
      } else {
        throw new Error('No access token in response');
      }

    } catch (error) {
      console.error('❌ Failed to get Entra app access token:', error);
      throw error;
    }
  }

  /**
   * Test Real Excel Integration
   */
  async testRealExcel(req, res) {
    try {
      console.log('🧪 Testing real Excel integration...');

      // Check Entra app authentication configuration
      const hasAzureConfig = process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET && process.env.AZURE_TENANT_ID;
      
      if (hasAzureConfig) {
        // Test Azure Entra app authentication
        try {
          console.log('🔐 Testing Azure Entra app authentication...');
          const accessToken = await this.getEntraAppAccessToken();
          
          if (accessToken) {
            res.json({
              success: true,
              available: true,
              authMethod: 'Azure Entra App',
              message: 'Real Excel integration available with Azure Entra app authentication',
              recommendation: 'Ready to create real Excel workbooks with proper OneDrive permissions'
            });
          } else {
            res.json({
              success: false,
              available: false,
              authMethod: 'Azure CLI (not authenticated)',
              message: 'Azure CLI authentication failed. Run "az login" first.',
              recommendation: 'Run "az login" then try again'
            });
          }
        } catch (error) {
          res.json({
            success: false,
            available: false,
            authMethod: 'Azure CLI (error)',
            message: `Azure CLI authentication test failed: ${error.message}`,
            recommendation: 'Install Azure CLI and run "az login"'
          });
        }
      } else if (hasAzureConfig) {
        res.json({
          success: false,
          available: false,
          authMethod: 'Azure AD App',
          message: 'Azure AD app authentication not yet implemented in JavaScript backend',
          azureConfigured: true,
          recommendation: 'Use Azure CLI authentication instead (set USE_AZURE_CLI_AUTH=true)'
        });
      } else {
        res.json({
          success: false,
          available: false,
          authMethod: 'None',
          message: 'Real Excel integration not configured',
          azureConfigured: false,
          recommendation: 'Set USE_AZURE_CLI_AUTH=true and run "az login", or configure Azure AD app credentials'
        });
      }

    } catch (error) {
      console.error('❌ Test real Excel error:', error);
      res.status(500).json({ 
        success: false,
        available: false,
        error: error.message,
        message: 'Real Excel integration test failed'
      });
    }
  }

  /**
   * List Real Excel Files
   */
  async listRealExcelFiles(req, res) {
    try {
      console.log('📋 Listing real Excel files...');

      // Try to list real Excel files, fallback to demo info
      try {
        // Note: This would require the TypeScript to be compiled
        console.log('⚠️  Real Excel service not available in dev mode - using demo file list');
        
        // Return demo file list
        const demoFiles = [
          {
            id: 'demo-file-1',
            name: 'customer_data_demo.xlsx',
            size: 15420,
            createdDateTime: new Date().toISOString(),
            lastModifiedDateTime: new Date().toISOString(),
            webUrl: 'http://localhost:60006/demo-excel?fileId=demo-file-1&token=demo',
            type: 'demo'
          }
        ];
        
        res.json({
          success: true,
          files: demoFiles,
          count: demoFiles.length,
          message: 'Demo file list - real files require Azure AD configuration'
        });
        
      } catch (error) {
        res.json({
          success: false,
          error: error.message,
          files: [],
          message: 'Failed to list files'
        });
      }

    } catch (error) {
      console.error('❌ List real Excel files error:', error);
      res.status(500).json({ 
        success: false,
        error: error.message,
        files: []
      });
    }
  }

  /**
   * Get Excel data in JSON format for the local viewer
   */
  async getExcelDataForViewer(req, res) {
    try {
      const { fileId } = req.params;
      console.log(`📊 Getting Excel data for local viewer: ${fileId}`);

      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      // Check if file exists in our storage
      const fileData = this.fileContents.get(fileId);
      const metadata = this.fileMetadata.get(fileId);

      if (!fileData || !metadata) {
        return res.status(404).json({ 
          error: 'Excel file not found',
          fileId: fileId
        });
      }

      // Parse the Excel file using ExcelJS
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      
      // Load the Excel buffer
      await workbook.xlsx.load(fileData);
      
      // Get the first worksheet
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        return res.status(400).json({ 
          error: 'No worksheets found in Excel file',
          fileId: fileId
        });
      }

      // Extract headers from first row
      const headers = [];
      const firstRow = worksheet.getRow(1);
      firstRow.eachCell((cell, colNumber) => {
        headers.push(cell.value ? cell.value.toString() : `Column ${colNumber}`);
      });

      // Extract data rows (skip header row)
      const rows = [];
      const rowCount = worksheet.rowCount;
      
      for (let rowNumber = 2; rowNumber <= rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        const rowData = [];
        
        // Get values for each column up to the header count
        for (let colNumber = 1; colNumber <= headers.length; colNumber++) {
          const cell = row.getCell(colNumber);
          const value = cell.value;
          
          // Convert cell value to string/number
          if (value === null || value === undefined) {
            rowData.push('');
          } else if (typeof value === 'object' && value.result !== undefined) {
            // Handle formula cells
            rowData.push(value.result);
          } else {
            rowData.push(value);
          }
        }
        
        // Only add non-empty rows
        if (rowData.some(cell => cell !== '')) {
          rows.push(rowData);
        }
      }

      // Prepare response data
      const excelData = {
        headers: headers,
        rows: rows,
        metadata: {
          rowCount: rows.length,
          columnCount: headers.length,
          fileSize: fileData.length,
          lastModified: metadata.lastModified || new Date().toISOString(),
          fileName: metadata.name,
          tableName: metadata.lakehouseTable || 'Unknown',
          fileId: fileId
        }
      };

      console.log(`✅ Excel data extracted: ${headers.length} columns, ${rows.length} rows`);
      res.json(excelData);

    } catch (error) {
      console.error('❌ Get Excel data for viewer error:', error);
      res.status(500).json({ 
        error: 'Failed to read Excel file',
        message: error.message,
        fileId: req.params.fileId
      });
    }
  }
}

module.exports = { WOPIHostEndpoints };