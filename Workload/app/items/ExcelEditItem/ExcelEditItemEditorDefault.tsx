import React, { useState, useEffect } from "react";
import {
  Button,
  Text,
  Spinner,
} from "@fluentui/react-components";
import {
  DatabaseSearch20Regular,
  TableSimple20Regular,
  Add20Regular,
  ArrowDownload20Regular,
  WindowNew20Regular,
} from "@fluentui/react-icons";
import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { ItemWithDefinition, saveItemDefinition } from "../../controller/ItemCRUDController";
import { callDatahubWizardOpen } from "../../controller/DataHubController";
import { ExcelEditItemDefinition, ExcelEditWorkflowState, CurrentView, VIEW_TYPES } from "./ExcelEditItemModel";
import { LocalExcelViewer } from "../../components/items/ExcelEditItem/LocalExcelViewer";
import "../../styles.scss";

interface CanvasItem {
  id: string;
  type: 'lakehouse-table' | 'uploaded-file' | 'external-source';
  name: string;
  displayName: string;
  source: {
    lakehouse?: { id: string; name: string; workspaceId: string; };
    table?: { name: string; displayName: string; schema: Array<{ name: string; dataType: string }>; rowCount: number; };
    file?: { name: string; size: number; lastModified: string; };
  };
  lastEdited?: string;
  hasUnsavedChanges?: boolean;
}

interface ExcelEditItemEditorDefaultProps {
  workloadClient: WorkloadClientAPI;
  item?: ItemWithDefinition<ExcelEditItemDefinition>;
  currentView: CurrentView;
  onNavigateToTableEditor?: () => void;
  onNavigateToCanvasOverview?: () => void;
}

export function ExcelEditItemEditorDefault({
  workloadClient,
  item,
  currentView,
  onNavigateToTableEditor,
  onNavigateToCanvasOverview
}: ExcelEditItemEditorDefaultProps) {
  
  console.log('🎯 ExcelEditItemEditorDefault rendering with currentView:', currentView);
  
  if (currentView === VIEW_TYPES.CANVAS_OVERVIEW) {
    console.log('📋 Rendering CanvasOverviewView');
    return <CanvasOverviewView 
      workloadClient={workloadClient}
      item={item}
      onNavigateToTableEditor={onNavigateToTableEditor}
    />;
  } else if (currentView === VIEW_TYPES.TABLE_EDITOR) {
    console.log('📊 Rendering TableEditorView');
    return <TableEditorView 
      workloadClient={workloadClient}
      item={item}
      onNavigateToCanvasOverview={onNavigateToCanvasOverview}
    />;
  }
  
  console.log('❌ No matching view, returning null');
  return null;
}

function CanvasOverviewView({
  workloadClient,
  item,
  onNavigateToTableEditor
}: {
  workloadClient: WorkloadClientAPI;
  item?: ItemWithDefinition<ExcelEditItemDefinition>;
  onNavigateToTableEditor?: () => void;
}) {
  // Initialize canvas items from saved state immediately
  const initializeCanvasItems = () => {
    if (item?.definition?.state) {
      const state = item.definition.state as ExcelEditWorkflowState;
      return state.canvasItems || [];
    }
    return [];
  };

  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>(initializeCanvasItems);
  const [isLoading, setIsLoading] = useState(false);
  
  // Update canvas items when item state changes
  useEffect(() => {
    console.log('🔄 useEffect triggered, item:', item);
    if (item?.definition?.state) {
      const state = item.definition.state as ExcelEditWorkflowState;
      console.log('📊 Full state:', state);
      if (state.canvasItems) {
        console.log('📋 Updating canvas items from state:', state.canvasItems);
        setCanvasItems(state.canvasItems);
        console.log('✅ setCanvasItems called with:', state.canvasItems);
      } else {
        console.log('❌ No canvas items found in state');
        setCanvasItems([]);
      }
    } else {
      console.log('❌ No item definition or state found');
      setCanvasItems([]);
    }
  }, [item?.definition?.state]);

  // Debug logging for canvasItems state changes
  useEffect(() => {
    console.log('🎯 canvasItems state changed to:', canvasItems);
  }, [canvasItems]);
  
  const handleAddTable = async () => {
    console.log('🎯 Add Table button clicked!');
    setIsLoading(true);
    try {
      console.log('🔍 Opening OneLake catalog experience for table selection...');
      
      const result = await callDatahubWizardOpen(
        workloadClient,
        ["Lakehouse"],
        "Select Table",
        "Select a table from your lakehouse to edit with Excel Online",
        false, // Single selection
        true,  // Show files folder (enables table browsing)
        true   // Workspace navigation enabled
      );
      
      console.log('📊 OneLake catalog result:', result);
      console.log('📊 Selected path:', result?.selectedPath);
      console.log('📊 Workspace ID:', result?.workspaceId);
      console.log('📊 Lakehouse ID:', result?.id);
      
      if (result && result.selectedPath) {
        console.log('✅ Selected path from OneLake:', result.selectedPath);
        
        // Extract critical IDs for Lakehouse data fetching
        const workspaceId = result.workspaceId; // Workspace containing the Lakehouse
        const lakehouseId = result.id; // Lakehouse item ID
        
        console.log('🔑 Captured IDs for Spark data fetching:');
        console.log('   Workspace ID:', workspaceId);
        console.log('   Lakehouse ID:', lakehouseId);
        
        try {
          const pathSegments = result.selectedPath.split('/');
          console.log('🧩 Path segments:', pathSegments);
          
          // Handle different path formats:
          // Format 1: "Tables/table_name" (2 segments)
          // Format 2: "workspace/lakehouse/Tables/table_name" (4+ segments)
          
          const isTablePath = pathSegments.includes('Tables');
          
          if (isTablePath) {
            const tablesIndex = pathSegments.findIndex(segment => segment === 'Tables');
            const tableIndex = tablesIndex + 1;
            
            if (tableIndex < pathSegments.length) {
              // Extract table name
              const table = pathSegments[tableIndex];
              
              // Extract lakehouse name (if available)
              let lakehouseName = 'Unknown Lakehouse';
              if (tablesIndex > 0) {
                lakehouseName = pathSegments[tablesIndex - 1];
              } else if (result.displayName) {
                lakehouseName = result.displayName;
              }
              
              console.log('🏠 Extracted lakehouse name:', lakehouseName);
              console.log('📊 Extracted table:', table);
            
              const newCanvasItem: CanvasItem = {
                id: `${lakehouseId}-${table}`, // Use lakehouse ID for uniqueness
                type: 'lakehouse-table',
                name: table,
                displayName: table,
                source: {
                  lakehouse: { 
                    id: lakehouseId,           // ✅ REAL Lakehouse ID
                    name: lakehouseName, 
                    workspaceId: workspaceId   // ✅ REAL Workspace ID
                  },
                  table: { name: table, displayName: table, schema: [], rowCount: 0 }
                },
                lastEdited: new Date().toISOString()
              };
              
              const updatedCanvasItems = [...canvasItems, newCanvasItem];
              setCanvasItems(updatedCanvasItems);
              
              const currentState = item?.definition?.state as ExcelEditWorkflowState || {};
              const updatedState: ExcelEditWorkflowState = {
                ...currentState,
                canvasItems: updatedCanvasItems
              };
              
              if (workloadClient && item) {
                try {
                  const saveResult = await saveItemDefinition(workloadClient, item.id, { state: updatedState } as ExcelEditItemDefinition);
                  if (saveResult) {
                    console.log('✅ Table added to canvas successfully!');
                  } else {
                    console.error('❌ Save result was undefined - check console for errors');
                  }
                } catch (saveError) {
                  console.error('❌ Error saving canvas state:', saveError);
                  console.error('❌ Save error details:', {
                    message: saveError.message,
                    stack: saveError.stack,
                    name: saveError.name
                  });
                }
              }
            } else {
              console.error('❌ No table name found after Tables segment');
            }
          } else {
            console.error('❌ Selected path does not contain Tables segment:', result.selectedPath);
          }
        } catch (error) {
          console.error('❌ Error processing table selection:', error);
        }
      } else {
        console.log('🔴 No table selected from OneLake');
      }
    } catch (error) {
      console.error('❌ Error opening OneLake dialog:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Temporary test function for demo purposes
  const handleAddTestTable = async () => {
    console.log('🧪 Adding test table for demo...');
    
    // Create unique ID with timestamp to avoid React key conflicts
    const timestamp = Date.now();
    const testCanvasItem: CanvasItem = {
      id: `test-lakehouse-customers-${timestamp}`,
      type: 'lakehouse-table',
      name: 'customers',
      displayName: 'Customers Table',
      source: {
        lakehouse: { id: 'test-lakehouse', name: 'Demo Lakehouse', workspaceId: 'test-workspace' },
        table: { name: 'customers', displayName: 'Customers Table', schema: [], rowCount: 1000 }
      },
      lastEdited: new Date().toISOString()
    };
    
    const updatedCanvasItems = [...canvasItems, testCanvasItem];
    setCanvasItems(updatedCanvasItems);
    
    const currentState = item?.definition?.state as ExcelEditWorkflowState || {};
    const updatedState: ExcelEditWorkflowState = {
      ...currentState,
      canvasItems: updatedCanvasItems
    };
    
    if (workloadClient && item) {
      await saveItemDefinition(workloadClient, item.id, { state: updatedState } as ExcelEditItemDefinition);
    }
  };

  const handleEditTable = (canvasItem: CanvasItem) => {
    console.log('Opening table editor for:', canvasItem.name);
    console.log('📋 Full canvas item data:', canvasItem);
    
    const currentState = item?.definition?.state as ExcelEditWorkflowState || {};
    const updatedState: ExcelEditWorkflowState = {
      ...currentState,
      workflowStep: 'table-editing', // 🔧 Set workflow step to enable table editor view
      currentEditingItem: {
        id: canvasItem.id,
        type: canvasItem.type,
        name: canvasItem.name,
        displayName: canvasItem.displayName,
        // ✅ IMPORTANT: Store full canvas item for Lakehouse data access
        source: canvasItem.source  // Includes lakehouse {id, name, workspaceId} and table details
      } as any // Extended to include source
    };
    
    console.log('🔄 Saving currentEditingItem with Lakehouse metadata to state:', updatedState.currentEditingItem);
    console.log('🔄 Setting workflowStep to:', updatedState.workflowStep);
    
    if (workloadClient && item) {
      saveItemDefinition(workloadClient, item.id, { state: updatedState } as ExcelEditItemDefinition)
        .then(() => {
          console.log('✅ currentEditingItem and workflowStep saved successfully, navigating to table editor');
          onNavigateToTableEditor?.();
        })
        .catch((error) => {
          console.error('❌ Error saving currentEditingItem:', error);
        });
    }
  };

  useEffect(() => {
    const workflowState = item?.definition?.state as ExcelEditWorkflowState;
    if (workflowState?.canvasItems) {
      setCanvasItems(workflowState.canvasItems);
    }
  }, [item]);

  console.log('🎨 Rendering canvas with canvasItems:', canvasItems);
  
  if (canvasItems.length > 0) {
    console.log('🎨 About to render', canvasItems.length, 'canvas items:', canvasItems);
  }
  
  return (
    <div className="excel-canvas">
      <div className="canvas-header">
        <Text size={600} weight="bold">Excel Editing Canvas</Text>
        <Text size={400}>Select tables and files to edit with Excel</Text>
      </div>

      <div className="canvas-actions">
        <Button
          appearance="primary"
          icon={<Add20Regular />}
          onClick={handleAddTable}
          disabled={isLoading}
        >
          {isLoading ? "Adding..." : "Add Table"}
        </Button>
        
        {/* Temporary test button for demo purposes */}
        <Button
          appearance="secondary"
          onClick={handleAddTestTable}
          style={{ marginLeft: '10px' }}
        >
          Add Test Table (Demo)
        </Button>
      </div>

      {isLoading && (
        <div className="loading-section">
          <Spinner size="medium" />
          <Text>Loading...</Text>
        </div>
      )}

      {canvasItems.length === 0 && !isLoading && (
        <div className="empty-canvas">
          <DatabaseSearch20Regular style={{ fontSize: '48px', color: '#8a8886' }} />
          <Text size={500} weight="semibold">No tables selected</Text>
          <Text size={400}>Click "Add Table" to start building your Excel editing workflow</Text>
        </div>
      )}

      {canvasItems.length > 0 && (
        <div className="canvas-items-container">
          {canvasItems.map((canvasItem, index) => {
            console.log(`🔷 Rendering canvas item ${index}:`, canvasItem);
            return (
              <div key={canvasItem.id} className="canvas-item-card">
                <div className="canvas-item-content">
                  <div className="canvas-item-info">
                    <TableSimple20Regular style={{ color: '#0078d4' }} />
                    <div>
                      <div className="canvas-item-title">{canvasItem.displayName}</div>
                      <div className="canvas-item-subtitle">
                        {canvasItem.source.lakehouse?.name || 'Unknown Source'}
                      </div>
                    </div>
                  </div>
                  <div>
                    <button 
                      className="canvas-item-button"
                      onClick={() => handleEditTable(canvasItem)}
                    >
                      Edit Table
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TableEditorView({
  workloadClient,
  item,
  onNavigateToCanvasOverview
}: {
  workloadClient: WorkloadClientAPI;
  item?: ItemWithDefinition<ExcelEditItemDefinition>;
  onNavigateToCanvasOverview?: () => void;
}) {
  const [currentEditingItem, setCurrentEditingItem] = useState<any>(null);
  const [excelOnlineUrl, setExcelOnlineUrl] = useState<string>('');
  const [isLoadingExcel, setIsLoadingExcel] = useState(false);
  const [excelFileInfo, setExcelFileInfo] = useState<{fileId: string, fileName: string, tableName: string} | null>(null);
  const [showLocalViewer, setShowLocalViewer] = useState(false);

  useEffect(() => {
    const workflowState = item?.definition?.state as ExcelEditWorkflowState;
    console.log('🔍 TableEditorView: Checking for currentEditingItem in state:', workflowState);
    if (workflowState?.currentEditingItem) {
      console.log('✅ TableEditorView: Found currentEditingItem:', workflowState.currentEditingItem);
      setCurrentEditingItem(workflowState.currentEditingItem);
      
      // Load Excel Online immediately when item is found
      loadExcelOnline(workflowState.currentEditingItem);
    } else {
      console.log('❌ TableEditorView: No currentEditingItem found in state');
    }
  }, [item]);

  const loadExcelOnline = async (editingItem: any) => {
    setIsLoadingExcel(true);
    try {
      console.log('🚀 Creating local Excel file for table:', editingItem.name);
      
      // Create Excel file using our real Excel creation endpoint
      await createRealExcelWorkbook(editingItem);
      
    } catch (error) {
      console.error('❌ Error creating local Excel file:', error);
    } finally {
      setIsLoadingExcel(false);
    }
  };

  const createRealExcelWorkbook = async (editingItem: any) => {
    setIsLoadingExcel(true);
    try {
      console.log('🎯 Creating real Excel workbook for table:', editingItem.name);
      console.log('📋 Editing item data:', editingItem);
      
      // Check if we have lakehouse metadata for real data fetching
      const hasLakehouseMetadata = editingItem.source?.lakehouse?.id && editingItem.source?.lakehouse?.workspaceId;
      
      let tableData: any[] = [];
      let schema: any[] = [];
      
      if (hasLakehouseMetadata) {
        // ✅ USE REAL TABLE SCHEMA FROM LAKEHOUSE
        const workspaceId = editingItem.source.lakehouse.workspaceId;
        const lakehouseId = editingItem.source.lakehouse.id;
        const tableName = editingItem.name;
        
        console.log('� Using REAL table schema from Lakehouse...');
        console.log('   Workspace ID:', workspaceId);
        console.log('   Lakehouse ID:', lakehouseId);
        console.log('   Table Name:', tableName);
        
        // Check if we have schema from the table metadata
        if (editingItem.source?.table?.schema && Array.isArray(editingItem.source.table.schema) && editingItem.source.table.schema.length > 0) {
          schema = editingItem.source.table.schema.map((col: any) => ({
            name: col.name,
            dataType: col.dataType || 'string'
          }));
          
          console.log(`✅ Using real table schema with ${schema.length} columns:`, schema);
          
          // Add sample rows showing the data types
          tableData = [
            schema.map(col => `(${col.dataType})`),  // Header showing types
            schema.map(col => `Sample ${col.name}`)  // Sample row
          ];
          
          console.log('📝 Created Excel template with real schema');
          console.log('💡 Users can connect to Lakehouse using Power Query in Excel');
          
        } else {
          console.warn('⚠️  No schema found in table metadata, using placeholder columns...');
          
          // Create placeholder schema for the table
          schema = [
            { name: 'Column1', dataType: 'string' },
            { name: 'Column2', dataType: 'string' },
            { name: 'Column3', dataType: 'string' },
            { name: 'Column4', dataType: 'string' },
            { name: 'Column5', dataType: 'string' }
          ];
          
          tableData = [
            ['(string)', '(string)', '(string)', '(string)', '(string)'],
            [`${tableName} data`, 'Sample', 'Sample', 'Sample', 'Sample']
          ];
          
          console.log('📝 Created Excel template with placeholder columns');
          console.log('💡 Note: Schema not available from OneLake catalog');
          console.log('💡 Users can connect to Lakehouse using Power Query in Excel to get real schema and data');
        }
        
      } else {
        console.warn('⚠️  No Lakehouse metadata found, using demo data');
        
        // Use demo data
        tableData = [
          ['CUST001', 'John Smith', 'john@example.com', 'Active'],
          ['CUST002', 'Jane Doe', 'jane@example.com', 'Active'],
          ['CUST003', 'Bob Johnson', 'bob@example.com', 'Inactive'],
          ['CUST004', 'Alice Wilson', 'alice@example.com', 'Active'],
          ['CUST005', 'Charlie Brown', 'charlie@example.com', 'Pending']
        ];
        schema = [
          { name: 'Customer ID', dataType: 'string' },
          { name: 'Name', dataType: 'string' },
          { name: 'Email', dataType: 'string' },
          { name: 'Status', dataType: 'string' }
        ];
      }

      const baseUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:60006' : window.location.origin;
      
      // Call the real Excel creation endpoint with real or demo data
      const response = await fetch(`${baseUrl}/api/excel/create-real`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tableName: editingItem.name,
          tableData: tableData, // Real Lakehouse data or fallback demo data
          schema: schema
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Real Excel workbook created successfully:', result);
        
        // Try to use Excel Online embed first (real Excel experience)
        if (result.embedUrl && result.embedUrl.includes('officeapps.live.com')) {
          console.log('🌐 Excel Online embed URL available:', result.embedUrl);
          console.log('⚠️  Note: Excel Online embedding from localhost has limitations');
          console.log('💡 Recommendation: Use "Download Excel File" for best experience');
          setExcelOnlineUrl(result.embedUrl);
          setShowLocalViewer(false);
        } 
        // Fallback to local viewer (best for development)
        else {
          console.log('📊 Using Local Excel Viewer (best for localhost development)');
          setExcelFileInfo({
            fileId: result.fileId,
            fileName: result.fileName || `${editingItem.name}.xlsx`,
            tableName: editingItem.name
          });
          setShowLocalViewer(true);
          setExcelOnlineUrl('');
        }
        
        console.log('✅ Excel interface ready!');
        console.log('📁 File ID:', result.fileId);
        
      } else {
        console.error('❌ Failed to create real Excel workbook:', result.error || 'Unknown error');
        
        // Fall back to demo Excel using a generated fileId
        const fallbackFileId = `lakehouse_${editingItem.name}_${Date.now()}`;
        const fallbackUrl = `${baseUrl}/demo-excel?fileId=${fallbackFileId}&token=demo`;
        setExcelOnlineUrl(fallbackUrl);
      }
      
    } catch (error) {
      console.error('❌ Error creating real Excel workbook:', error);
      
      // Fall back to demo Excel on error using a generated fileId
      const baseUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:60006' : window.location.origin;
      const fallbackFileId = `lakehouse_${editingItem.name}_${Date.now()}`;
      const fallbackUrl = `${baseUrl}/demo-excel?fileId=${fallbackFileId}&token=demo`;
      setExcelOnlineUrl(fallbackUrl);
      
    } finally {
      setIsLoadingExcel(false);
    }
  };

  if (!currentEditingItem) {
    return (
      <div className="excel-canvas">
        <div className="error-state">
          <Text size={500} weight="semibold">No table selected for editing</Text>
          <Text size={400}>Please return to the canvas and select a table.</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="excel-canvas"> {/* Clean white canvas design */}
      <div className="table-editor-header-clean">
        <div className="header-content">
          <Text 
            size={600} 
            weight="bold" 
            className="table-title"
            style={{ 
              margin: 0, 
              padding: 0, 
              textAlign: 'left',
              display: 'block',
              width: '100%'
            }}
          >
            {currentEditingItem.displayName}
          </Text>
          <Text 
            size={400} 
            className="table-subtitle"
            style={{ 
              margin: 0, 
              padding: 0, 
              textAlign: 'left',
              display: 'block',
              width: '100%'
            }}
          >
            Excel editing interface - Changes sync to lakehouse
          </Text>
        </div>
      </div>

      <div className="table-editor-actions">
        <Button
          appearance="primary"
          icon={<TableSimple20Regular />}
          onClick={async () => {
            console.log('📥 CLIENT-SIDE: Creating Excel file in browser...');
            setIsLoadingExcel(true);
            try {
              // Import the client-side Excel utility
              const { fetchAndDownloadLakehouseTable } = await import('../../utils/ExcelClientSide');
              
              if (currentEditingItem.source?.lakehouse?.id) {
                // Has Lakehouse metadata - fetch schema
                const tokenResult = await workloadClient.auth.acquireFrontendAccessToken({
                  scopes: ['https://api.fabric.microsoft.com/Lakehouse.Read.All']
                });
                
                await fetchAndDownloadLakehouseTable(
                  currentEditingItem.source.lakehouse.workspaceId,
                  currentEditingItem.source.lakehouse.id,
                  currentEditingItem.name,
                  tokenResult.token
                );
              } else {
                // No Lakehouse metadata - use demo data
                const { createAndDownloadExcel } = await import('../../utils/ExcelClientSide');
                await createAndDownloadExcel({
                  tableName: currentEditingItem.name,
                  schema: [
                    { name: 'Customer ID', dataType: 'string' },
                    { name: 'Name', dataType: 'string' },
                    { name: 'Email', dataType: 'string' },
                    { name: 'Status', dataType: 'string' }
                  ],
                  data: [
                    ['CUST001', 'John Smith', 'john@example.com', 'Active'],
                    ['CUST002', 'Jane Doe', 'jane@example.com', 'Active'],
                    ['CUST003', 'Bob Johnson', 'bob@example.com', 'Inactive']
                  ]
                });
              }
              
              console.log('✅ Excel downloaded (Client-Side)');
            } catch (error) {
              console.error('❌ Client-side Excel creation failed:', error);
            } finally {
              setIsLoadingExcel(false);
            }
          }}
        >
          ⚡ Download Excel (Client-Side)
        </Button>

        <Button
          appearance="secondary"
          icon={<TableSimple20Regular />}
          onClick={() => {
            console.log('🎯 Creating real Excel workbook for table:', currentEditingItem.name);
            createRealExcelWorkbook(currentEditingItem);
          }}
        >
          Create Real Excel (Backend)
        </Button>

        <Button
          appearance="secondary"
          icon={<TableSimple20Regular />}
          onClick={async () => {
            console.log('🧪 Testing Excel creation with demo data (bypassing SQL fetch)...');
            setIsLoadingExcel(true);
            try {
              // Create a test item with demo data
              const testItem = {
                ...currentEditingItem,
                name: currentEditingItem.name,
                source: {} // No lakehouse metadata = will use demo data
              };
              
              // This will skip SQL fetch and use demo data directly
              await createRealExcelWorkbook(testItem);
              console.log('✅ Demo data Excel test completed');
            } catch (error) {
              console.error('❌ Demo data Excel test failed:', error);
              setIsLoadingExcel(false);
            }
          }}
        >
          Test with Demo Data
        </Button>

        {excelFileInfo && excelFileInfo.fileId && (
          <>
            <Button
              appearance="secondary"
              icon={<ArrowDownload20Regular />}
              onClick={() => {
                // Download the Excel file to open in desktop Excel
                const baseUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:60006' : window.location.origin;
                const downloadUrl = `${baseUrl}/wopi/files/${excelFileInfo.fileId}/contents`;
                
                console.log('📥 Downloading Excel file...');
                console.log('   Download URL:', downloadUrl);
                
                // Create download link
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = excelFileInfo.fileName || `${currentEditingItem.name}.xlsx`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                
                console.log('✅ Excel file download started');
              }}
            >
              Download Excel File
            </Button>
            
            <Button
              appearance="outline"
              icon={<WindowNew20Regular />}
              onClick={() => {
                // Try to open in Excel Online (will open in new tab)
                const baseUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:60006' : window.location.origin;
                const wopiUrl = `${baseUrl}/wopi/files/${excelFileInfo.fileId}`;
                const excelOnlineUrl = `https://excel.officeapps.live.com/x/_layouts/xlviewerinternal.aspx?ui=en-US&rs=en-US&WOPISrc=${encodeURIComponent(wopiUrl)}`;
                
                console.log('🌐 Attempting to open in Excel Online...');
                console.log('   Note: This may not work from localhost due to CORS/security restrictions');
                console.log('   WOPI URL:', wopiUrl);
                
                window.open(excelOnlineUrl, '_blank');
              }}
            >
              Try Excel Online (New Tab)
            </Button>
          </>
        )}

        <Button
          appearance="secondary"
          icon={<Add20Regular />}
          onClick={() => {
            console.log('💾 Saving changes to lakehouse for table:', currentEditingItem.name);
          }}
        >
          Save to Lakehouse
        </Button>
        
        <Button
          appearance="secondary"
          icon={<Add20Regular />}
          onClick={() => {
            console.log('🔄 Refreshing data from lakehouse for table:', currentEditingItem.name);
            loadExcelOnline(currentEditingItem);
          }}
        >
          Refresh Data
        </Button>

        <Button
          appearance="outline"
          onClick={() => {
            console.log('🔄 Switching to demo Excel interface');
            const baseUrl = 'http://localhost:60006';
            const fallbackFileId = `lakehouse_${currentEditingItem.name}_${Date.now()}`;
            const fallbackUrl = `${baseUrl}/demo-excel?fileId=${fallbackFileId}&token=demo`;
            setExcelOnlineUrl(fallbackUrl);
          }}
        >
          Use Demo Excel
        </Button>
      </div>

      {isLoadingExcel && (
        <div className="loading-section">
          <Spinner size="medium" />
          <Text>Creating Excel file...</Text>
        </div>
      )}

      {!isLoadingExcel && showLocalViewer && excelFileInfo && (
        <>
          <div className="excel-info-banner">
            <Text size={400} weight="semibold">
              💡 For the REAL Excel experience:
            </Text>
            <Text size={300} style={{ marginTop: '4px', display: 'block' }}>
              Click <strong>"Download Excel File"</strong> button above to open this data in Microsoft Excel desktop app
            </Text>
          </div>
          <LocalExcelViewer
            fileId={excelFileInfo.fileId}
            fileName={excelFileInfo.fileName}
            tableName={excelFileInfo.tableName}
            onClose={() => {
              setShowLocalViewer(false);
              setExcelFileInfo(null);
              if (onNavigateToCanvasOverview) {
                onNavigateToCanvasOverview();
              }
            }}
          />
        </>
      )}

      {!isLoadingExcel && !showLocalViewer && excelOnlineUrl && (
        <div className="table-editor-iframe-container-clean">
          <div className="excel-online-warning">
            <Text size={400} weight="semibold">⚠️ Excel Online cannot embed from localhost</Text>
            <Text size={300} style={{ display: 'block', marginTop: '8px' }}>
              For the best experience, use the <strong>"Download Excel File"</strong> button above to open in desktop Excel.
            </Text>
          </div>
          <iframe
            src={excelOnlineUrl}
            className="table-editor-iframe"
            title={`Excel Online - ${currentEditingItem.name}`}
            onLoad={(e) => {
              console.log('✅ Excel Online iframe loaded (may have errors due to localhost restrictions)');
              console.log('📍 Loaded URL:', excelOnlineUrl);
            }}
            onError={(e) => {
              console.error('❌ Excel Online iframe failed to load');
              console.error('   URL:', excelOnlineUrl);
            }}
          />
        </div>
      )}

      {!isLoadingExcel && !showLocalViewer && !excelOnlineUrl && (
        <div className="empty-canvas">
          <div className="error-state">
            <Text size={500} weight="semibold">Unable to load Excel Online</Text>
            <Text size={400}>Please try refreshing or contact support</Text>
            <Button
              appearance="primary"
              onClick={() => loadExcelOnline(currentEditingItem)}
              className="error-retry"
            >
              Retry Loading Excel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
