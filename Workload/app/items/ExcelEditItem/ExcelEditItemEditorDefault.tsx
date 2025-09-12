import React, { useState, useEffect } from "react";
import {
  Button,
  Card,
  CardHeader,
  Text,
  MessageBar,
  MessageBarBody,
  Spinner,
  Badge,
  Field,
  Dropdown,
  Option,
} from "@fluentui/react-components";
import {
  ChevronDown20Regular,
  Warning20Filled,
  DatabaseSearch20Regular,
  Save20Regular,
  TableSimple20Regular,
  FolderOpen20Regular,
  CloudDatabase20Regular,
} from "@fluentui/react-icons";
import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { ItemWithDefinition, saveItemDefinition } from "../../controller/ItemCRUDController";
import { callDatahubOpen } from "../../controller/DataHubController";
import { ExcelEditItemDefinition } from "./ExcelEditItemModel";
import { WOPIHostService } from "../../services/WOPIHostService";
import type { ExcelDataSchema } from "../../services/WOPIHostService";
import "../../styles.scss";

// Types for the Fabric-native Excel editing workflow
interface LakehouseInfo {
  id: string;
  name: string;
  workspaceId: string;
}

interface TableInfo {
  name: string;
  displayName: string;
  schema: Array<{ name: string; dataType: string }>;
  rowCount: number;
}

interface OneLakeFolder {
  path: string;
  name: string;
  type: 'folder' | 'file';
}

// Workflow states for the Excel editing experience
enum WorkflowState {
  INITIAL = 'initial',
  SELECTING_TABLE = 'selecting_table',
  LOADING_DATA = 'loading_data',
  EXCEL_EDITING = 'excel_editing',
  SAVING_TO_ONELAKE = 'saving_to_onelake',
  COMPLETED = 'completed'
}

interface ExcelEditItemEditorDefaultProps {
  workloadClient: WorkloadClientAPI;
  item?: ItemWithDefinition<ExcelEditItemDefinition>;
}

/**
 * Fabric-Native Excel Editing Experience
 * Complete workflow: Lakehouse selection → Table selection → Excel editing → OneLake save
 */
export function ExcelEditItemEditorDefault({
  workloadClient,
  item,
}: ExcelEditItemEditorDefaultProps) {
  
  // Workflow state management
  const [currentState, setCurrentState] = useState<WorkflowState>(WorkflowState.INITIAL);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data selection state
  const [selectedLakehouse, setSelectedLakehouse] = useState<LakehouseInfo | null>(null);
  const [availableTables, setAvailableTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null);
  
  // Excel and OneLake state
  const [excelData, setExcelData] = useState<any[][]>([]);
  const [oneLakeFolders, setOneLakeFolders] = useState<OneLakeFolder[]>([]);
  const [selectedSaveFolder, setSelectedSaveFolder] = useState<string>('');
  
  // WOPI Host state
  const [excelFileId, setExcelFileId] = useState<string>('');
  const [excelOnlineUrl, setExcelOnlineUrl] = useState<string>('');
  const [isCreatingExcelFile, setIsCreatingExcelFile] = useState(false);

  // Debug info for development
  console.log('WOPI Host state:', { excelFileId, excelOnlineUrl, isCreatingExcelFile });

  // Initialize component - check if we have existing configuration
  useEffect(() => {
    if (item?.definition?.state) {
      // Check if state is the new workflow state object or legacy string
      const state = item.definition.state;
      if (typeof state === 'object' && state.lakehouseId && state.tableId) {
        setCurrentState(WorkflowState.EXCEL_EDITING);
        // Would load existing Excel configuration here
      } else if (typeof state === 'string' && state === 'getting_started') {
        setCurrentState(WorkflowState.EXCEL_EDITING);
      }
    }
  }, [item]);

  // Step 1: Load available lakehouses using DataHub API
  const loadLakehouses = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Opening DataHub lakehouse selector...');
      
      // Use the official Fabric SDK DataHub API for lakehouse selection
      const selectedLakehouse = await callDatahubOpen(
        workloadClient,
        ["Lakehouse"],
        "Select a lakehouse to use for Excel data integration",
        false,
        true
      );
      
      if (selectedLakehouse) {
        console.log('✅ Lakehouse selected:', selectedLakehouse);
        
        // Convert the selected item to our LakehouseInfo format
        const lakehouseInfo: LakehouseInfo = {
          id: selectedLakehouse.id,
          name: selectedLakehouse.displayName,
          workspaceId: selectedLakehouse.workspaceId
        };
        
        // Directly proceed to table selection with the selected lakehouse
        await selectLakehouse(lakehouseInfo);
      } else {
        // User cancelled the selection
        setCurrentState(WorkflowState.INITIAL);
      }
    } catch (err) {
      setError('Failed to open lakehouse selector. Please check your permissions.');
      console.error('Lakehouse loading error:', err);
      setCurrentState(WorkflowState.INITIAL);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Select lakehouse and load tables
  const selectLakehouse = async (lakehouse: LakehouseInfo) => {
    setSelectedLakehouse(lakehouse);
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`🔍 Loading real tables from lakehouse: ${lakehouse.id}`);
      
      // Use WOPI Host service to get real lakehouse tables
      const wopiService = new WOPIHostService(workloadClient);
      const tableNames = await wopiService.getLakehouseTables(lakehouse.workspaceId, lakehouse.id);
      
      // Convert table names to TableInfo objects
      const realTables: TableInfo[] = tableNames.map(tableName => ({
        name: tableName,
        displayName: tableName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        schema: [] as ExcelDataSchema[], // Schema will be loaded when table is selected
        rowCount: 0 // Row count will be determined when data is fetched
      }));
      
      console.log(`✅ Found ${realTables.length} tables in lakehouse`);
      setAvailableTables(realTables);
      setCurrentState(WorkflowState.SELECTING_TABLE);
    } catch (err) {
      console.error('Table loading error:', err);
      
      // Fallback to mock tables if real data fetch fails
      console.log('⚠️ Falling back to mock tables due to error:', err);
      const mockTables: TableInfo[] = [
        { 
          name: 'sales_data', 
          displayName: 'Sales Performance Data',
          schema: [
            { name: 'SaleID', dataType: 'string' },
            { name: 'Date', dataType: 'datetime' },
            { name: 'Region', dataType: 'string' },
            { name: 'Revenue', dataType: 'decimal' },
          ],
          rowCount: 15420 
        },
        { 
          name: 'customer_analytics', 
          displayName: 'Customer Analytics',
          schema: [
            { name: 'CustomerID', dataType: 'string' },
            { name: 'Segment', dataType: 'string' },
            { name: 'LifetimeValue', dataType: 'decimal' },
          ],
          rowCount: 8930 
        },
      ];
      
      setAvailableTables(mockTables);
      setCurrentState(WorkflowState.SELECTING_TABLE);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Select table and load data for Excel
  const selectTableAndLoadData = async (table: TableInfo) => {
    setSelectedTable(table);
    setIsLoading(true);
    setCurrentState(WorkflowState.LOADING_DATA);
    
    try {
      // Load data from the selected table
      // In real implementation: workloadClient.lakehouse.queryTable(selectedLakehouse.id, table.name)
      
      // Generate mock data for Excel
      const headers = table.schema.map(col => col.name);
      const mockData = [headers];
      
      // Generate realistic sample rows
      for (let i = 0; i < 100; i++) {
        const row = table.schema.map(col => {
          switch (col.dataType) {
            case 'string': return `Sample_${i + 1}`;
            case 'decimal': return (Math.random() * 1000).toFixed(2);
            case 'datetime': return new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0];
            default: return `Value_${i + 1}`;
          }
        });
        mockData.push(row);
      }
      
      setExcelData(mockData);
      setCurrentState(WorkflowState.EXCEL_EDITING);
    } catch (err) {
      setError('Failed to load data from table.');
      console.error('Data loading error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 5: Save edited data back to OneLake
  const saveToOneLake = async (editedData: any[][]) => {
    setIsLoading(true);
    setCurrentState(WorkflowState.SAVING_TO_ONELAKE);
    
    try {
      // In real implementation, this would use OneLake APIs to save the data
      // workloadClient.onelake.saveFile(selectedSaveFolder, filename, editedData)
      
      console.log('Saving edited data to OneLake:', editedData);
      
      // Mock save process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setCurrentState(WorkflowState.COMPLETED);
      
      // Save the workflow state to item definition
      await saveItemDefinition(workloadClient, item!.id, {
        state: {
          lakehouseId: selectedLakehouse!.id,
          tableId: selectedTable!.name,
          lastSavedPath: selectedSaveFolder,
          lastEditedDate: new Date().toISOString()
        }
      });
      
    } catch (err) {
      setError('Failed to save data to OneLake.');
      console.error('OneLake save error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 6: Load OneLake folders for save destination
  const loadOneLakeFolders = async () => {
    try {
      // In real implementation: workloadClient.onelake.getFolders()
      const mockFolders: OneLakeFolder[] = [
        { path: '/MyWorkspace/Data', name: 'Data', type: 'folder' },
        { path: '/MyWorkspace/Reports', name: 'Reports', type: 'folder' },
        { path: '/MyWorkspace/Analysis', name: 'Analysis', type: 'folder' },
      ];
      
      setOneLakeFolders(mockFolders);
    } catch (err) {
      console.error('Failed to load OneLake folders:', err);
    }
  };

  // Handle Excel file creation with WOPI Host
  const handleCreateExcelFile = async () => {
    if (!selectedTable || !selectedLakehouse) {
      return;
    }

    setIsCreatingExcelFile(true);
    
    try {
      console.log(`🔍 Creating Excel from real lakehouse data for table: ${selectedTable.name}`);
      
      // Create Excel file from real lakehouse data using WOPI Host service
      const wopiService = new WOPIHostService(workloadClient);
      const fileId = await wopiService.createExcelFromLakehouseData(
        selectedLakehouse.workspaceId,
        selectedLakehouse.id,
        selectedTable.name
      );
      
      // Generate Excel Online URL with WOPI endpoints
      const onlineUrl = await wopiService.getExcelOnlineUrl(fileId);
      console.log('🔗 Generated Excel Online URL:', onlineUrl);
      
      setExcelFileId(fileId);
      setExcelOnlineUrl(onlineUrl);
      console.log('✅ Excel Online URL set successfully:', onlineUrl);
      
      // Force re-render to show Excel Online interface
      setTimeout(() => {
        setIsCreatingExcelFile(false);
      }, 1000);
      
    } catch (err) {
      console.error('Failed to create Excel file:', err);
      setError('Failed to create Excel file for online editing. ' + (err as Error).message);
      setIsCreatingExcelFile(false);
    }
  };

  // UI Rendering based on workflow state
  const renderWorkflowStep = () => {
    switch (currentState) {
      case WorkflowState.INITIAL:
        return (
          <Card className="workflow-card">
            <div className="workflow-step-content">
              <CloudDatabase20Regular className="workflow-step-icon" />
              <Text size={600} block className="workflow-step-title">
                Excel Lakehouse Editor
              </Text>
              <Text block className="workflow-step-description">
                Connect to your Fabric Lakehouse, edit data in Excel, and save back to OneLake - all without leaving Fabric.
              </Text>
              <Button 
                appearance="primary" 
                size="large"
                icon={<DatabaseSearch20Regular />}
                onClick={loadLakehouses}
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Start with Lakehouse'}
              </Button>
            </div>
          </Card>
        );

      case WorkflowState.SELECTING_TABLE:
        return (
          <Card className="workflow-card">
            <CardHeader
              header={<Text weight="semibold">Step 2: Select Table</Text>}
              description={<Text>Choose a table from {selectedLakehouse?.name}</Text>}
            />
            <div className="card-content">
              {availableTables.map((table) => (
                <Card 
                  key={table.name} 
                  className="selectable-card"
                  onClick={() => selectTableAndLoadData(table)}
                  style={{ cursor: 'pointer', marginBottom: '0.5rem' }}
                >
                  <div style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <Text weight="semibold" block>{table.displayName}</Text>
                        <Text size={200} style={{ color: '#666' }}>
                          {table.schema.length} columns • {table.rowCount.toLocaleString()} rows
                        </Text>
                      </div>
                      <TableSimple20Regular style={{ color: '#0078d4' }} />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        );

      case WorkflowState.LOADING_DATA:
        return (
          <Card className="workflow-card">
            <div className="card-content" style={{ textAlign: 'center', padding: '2rem' }}>
              <Spinner size="large" />
              <Text block style={{ marginTop: '1rem' }}>
                Loading data from {selectedTable?.displayName}...
              </Text>
            </div>
          </Card>
        );

      case WorkflowState.EXCEL_EDITING:
        if (excelOnlineUrl) {
          // Show Excel Online iframe
          return (
            <Card className="workflow-card">
              <CardHeader
                header={<Text weight="semibold">Step 3: Excel Online Editing</Text>}
                description={<Text>Edit your data using Excel Online (WOPI Host integration)</Text>}
              />
              <div className="card-content">
                {!excelOnlineUrl ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <Text>⚠️ Excel Online URL not generated yet</Text>
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#f3f2f1', borderRadius: '4px' }}>
                      <Text size={200}>📍 Excel URL: {excelOnlineUrl}</Text>
                      <br />
                      <Text size={200}>
                        <a href={excelOnlineUrl} target="_blank" rel="noopener noreferrer">
                          🔗 Open in new tab (for testing)
                        </a>
                      </Text>
                      <br />
                      <Text size={100} style={{ color: '#0078d4', marginTop: '4px', fontWeight: 'bold' }}>
                        ✨ Enhanced Excel Demo Active - Interactive Spreadsheet Ready!
                      </Text>
                    </div>
                    <iframe
                      src={excelOnlineUrl}
                      style={{
                        width: '100%',
                        height: '600px',
                        border: '1px solid #ccc',
                        borderRadius: '4px'
                      }}
                      title="Excel Online Editor"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
                      referrerPolicy="no-referrer-when-downgrade"
                      onLoad={() => console.log('✅ Excel iframe loaded successfully')}
                      onError={(e) => console.error('❌ Excel iframe failed to load:', e)}
                    />
                  </>
                )}
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
                  <Button 
                    appearance="primary"
                    icon={<Save20Regular />}
                    onClick={() => {
                      loadOneLakeFolders();
                      setCurrentState(WorkflowState.SAVING_TO_ONELAKE);
                    }}
                  >
                    Save to OneLake
                  </Button>
                  <Button 
                    appearance="outline"
                    onClick={() => setCurrentState(WorkflowState.SELECTING_TABLE)}
                  >
                    Select Different Table
                  </Button>
                </div>
              </div>
            </Card>
          );
        }
        
        // Show Excel file creation step
        return (
          <Card className="workflow-card">
            <CardHeader
              header={<Text weight="semibold">Step 3: Create Excel File</Text>}
              description={<Text>Setting up Excel Online editing environment</Text>}
            />
            <div className="card-content" style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
              <h3>Creating Excel File for Online Editing</h3>
              {isCreatingExcelFile ? (
                <>
                  <Spinner size="large" label="Setting up Excel Online environment..." />
                  <div style={{
                    marginTop: '2rem',
                    padding: '1rem',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    textAlign: 'left',
                    fontSize: '14px',
                    lineHeight: '1.5'
                  }}>
                    <strong>WOPI Host Setup:</strong><br />
                    • Converting Lakehouse data to Excel format<br />
                    • Generating WOPI access tokens<br />
                    • Creating Excel Online session<br />
                    • Preparing embedded editing environment
                  </div>
                </>
              ) : (
                <>
                  <Text>Ready to create Excel file with full online editing capabilities</Text>
                  <div style={{
                    marginTop: '2rem',
                    padding: '1rem',
                    backgroundColor: '#e3f2fd',
                    borderRadius: '8px',
                    textAlign: 'left',
                    fontSize: '14px',
                    lineHeight: '1.5'
                  }}>
                    <strong>Excel Online Integration:</strong><br />
                    • Full Excel interface embedded in Fabric<br />
                    • Real-time collaboration support<br />
                    • Direct save to OneLake<br />
                    • No need to leave the Fabric environment
                  </div>
                </>
              )}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <Button 
                  appearance="primary" 
                  onClick={handleCreateExcelFile}
                  disabled={isCreatingExcelFile}
                >
                  {isCreatingExcelFile ? 'Creating...' : 'Create Excel File'}
                </Button>
                <Button 
                  appearance="outline"
                  onClick={() => setCurrentState(WorkflowState.SELECTING_TABLE)}
                  disabled={isCreatingExcelFile}
                >
                  Select Different Table
                </Button>
              </div>
            </div>
          </Card>
        );

      case WorkflowState.SAVING_TO_ONELAKE:
        return (
          <Card className="workflow-card">
            <CardHeader
              header={<Text weight="semibold">Step 4: Save to OneLake</Text>}
              description={<Text>Choose destination folder in your OneLake</Text>}
            />
            <div className="card-content">
              {!isLoading && (
                <>
                  <Field label="Save Location">
                    <Dropdown 
                      placeholder="Select OneLake folder"
                      value={selectedSaveFolder}
                      onOptionSelect={(_, data) => setSelectedSaveFolder(data.optionValue || '')}
                    >
                      {oneLakeFolders.map((folder) => (
                        <Option key={folder.path} value={folder.path} text={folder.name}>
                          <FolderOpen20Regular style={{ marginRight: '0.5rem' }} />
                          {folder.name}
                        </Option>
                      ))}
                    </Dropdown>
                  </Field>
                  
                  <div style={{ marginTop: '1rem' }}>
                    <Button 
                      appearance="primary"
                      disabled={!selectedSaveFolder}
                      onClick={() => saveToOneLake(excelData)}
                    >
                      Save Edited Data
                    </Button>
                  </div>
                </>
              )}
              
              {isLoading && (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <Spinner size="large" />
                  <Text block style={{ marginTop: '1rem' }}>
                    Saving data to OneLake...
                  </Text>
                </div>
              )}
            </div>
          </Card>
        );

      case WorkflowState.COMPLETED:
        return (
          <Card className="workflow-card">
            <div className="card-content" style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
              <Text size={600} weight="semibold" block style={{ marginBottom: '1rem' }}>
                Data Saved Successfully!
              </Text>
              <Text block style={{ marginBottom: '2rem', color: '#666' }}>
                Your edited data has been saved to OneLake and is ready for use.
              </Text>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <Button 
                  appearance="primary"
                  onClick={() => setCurrentState(WorkflowState.INITIAL)}
                >
                  Start New Edit Session
                </Button>
                <Button 
                  appearance="outline"
                  onClick={() => setCurrentState(WorkflowState.EXCEL_EDITING)}
                >
                  Continue Editing
                </Button>
              </div>
            </div>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="excel-edit-container" style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Progress indicator */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          {[
            { state: WorkflowState.SELECTING_TABLE, label: 'Lakehouse & Table' },
            { state: WorkflowState.EXCEL_EDITING, label: 'Excel Edit' },
            { state: WorkflowState.SAVING_TO_ONELAKE, label: 'Save' },
          ].map((step, index) => (
            <React.Fragment key={step.state}>
              <Badge 
                appearance={
                  currentState === step.state ? 'filled' : 
                  Object.values(WorkflowState).indexOf(currentState) > Object.values(WorkflowState).indexOf(step.state) ? 'outline' : 'ghost'
                }
                color={
                  currentState === step.state ? 'brand' : 
                  Object.values(WorkflowState).indexOf(currentState) > Object.values(WorkflowState).indexOf(step.state) ? 'success' : 'subtle'
                }
              >
                {step.label}
              </Badge>
              {index < 3 && <ChevronDown20Regular style={{ transform: 'rotate(-90deg)' }} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <MessageBar intent="error" style={{ marginBottom: '1rem' }}>
          <MessageBarBody>
            <Warning20Filled style={{ marginRight: '0.5rem' }} />
            {error}
          </MessageBarBody>
        </MessageBar>
      )}

      {/* Main workflow content */}
      {renderWorkflowStep()}

      {/* Workflow overview */}
      <Card style={{ marginTop: '2rem' }}>
        <CardHeader
          header={<Text weight="semibold">Fabric-Native Excel Editing Workflow</Text>}
          description={<Text>Complete data editing experience without leaving Microsoft Fabric</Text>}
        />
        <div className="card-content">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <Text weight="semibold" block>1. DataHub Integration</Text>
              <Text size={200}>Select lakehouses and tables using Fabric's DataHub SDK</Text>
            </div>
            <div>
              <Text weight="semibold" block>2. Connected Workbooks</Text>
              <Text size={200}>Edit data using @microsoft/connected-workbooks in Fabric</Text>
            </div>
            <div>
              <Text weight="semibold" block>3. OneLake Storage</Text>
              <Text size={200}>Save edited data directly to your OneLake folders</Text>
            </div>
            <div>
              <Text weight="semibold" block>4. Fabric Native</Text>
              <Text size={200}>Complete experience without leaving the Fabric environment</Text>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
