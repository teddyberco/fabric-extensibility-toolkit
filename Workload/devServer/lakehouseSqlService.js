/**
 * Lakehouse SQL Service
 * Uses SQL Analytics Endpoint for fast READ operations on Lakehouse tables
 */

const sql = require('mssql');
const axios = require('axios');

class LakehouseSqlService {
  constructor() {
    this.connectionPool = null;
  }

  /**
   * Get Lakehouse properties including SQL connection string
   * @param {string} workspaceId 
   * @param {string} lakehouseId 
   * @param {string} accessToken 
   * @returns {Promise<Object>}
   */
  async getLakehouseProperties(workspaceId, lakehouseId, accessToken) {
    try {
      console.log('📊 Fetching Lakehouse properties...');
      console.log('   Workspace:', workspaceId);
      console.log('   Lakehouse:', lakehouseId);

      const url = `https://api.fabric.microsoft.com/v1/workspaces/${workspaceId}/lakehouses/${lakehouseId}`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Lakehouse properties retrieved');
      console.log('   SQL Connection:', response.data.properties?.sqlEndpointProperties?.connectionString);

      return response.data;
    } catch (error) {
      console.error('❌ Failed to get Lakehouse properties:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get SQL access token with database scope
   * @param {string} fabricAccessToken - Fabric platform access token
   * @returns {Promise<string>}
   */
  async getSqlAccessToken(fabricAccessToken) {
    // For now, we'll use the Fabric token
    // In production, you'd exchange it for a SQL-scoped token
    // Scope: https://database.windows.net//.default
    console.log('🔐 Using Fabric access token for SQL (Note: May need SQL-specific scope in production)');
    return fabricAccessToken;
  }

  /**
   * Connect to Lakehouse SQL Analytics Endpoint
   * @param {string} connectionString - SQL connection string from Lakehouse properties
   * @param {string} accessToken - Access token with SQL scope
   * @param {string} database - Database name (usually 'default' or lakehouse name)
   * @returns {Promise<void>}
   */
  async connect(connectionString, accessToken, database = 'default') {
    try {
      console.log('📡 Connecting to Lakehouse SQL Analytics Endpoint...');
      console.log('   Server:', connectionString);
      console.log('   Database:', database);

      const config = {
        server: connectionString,
        database: database,
        authentication: {
          type: 'azure-active-directory-access-token',
          options: {
            token: accessToken
          }
        },
        options: {
          encrypt: true,
          trustServerCertificate: false,
          connectTimeout: 30000,
          requestTimeout: 30000
        }
      };

      this.connectionPool = await sql.connect(config);
      console.log('✅ Connected to SQL Analytics Endpoint');
      return this.connectionPool;

    } catch (error) {
      console.error('❌ SQL connection failed:', error.message);
      throw new Error(`Failed to connect to SQL Analytics Endpoint: ${error.message}`);
    }
  }

  /**
   * Query Lakehouse table data via SQL
   * @param {string} tableName 
   * @param {number} limit 
   * @returns {Promise<Object>} { schema, rows, rowCount }
   */
  async queryTable(tableName, limit = 10000) {
    try {
      if (!this.connectionPool) {
        throw new Error('Not connected to SQL Analytics Endpoint. Call connect() first.');
      }

      console.log(`📊 Querying table: ${tableName} (limit: ${limit})`);

      // Query data
      const query = `SELECT TOP ${limit} * FROM [${tableName}]`;
      console.log('   SQL:', query);

      const result = await this.connectionPool.request().query(query);

      console.log(`✅ Query completed: ${result.recordset.length} rows returned`);

      // Extract schema from recordset columns
      const schema = Object.keys(result.recordset.columns || {}).map(colName => {
        const col = result.recordset.columns[colName];
        return {
          name: colName,
          dataType: this.mapSqlTypeToString(col.type)
        };
      });

      // Convert rows to array format
      const rows = result.recordset.map(row => 
        schema.map(col => row[col.name])
      );

      return {
        schema,
        rows,
        rowCount: result.recordset.length,
        tableName
      };

    } catch (error) {
      console.error('❌ SQL query failed:', error.message);
      throw new Error(`Failed to query table ${tableName}: ${error.message}`);
    }
  }

  /**
   * Map SQL data types to simple string types
   * @param {Object} sqlType 
   * @returns {string}
   */
  mapSqlTypeToString(sqlType) {
    const typeMap = {
      'VarChar': 'string',
      'NVarChar': 'string',
      'Char': 'string',
      'NChar': 'string',
      'Text': 'string',
      'NText': 'string',
      'Int': 'integer',
      'BigInt': 'bigint',
      'SmallInt': 'smallint',
      'TinyInt': 'tinyint',
      'Decimal': 'decimal',
      'Numeric': 'decimal',
      'Float': 'double',
      'Real': 'float',
      'Bit': 'boolean',
      'DateTime': 'timestamp',
      'DateTime2': 'timestamp',
      'Date': 'date',
      'Time': 'time',
      'Binary': 'binary',
      'VarBinary': 'binary'
    };

    return typeMap[sqlType?.name] || 'string';
  }

  /**
   * Close SQL connection
   */
  async close() {
    if (this.connectionPool) {
      await this.connectionPool.close();
      this.connectionPool = null;
      console.log('🔌 SQL connection closed');
    }
  }

  /**
   * High-level method: Fetch table data from Lakehouse using SQL
   * Uses Fabric REST API instead of direct SQL connection (simpler authentication)
   * @param {string} workspaceId 
   * @param {string} lakehouseId 
   * @param {string} tableName 
   * @param {string} accessToken - Fabric access token
   * @param {number} limit 
   * @returns {Promise<Object>}
   */
  async fetchTableData(workspaceId, lakehouseId, tableName, accessToken, limit = 10000) {
    try {
      console.log('🔍 Fetching Lakehouse table data via Fabric REST API...');

      // Use Fabric REST API to query the table (simpler than direct SQL)
      // Endpoint: POST /v1/workspaces/{workspaceId}/lakehouses/{lakehouseId}/tables/{tableName}/query
      const url = `https://api.fabric.microsoft.com/v1/workspaces/${workspaceId}/lakehouses/${lakehouseId}/tables/${tableName}/rows`;
      
      console.log('📊 Calling Fabric API to get table rows...');
      console.log('   URL:', url);
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          $top: limit
        }
      });

      console.log('✅ Successfully fetched table data via Fabric API');
      console.log('   Rows:', response.data.value?.length || 0);

      // Parse the response
      const rows = response.data.value || [];
      
      // Extract schema from first row
      let schema = [];
      if (rows.length > 0) {
        schema = Object.keys(rows[0]).map(colName => ({
          name: colName,
          dataType: this.inferDataType(rows[0][colName])
        }));
      }

      // Convert rows to array format
      const rowsArray = rows.map(row => 
        schema.map(col => row[col.name])
      );

      console.log('✅ Successfully fetched table data via Fabric REST API');
      return {
        schema,
        rows: rowsArray,
        rowCount: rowsArray.length,
        tableName
      };

    } catch (error) {
      console.error('❌ Failed to fetch table data:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Infer data type from value
   * @param {any} value 
   * @returns {string}
   */
  inferDataType(value) {
    if (value === null || value === undefined) return 'string';
    if (typeof value === 'number') {
      return Number.isInteger(value) ? 'integer' : 'double';
    }
    if (typeof value === 'boolean') return 'boolean';
    if (value instanceof Date) return 'timestamp';
    return 'string';
  }
}

module.exports = { LakehouseSqlService };
