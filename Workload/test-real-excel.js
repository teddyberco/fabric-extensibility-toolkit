/**
 * Test Real Excel Integration
 * 
 * This file demonstrates how to test the real Excel workbook creation
 * and embedding functionality in development mode.
 */

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:60006',
  tableName: 'test_customer_data',
  testData: [
    ['CUST001', 'John Smith', 'john@example.com', 'Active', '2023-01-15'],
    ['CUST002', 'Jane Doe', 'jane@example.com', 'Active', '2023-02-20'],
    ['CUST003', 'Bob Johnson', 'bob@example.com', 'Inactive', '2023-03-10'],
    ['CUST004', 'Alice Wilson', 'alice@example.com', 'Active', '2023-04-05'],
    ['CUST005', 'Charlie Brown', 'charlie@example.com', 'Pending', '2023-05-12']
  ],
  schema: [
    { name: 'Customer ID', dataType: 'string' },
    { name: 'Name', dataType: 'string' },
    { name: 'Email', dataType: 'string' },
    { name: 'Status', dataType: 'string' },
    { name: 'Created Date', dataType: 'date' }
  ]
};

/**
 * Test Real Excel Integration Availability
 */
async function testRealExcelAvailability() {
  try {
    console.log('🧪 Testing real Excel integration availability...');
    
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/excel/test-real`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const result = await response.json();
    console.log('📊 Test Result:', result);
    
    if (result.success && result.available) {
      console.log('✅ Real Excel integration is available!');
      console.log('📁 Test file created:', result.testFile);
      return true;
    } else {
      console.log('❌ Real Excel integration not available:', result.message);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * Create a Real Excel Workbook
 */
async function createTestRealExcelWorkbook() {
  try {
    console.log('🎯 Creating test real Excel workbook...');
    
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/excel/create-real`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tableName: TEST_CONFIG.tableName,
        tableData: TEST_CONFIG.testData,
        schema: TEST_CONFIG.schema
      })
    });
    
    const result = await response.json();
    console.log('📊 Creation Result:', result);
    
    if (result.success) {
      console.log('✅ Real Excel workbook created successfully!');
      console.log('📁 File ID:', result.fileId);
      console.log('📄 File Name:', result.fileName);
      console.log('🔗 Embed URL:', result.embedUrl);
      console.log('🌐 Web URL:', result.webUrl);
      
      return result;
    } else {
      console.log('❌ Failed to create real Excel workbook:', result.error);
      return null;
    }
    
  } catch (error) {
    console.error('❌ Creation failed:', error);
    return null;
  }
}

/**
 * List Available Excel Files
 */
async function listRealExcelFiles() {
  try {
    console.log('📋 Listing available Excel files...');
    
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/excel/list`);
    const result = await response.json();
    
    console.log('📊 Files Result:', result);
    
    if (result.success) {
      console.log(`✅ Found ${result.count} Excel files:`);
      result.files.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file.name} (${file.size} bytes, modified: ${file.lastModifiedDateTime})`);
      });
      return result.files;
    } else {
      console.log('❌ Failed to list files:', result.error);
      return [];
    }
    
  } catch (error) {
    console.error('❌ Listing failed:', error);
    return [];
  }
}

/**
 * Run Complete Test Suite
 */
async function runCompleteTest() {
  console.log('🚀 Starting Real Excel Integration Test Suite...');
  console.log('================================================');
  
  // Step 1: Test availability
  const isAvailable = await testRealExcelAvailability();
  
  if (!isAvailable) {
    console.log('⚠️  Real Excel integration not available. Ensure:');
    console.log('   1. Azure AD app is configured in .env.dev');
    console.log('   2. AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID are set');
    console.log('   3. Microsoft Graph API permissions are granted');
    console.log('   4. ENABLE_REAL_EXCEL=true in .env.dev');
    return;
  }
  
  // Step 2: Create test workbook
  const workbook = await createTestRealExcelWorkbook();
  
  if (!workbook) {
    console.log('❌ Failed to create test workbook');
    return;
  }
  
  // Step 3: List files
  await listRealExcelFiles();
  
  console.log('================================================');
  console.log('🎉 Real Excel Integration Test Complete!');
  console.log('💡 You can now embed this workbook in an iframe:');
  console.log(`   <iframe src="${workbook.embedUrl}" width="100%" height="600px"></iframe>`);
}

// Export for use in browser console or Node.js
if (typeof window !== 'undefined') {
  // Browser environment
  window.testRealExcel = {
    testAvailability: testRealExcelAvailability,
    createWorkbook: createTestRealExcelWorkbook,
    listFiles: listRealExcelFiles,
    runCompleteTest: runCompleteTest
  };
  
  console.log('🧪 Real Excel Test Functions Available:');
  console.log('   window.testRealExcel.testAvailability()');
  console.log('   window.testRealExcel.createWorkbook()');
  console.log('   window.testRealExcel.listFiles()');
  console.log('   window.testRealExcel.runCompleteTest()');
  
} else {
  // Node.js environment
  module.exports = {
    testRealExcelAvailability,
    createTestRealExcelWorkbook,
    listRealExcelFiles,
    runCompleteTest
  };
}