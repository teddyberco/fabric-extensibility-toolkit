import React, { useState, useEffect, useCallback } from "react";
import {
  Button,
  Text,
  Spinner,
  Tooltip,
} from "@fluentui/react-components";
import {
  DatabaseSearch20Regular,
  TableSimple20Regular,
  Delete20Regular,
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
  onExcelWebUrlChange?: (url: string) => void; // Callback to update Excel URL in parent
  onAddTableCallbackChange?: (callback: (() => Promise<void>) | undefined) => void; // Callback to set Add Table handler
  onItemUpdate?: (updatedItem: ItemWithDefinition<ExcelEditItemDefinition>) => void; // Callback to update item in parent
}

export function ExcelEditItemEditorDefault({
  workloadClient,
  item,
  currentView,
  onNavigateToTableEditor,
  onNavigateToCanvasOverview,
  sparkSessionId,
  onExcelWebUrlChange,
  onAddTableCallbackChange,
  onItemUpdate
}: ExcelEditItemEditorDefaultProps) {
  
  console.log('🎯 ExcelEditItemEditorDefault rendering with currentView:', currentView);
  
  // ✅ Lift canvasItems state to parent component so both views can access it
  const initializeCanvasItems = () => {
    if (item?.definition?.state) {
      const state = item.definition.state as ExcelEditWorkflowState;
      return state.canvasItems || [];
    }
    return [];
  };

  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>(initializeCanvasItems);
  
  // Update canvas items when item state changes
  useEffect(() => {
    console.log('🔄 Parent useEffect: item state changed');
    if (item?.definition?.state) {
      const state = item.definition.state as ExcelEditWorkflowState;
      if (state.canvasItems) {
        console.log('📋 Parent: Updating canvas items from state:', state.canvasItems);
        setCanvasItems(state.canvasItems);
      }
    }
  }, [item?.definition?.state]);
  
  if (currentView === VIEW_TYPES.CANVAS_OVERVIEW) {
    console.log('📋 Rendering CanvasOverviewView');
    return <CanvasOverviewView 
      workloadClient={workloadClient}
      item={item}
      onNavigateToTableEditor={onNavigateToTableEditor}
      canvasItems={canvasItems}
      setCanvasItems={setCanvasItems}
      onAddTableCallbackChange={onAddTableCallbackChange}
      onItemUpdate={onItemUpdate}
    />;
  } else if (currentView === VIEW_TYPES.TABLE_EDITOR) {
    console.log('📊 Rendering TableEditorView');
    return <TableEditorView 
      workloadClient={workloadClient}
      item={item}
      onNavigateToCanvasOverview={onNavigateToCanvasOverview}
      sparkSessionId={sparkSessionId}
      onExcelWebUrlChange={onExcelWebUrlChange}
      onCanvasItemsUpdate={setCanvasItems}
    />;
  }
  
  console.log('❌ No matching view, returning null');
  return null;
}

function CanvasOverviewView({
  workloadClient,
  item,
  onNavigateToTableEditor,
  canvasItems,
  setCanvasItems,
  onAddTableCallbackChange,
  onItemUpdate
}: {
  workloadClient: WorkloadClientAPI;
  item?: ItemWithDefinition<ExcelEditItemDefinition>;
  onNavigateToTableEditor?: () => void;
  canvasItems: CanvasItem[];
  setCanvasItems: (items: CanvasItem[]) => void;
  onAddTableCallbackChange?: (callback: (() => Promise<void>) | undefined) => void;
  onItemUpdate?: (updatedItem: ItemWithDefinition<ExcelEditItemDefinition>) => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  
  // Use useCallback to memoize the handleAddTable function
  const handleAddTable = useCallback(async () => {
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
                  await saveItemDefinition(workloadClient, item.id, { state: updatedState } as ExcelEditItemDefinition);
                  console.log('✅ Table added to canvas and saved to item definition!');
                  
                  // ✅ CRITICAL: Update parent's item state with fresh data
                  if (onItemUpdate) {
                    const updatedItem: ItemWithDefinition<ExcelEditItemDefinition> = {
                      ...item,
                      definition: {
                        ...item.definition,
                        state: updatedState
                      }
                    };
                    onItemUpdate(updatedItem);
                    console.log('✅ Parent item state updated with new canvas items');
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
  }, [workloadClient, canvasItems, setCanvasItems, item, onItemUpdate]);

  // Register the Add Table callback with parent so it can be used in the ribbon
  useEffect(() => {
    if (onAddTableCallbackChange) {
      onAddTableCallbackChange(handleAddTable);
    }
    // Cleanup: unregister callback when component unmounts
    return () => {
      if (onAddTableCallbackChange) {
        onAddTableCallbackChange(undefined);
      }
    };
  }, [onAddTableCallbackChange, handleAddTable]);

  const handleDeleteTable = useCallback(async (canvasItemId: string) => {
    console.log('🗑️ Delete table clicked for:', canvasItemId);
    
    // Remove the item from canvas
    const updatedCanvasItems = canvasItems.filter(item => item.id !== canvasItemId);
    setCanvasItems(updatedCanvasItems);
    
    // Save the updated state
    const currentState = item?.definition?.state as ExcelEditWorkflowState || {};
    const updatedState: ExcelEditWorkflowState = {
      ...currentState,
      canvasItems: updatedCanvasItems
    };
    
    if (workloadClient && item) {
      try {
        await saveItemDefinition(workloadClient, item.id, { state: updatedState } as ExcelEditItemDefinition);
        console.log('✅ Table removed from canvas successfully!');
      } catch (error) {
        console.error('❌ Error saving canvas state after delete:', error);
      }
    }
  }, [canvasItems, setCanvasItems, item, workloadClient]);

  const handleEditTable = (canvasItem: CanvasItem) => {
    console.log('Opening table editor for:', canvasItem.name);
    console.log('📋 Full canvas item data:', canvasItem);
    console.log('🔍 Canvas item Excel URLs:', {
      hasWebUrl: !!(canvasItem as any).excelWebUrl,
      hasEmbedUrl: !!(canvasItem as any).excelEmbedUrl,
      webUrl: (canvasItem as any).excelWebUrl,
      embedUrl: (canvasItem as any).excelEmbedUrl
    });
    
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
        source: canvasItem.source,  // Includes lakehouse {id, name, workspaceId} and table details
        // ✅ IMPORTANT: Preserve Excel URLs if they exist from previous editing
        excelWebUrl: (canvasItem as any).excelWebUrl,
        excelEmbedUrl: (canvasItem as any).excelEmbedUrl
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
      console.log('📥 Loading canvas items from state:', workflowState.canvasItems);
      workflowState.canvasItems.forEach((ci, index) => {
        console.log(`   Item ${index}: ${ci.name}, Excel URLs:`, {
          hasWebUrl: !!(ci as any).excelWebUrl,
          hasEmbedUrl: !!(ci as any).excelEmbedUrl,
          webUrl: (ci as any).excelWebUrl,
          embedUrl: (ci as any).excelEmbedUrl
        });
      });
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
        <Text size={600} weight="bold">Excel Linked Tables</Text>
        <Text size={400}>Select tables and files to edit with Excel</Text>
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
              <div key={canvasItem.id} className="canvas-item-card compact">
                <div className="canvas-item-header">
                  <div className="canvas-item-info-row">
                    <TableSimple20Regular className="table-icon" />
                    <div className="canvas-item-text">
                      <Text weight="semibold" size={400}>{canvasItem.displayName}</Text>
                      <Text size={300} className="canvas-item-source">
                        {canvasItem.source.lakehouse?.name || 'Unknown Source'}
                      </Text>
                    </div>
                  </div>
                  <div className="canvas-item-actions-row">
                    <Button
                      appearance="primary"
                      size="small"
                      onClick={() => handleEditTable(canvasItem)}
                    >
                      Edit
                    </Button>
                    <Tooltip content="Remove table" relationship="label">
                      <Button
                        appearance="subtle"
                        size="small"
                        icon={<Delete20Regular />}
                        onClick={() => handleDeleteTable(canvasItem.id)}
                      />
                    </Tooltip>
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
  sparkSessionId,
  onExcelWebUrlChange,
  onCanvasItemsUpdate
}: {
  workloadClient: WorkloadClientAPI;
  item?: ItemWithDefinition<ExcelEditItemDefinition>;
  onNavigateToCanvasOverview?: () => void;
  sparkSessionId?: string | null;
  onExcelWebUrlChange?: (url: string) => void;
  onCanvasItemsUpdate?: (items: CanvasItem[]) => void;
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
      console.log('🔍 Excel URLs check:', {
        hasWebUrl: !!workflowState.currentEditingItem.excelWebUrl,
        hasEmbedUrl: !!workflowState.currentEditingItem.excelEmbedUrl,
        webUrl: workflowState.currentEditingItem.excelWebUrl,
        embedUrl: workflowState.currentEditingItem.excelEmbedUrl
      });
      setCurrentEditingItem(workflowState.currentEditingItem);
      
      // Check if we already have a saved Excel URL
      if (workflowState.currentEditingItem.excelWebUrl && workflowState.currentEditingItem.excelEmbedUrl) {
        console.log('📋 Found existing Excel URLs in state, loading preview...');
        setExcelOnlineUrl(workflowState.currentEditingItem.excelEmbedUrl);
        
        // Notify parent about the URL
        if (onExcelWebUrlChange) {
          onExcelWebUrlChange(workflowState.currentEditingItem.excelWebUrl);
        }
      } else {
        console.log('� No Excel file created yet - showing empty state');
        // Don't auto-create, let user click button to create
      }
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
      
      // Step 4: Save URLs to item definition (both currentEditingItem AND canvasItems)
      console.log('💾 Saving Excel URLs to item definition...');
      const workflowState = item?.definition?.state as ExcelEditWorkflowState;
      if (workflowState && workflowState.currentEditingItem) {
        // Update the currentEditingItem with Excel URLs
        const updatedCurrentEditingItem = {
          ...workflowState.currentEditingItem,
          excelWebUrl: uploadResult.webUrl,
          excelEmbedUrl: uploadResult.embedUrl || uploadResult.webUrl
        };
        
        // Also update the canvas item to persist URLs for next time
        console.log('🔍 Looking for canvas item to update with ID:', editingItem.id);
        console.log('🔍 Current canvasItems:', workflowState.canvasItems);
        const updatedCanvasItems = (workflowState.canvasItems || []).map(canvasItem => {
          console.log('  🔍 Comparing:', canvasItem.id, '===', editingItem.id, '?', canvasItem.id === editingItem.id);
          if (canvasItem.id === editingItem.id) {
            console.log('  ✅ MATCH FOUND! Updating canvas item with Excel URLs');
            return {
              ...canvasItem,
              excelWebUrl: uploadResult.webUrl,
              excelEmbedUrl: uploadResult.embedUrl || uploadResult.webUrl
            };
          }
          return canvasItem;
        });
        
        console.log('🔍 Updated canvasItems:', updatedCanvasItems);
        
        // ✅ CRITICAL: Update local React state with the new canvas items containing Excel URLs
        if (onCanvasItemsUpdate) {
          onCanvasItemsUpdate(updatedCanvasItems);
        }
        
        const updatedState: ExcelEditWorkflowState = {
          ...workflowState,
          currentEditingItem: updatedCurrentEditingItem,
          canvasItems: updatedCanvasItems
        };
        
        console.log('💾 About to save to item definition with format:', {
          hasStateWrapper: true,
          canvasItemsCount: updatedCanvasItems.length,
          firstCanvasItemHasUrls: !!(updatedCanvasItems[0] as any)?.excelWebUrl
        });
        
        // Save to item definition
        const savePayload = { state: updatedState } as ExcelEditItemDefinition;
        console.log('💾 Save payload structure:', Object.keys(savePayload));
        await saveItemDefinition(workloadClient, item?.id || '', savePayload);
        console.log('✅ Excel URLs saved to both currentEditingItem and canvasItems');
      }
      
      // Notify parent component about the URL change (for ribbon button)
      if (onExcelWebUrlChange) {
        onExcelWebUrlChange(uploadResult.webUrl);
      }
      
      // Step 5: Show embedded Excel preview
      if (uploadResult.embedUrl) {
        console.log('📊 Setting embedded Excel viewer URL...');
        // Set the embed URL to display in the iframe
        setExcelOnlineUrl(uploadResult.embedUrl);
      } else {
        console.log('⚠️ No embed URL, falling back to web URL...');
        // Fallback: use web URL (may not embed properly but better than nothing)
        setExcelOnlineUrl(uploadResult.webUrl);
      }
      
      // Show success notification with instruction
      await callNotificationOpen(
        workloadClient,
        'Excel file created and linked!',
        `${fileName} uploaded to OneDrive and automatically saved to this item. Use "Open in Excel Online" button for full editing.`,
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
        </div>
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
        <>
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
        </>
      )}

      {!isLoadingExcel && !showLocalViewer && !excelOnlineUrl && (
        <div className="empty-canvas">
          <div className="error-state">
            <Button
              appearance="primary"
              onClick={() => loadExcelOnline(currentEditingItem)}
              className="error-retry"
              icon={<TableSimple20Regular />}
            >
              Create Excel Online File
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
