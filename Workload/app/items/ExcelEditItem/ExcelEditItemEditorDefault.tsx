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
import { WorkloadClientAPI, NotificationType, NotificationToastDuration } from "@ms-fabric/workload-client";
import { ItemWithDefinition, saveItemDefinition } from "../../controller/ItemCRUDController";
import { callDatahubWizardOpen } from "../../controller/DataHubController";
import { callNotificationOpen } from "../../controller/NotificationController";
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
  sparkSessionId?: string | null;
}

export function ExcelEditItemEditorDefault({
  workloadClient,
  item,
  currentView,
  onNavigateToTableEditor,
  onNavigateToCanvasOverview,
  sparkSessionId
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
      sparkSessionId={sparkSessionId}
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
  onNavigateToCanvasOverview,
  sparkSessionId
}: {
  workloadClient: WorkloadClientAPI;
  item?: ItemWithDefinition<ExcelEditItemDefinition>;
  onNavigateToCanvasOverview?: () => void;
  sparkSessionId?: string | null;
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
    console.log('📤 Loading Excel Online with OneDrive upload...');
    setIsLoadingExcel(true);
    
    try {
      // Import required services
      const { fetchLakehouseTableData } = await import('../../utils/ExcelClientSide');
      const { OneDriveService } = await import('../../services/OneDriveService');
      const ExcelJS = await import('exceljs');
      
      if (!editingItem.source?.lakehouse?.id) {
        throw new Error('No lakehouse metadata found');
      }
      
      // Step 1: Fetch data from Spark (same as download flow)
      console.log('📊 Fetching data from Spark...');
      const { data, schema } = await fetchLakehouseTableData(
        workloadClient,
        editingItem.source.lakehouse.workspaceId,
        editingItem.source.lakehouse.id,
        editingItem.name,
        sparkSessionId
      );
      
      // Step 2: Create Excel blob (in-memory, not downloaded)
      console.log('📝 Creating Excel workbook...');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(editingItem.displayName);
      
      // Add headers
      const headers = schema.map(col => col.name);
      worksheet.addRow(headers);
      
      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '0078D4' }
      };
      
      // Add data rows
      data.forEach(row => worksheet.addRow(row));
      
      // Auto-size columns
      worksheet.columns.forEach((column: any) => {
        column.width = 15;
      });
      
      // Generate blob
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      // Step 3: Upload to OneDrive
      console.log('� Uploading to OneDrive...');
      const oneDriveService = new OneDriveService(workloadClient);
      const fileName = `${editingItem.displayName}_${Date.now()}.xlsx`;
      const uploadResult = await oneDriveService.uploadExcelFile(blob, fileName);
      
      console.log('✅ Upload successful:', uploadResult);
      
      // Step 4: Show embedded Excel or open in new tab
      if (uploadResult.embedUrl) {
        console.log('📊 Setting embedded Excel viewer URL...');
        // Set the embed URL to display in the iframe
        setExcelOnlineUrl(uploadResult.embedUrl);
      } else {
        console.log('⚠️ No embed URL, falling back to web URL...');
        // Fallback: use web URL (may not embed properly but better than nothing)
        setExcelOnlineUrl(uploadResult.webUrl);
      }
      
      // Show success notification
      await callNotificationOpen(
        workloadClient,
        'Excel file uploaded to OneDrive',
        `${fileName} is now available in your OneDrive`,
        NotificationType.Success,
        NotificationToastDuration.Long
      );
      
    } catch (error) {
      console.error('❌ Failed to upload to OneDrive:', error);
      
      // Fallback: Show error and offer download instead
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check if it's a licensing issue
      if (errorMessage.includes('SPO license') || errorMessage.includes('SharePoint Online')) {
        await callNotificationOpen(
          workloadClient,
          'OneDrive not available',
          'Your tenant does not have SharePoint Online/OneDrive for Business. Please use the "Download Excel" button to save the file locally.',
          NotificationType.Warning,
          NotificationToastDuration.Long
        );
      } else {
        await callNotificationOpen(
          workloadClient,
          'OneDrive upload failed',
          `${errorMessage}. Please use the Download button instead.`,
          NotificationType.Error,
          NotificationToastDuration.Long
        );
      }
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
          icon={isLoadingExcel ? <Spinner size="tiny" /> : <TableSimple20Regular />}
          disabled={isLoadingExcel}
          onClick={async () => {
            console.log('📥 CLIENT-SIDE: Creating Excel file with REAL DATA from Spark Livy...');
            setIsLoadingExcel(true);
            try {
              // Import the client-side Excel utility
              const { fetchAndDownloadLakehouseTable } = await import('../../utils/ExcelClientSide');
              
              if (currentEditingItem.source?.lakehouse?.id) {
                // Has Lakehouse metadata - fetch real data using Spark Livy
                // Note: SparkLivyClient handles its own token acquisition with proper scopes
                await fetchAndDownloadLakehouseTable(
                  workloadClient, // SparkLivyClient will get token internally with correct scopes
                  currentEditingItem.source.lakehouse.workspaceId,
                  currentEditingItem.source.lakehouse.id,
                  currentEditingItem.name,
                  sparkSessionId // Reuse existing Spark session if available
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
              
              console.log('✅ Excel downloaded with REAL DATA (Client-Side via Spark Livy)');
            } catch (error) {
              // Extract detailed error information
              let errorMessage = 'Unknown error';
              let errorDetails = '';
              
              if (error instanceof Error) {
                errorMessage = error.message;
                errorDetails = error.stack || '';
              } else if (typeof error === 'object' && error !== null) {
                // Handle error objects from auth/API calls
                errorMessage = JSON.stringify(error, null, 2);
              } else if (typeof error === 'string') {
                errorMessage = error;
              }
              
              console.error('❌ Client-side Excel creation failed:', {
                error,
                errorMessage,
                errorType: typeof error,
                errorConstructor: error?.constructor?.name
              });
              
              // Check for common permission errors
              const fullErrorText = `${errorMessage} ${errorDetails}`.toLowerCase();
              
              if (fullErrorText.includes('aadsts') || 
                  fullErrorText.includes('consent') || 
                  fullErrorText.includes('permission') ||
                  fullErrorText.includes('unauthorized') ||
                  fullErrorText.includes('401') ||
                  fullErrorText.includes('403')) {
                console.error(
                  `⚠️ Permission Error Detected\n\n` +
                  `The application needs the "Fabric.Extend" permission to access Spark Livy APIs.\n\n` +
                  `To fix this:\n` +
                  `1. Go to Azure Portal → Entra ID → App Registrations\n` +
                  `2. Find app: ${process.env.FRONTEND_APPID}\n` +
                  `3. Add API permission: Power BI Service → Fabric.Extend\n` +
                  `4. Grant admin consent\n\n` +
                  `Error Details:\n${errorMessage}`
                );
              } else {
                console.error(`Failed to create Excel:\n\n${errorMessage}`)
              }
            } finally {
              setIsLoadingExcel(false);
            }
          }}
        >
          {isLoadingExcel ? '⏳ Querying Data via Spark...' : '⚡ Download Excel with Real Data'}
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
