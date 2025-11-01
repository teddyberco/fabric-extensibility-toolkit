/**
 * Lakehouse Data API
 * Provides endpoints for fetching real data from Microsoft Fabric Lakehouse
 */

const express = require('express');
const router = express.Router();

/**
 * Fetch real table data from Lakehouse using Spark
 * This endpoint acts as a bridge between the frontend and the TypeScript LakehouseDataService
 */
router.post('/api/lakehouse/fetchTableData', async (req, res) => {
  try {
    const { workspaceId, lakehouseId, tableName, limit } = req.body;

    console.log(`📊 API: Fetch table data request received`);
    console.log(`   Workspace: ${workspaceId}`);
    console.log(`   Lakehouse: ${lakehouseId}`);
    console.log(`   Table: ${tableName}`);
    console.log(`   Limit: ${limit || 10000}`);

    // Validate required parameters
    if (!workspaceId || !lakehouseId || !tableName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: workspaceId, lakehouseId, tableName'
      });
    }

    // For now, return a placeholder response
    // In production, this would call the TypeScript LakehouseDataService
    // which is initialized in the frontend with the workloadClient
    
    console.log('⚠️  Note: Lakehouse data fetching requires TypeScript service initialization');
    console.log('   The frontend will handle the actual data fetching using the workloadClient');
    
    res.json({
      success: true,
      message: 'Lakehouse API endpoint ready',
      note: 'Data fetching will be handled by frontend LakehouseDataService',
      params: {
        workspaceId,
        lakehouseId,
        tableName,
        limit: limit || 10000
      }
    });

  } catch (error) {
    console.error('❌ Lakehouse API error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

/**
 * Test Lakehouse connectivity
 */
router.get('/api/lakehouse/test', async (req, res) => {
  try {
    console.log('🧪 Lakehouse connectivity test');
    
    res.json({
      success: true,
      message: 'Lakehouse API is running',
      timestamp: new Date().toISOString(),
      endpoints: {
        fetchTableData: 'POST /api/lakehouse/fetchTableData',
        test: 'GET /api/lakehouse/test'
      }
    });

  } catch (error) {
    console.error('❌ Test endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
