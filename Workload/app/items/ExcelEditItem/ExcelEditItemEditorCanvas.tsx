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
} from "@fluentui/react-components";
import {
  DatabaseSearch20Regular,
  TableSimple20Regular,
  CloudDatabase20Regular,
  History20Regular,
  Edit20Regular,
  Add20Regular,
} from "@fluentui/react-icons";
import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { ItemWithDefinition, saveItemDefinition } from "../../controller/ItemCRUDController";
import { callDatahubWizardOpen } from "../../controller/DataHubController";
import { ExcelEditItemDefinition, ExcelEditWorkflowState, CurrentView, VIEW_TYPES } from "./ExcelEditItemModel";
import "../../styles.scss";

// Types for the canvas-centric Excel editing workflow
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

/**
 * Canvas-Centric Excel Editing Experience
 * L1: Canvas Overview showing all tables/sources
 * L2: Table Editor for detailed editing
 */
export function ExcelEditItemEditorDefault({
  workloadClient,
  item,
  currentView,
  onNavigateToTableEditor,
  onNavigateToCanvasOverview
}: ExcelEditItemEditorDefaultProps) {
  
  // Render the appropriate view based on currentView
  if (currentView === VIEW_TYPES.CANVAS_OVERVIEW) {
    return <CanvasOverviewView 
      workloadClient={workloadClient}
      item={item}
      onNavigateToTableEditor={onNavigateToTableEditor}
    />;
  } else if (currentView === VIEW_TYPES.TABLE_EDITOR) {
    return <TableEditorView 
      workloadClient={workloadClient}
      item={item}
      onNavigateToCanvasOverview={onNavigateToCanvasOverview}
    />;
  }
  
  return null;
}

/**
 * Canvas Overview (L1) - Shows all selected tables/sources as cards
 */
function CanvasOverviewView({
  workloadClient,
  item,
  onNavigateToTableEditor
}: {
  workloadClient: WorkloadClientAPI;
  item?: ItemWithDefinition<ExcelEditItemDefinition>;
  onNavigateToTableEditor?: () => void;
}) {
  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showTableSelector, setShowTableSelector] = useState(false);
  const [selectedLakehouse, setSelectedLakehouse] = useState<any>(null);
  const [availableTables, setAvailableTables] = useState<any[]>([]);
  
  // Load canvas items from saved state
  useEffect(() => {
    const workflowState = item?.definition?.state as ExcelEditWorkflowState;
    console.log('🎨 Canvas component - checking workflow state:', workflowState);
    console.log('🎨 Canvas component - canvasItems:', workflowState?.canvasItems);
    console.log('🎨 Canvas component - selectedLakehouse:', workflowState?.selectedLakehouse);
    console.log('🎨 Canvas component - selectedTable:', workflowState?.selectedTable);
    
    // Check if we have a selected table that needs to be converted to canvas item
    if (workflowState?.selectedLakehouse && workflowState?.selectedTable) {
      // Check if this table is already in canvasItems
      const existingItem = workflowState?.canvasItems?.find(
        item => item.id === `${workflowState.selectedLakehouse.id}-${workflowState.selectedTable.name}`
      );
      
      if (!existingItem) {
        console.log('🔄 Converting selectedTable to canvas item and adding to existing items');
        const legacyItem: CanvasItem = {
          id: `${workflowState.selectedLakehouse.id}-${workflowState.selectedTable.name}`,
          type: 'lakehouse-table',
          name: workflowState.selectedTable.name,
          displayName: workflowState.selectedTable.displayName,
          source: {
            lakehouse: workflowState.selectedLakehouse,
            table: workflowState.selectedTable
          }
        };
        console.log('✅ Created canvas item from selectedTable:', legacyItem);
        
        // Add to existing canvas items (or create new array if none exist)
        const updatedItems = [...(workflowState?.canvasItems || []), legacyItem];
        setCanvasItems(updatedItems);
        
        // Save the updated canvas items back to state (remove legacy selectedTable)
        const updatedState: ExcelEditWorkflowState = {
          ...workflowState,
          canvasItems: updatedItems,
          selectedTable: undefined, // Remove legacy field
          selectedLakehouse: undefined // Remove legacy field
        };
        
        saveItemDefinition(workloadClient, item!.id, { state: updatedState });
        console.log('✅ Converted legacy state to canvas items');
      } else {
        console.log('✅ Table already exists in canvasItems');
        setCanvasItems(workflowState.canvasItems || []);
      }
    } else if (workflowState?.canvasItems) {
      console.log('✅ Using existing canvasItems');
      setCanvasItems(workflowState.canvasItems);
    } else {
      console.log('📝 No items found - showing empty canvas');
      setCanvasItems([]);
    }
  }, [item]);

  const handleAddTable = async () => {
    setIsLoading(true);
    try {
      console.log('🔍 Opening DataHub wizard for lakehouse selection...');
      const result = await callDatahubWizardOpen(
        workloadClient, 
        ["Lakehouse"],
        "Select Lakehouse",
        "Choose a lakehouse to browse tables from",
        false, // Single selection
        false, // Don't show files folder
        true   // Workspace navigation enabled
      );
      
      console.log('📊 DataHub wizard result:', result);
      
      if (result) {
        // Store the selected lakehouse
        const lakehouseInfo = {
          id: result.id,
          name: result.displayName,
          workspaceId: result.workspaceId
        };
        
        setSelectedLakehouse(lakehouseInfo);
        
        // TODO: Fetch tables from the lakehouse
        // For now, simulate some tables
        const mockTables = [
          {
            name: "sales_data",
            displayName: "Sales Data",
            rowCount: 150000,
            schema: [
              { name: "order_id", dataType: "string" },
              { name: "customer_id", dataType: "string" },
              { name: "amount", dataType: "decimal" },
              { name: "order_date", dataType: "datetime" }
            ]
          },
          {
            name: "customer_info",
            displayName: "Customer Information", 
            rowCount: 25000,
            schema: [
              { name: "customer_id", dataType: "string" },
              { name: "name", dataType: "string" },
              { name: "email", dataType: "string" },
              { name: "registration_date", dataType: "datetime" }
            ]
          }
        ];
        
        setAvailableTables(mockTables);
        setShowTableSelector(true);
      }
    } catch (error) {
      console.error('❌ Error opening DataHub wizard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTableSelection = async (table: any) => {
    try {
      if (!selectedLakehouse) {
        console.error('❌ No lakehouse selected');
        return;
      }

      const newItem: CanvasItem = {
        id: `${selectedLakehouse.id}-${table.name}`,
        type: 'lakehouse-table',
        name: table.name,
        displayName: table.displayName,
        source: {
          lakehouse: selectedLakehouse,
          table: table
        },
        lastEdited: new Date().toISOString()
      };

      const updatedItems = [...canvasItems, newItem];
      setCanvasItems(updatedItems);

      // Save to item definition
      const currentState = item?.definition?.state as ExcelEditWorkflowState || {};
      const updatedState: ExcelEditWorkflowState = {
        ...currentState,
        canvasItems: updatedItems
      };

      if (item) {
        await saveItemDefinition(workloadClient, item.id, {
          ...item.definition,
          state: updatedState
        });
      }

      // Close the table selector
      setShowTableSelector(false);
      setSelectedLakehouse(null);
      setAvailableTables([]);

      console.log('✅ Added table to canvas:', newItem);
    } catch (error) {
      console.error('❌ Error adding table to canvas:', error);
    }
  };

  const handleEditTable = async (canvasItem: CanvasItem) => {
    console.log('🎯 Edit table clicked for:', canvasItem.displayName);
    
    // Set the current editing item in state for L2 navigation
    const workflowState = item?.definition?.state as ExcelEditWorkflowState ?? { canvasItems: [] };
    const updatedState: ExcelEditWorkflowState = {
      ...workflowState,
      currentEditingItem: {
        id: canvasItem.id,
        type: canvasItem.type,
        name: canvasItem.name,
        displayName: canvasItem.displayName
      },
      workflowStep: 'table-editing' // Navigate to L2
    };

    console.log('💾 Saving editing context:', updatedState);

    try {
      await saveItemDefinition<ExcelEditItemDefinition>(
        workloadClient,
        item!.id,
        { state: updatedState }
      );
      
      console.log('✅ Editing context saved, navigating to table editor (L2)');
      
      // Give a moment for state to propagate
      setTimeout(() => {
        console.log('🧭 Navigating to table editor...');
        onNavigateToTableEditor?.();
      }, 100);
    } catch (error) {
      console.error('Failed to save editing context:', error);
    }
  };

  return (
    <div className="canvas-overview">
      {/* Header */}
      <div className="canvas-header">
        <Text size={600} weight="semibold">Excel Data Sources</Text>
        <Text size={300}>Manage your tables and data sources for Excel editing</Text>
      </div>

      {/* Action Bar */}
      <div className="canvas-actions">
        <Button 
          appearance="primary" 
          icon={<Add20Regular />}
          onClick={handleAddTable}
          disabled={isLoading}
        >
          Add Table
        </Button>
        {isLoading && <Spinner size="small" />}
      </div>

      {/* Canvas Items Grid */}
      {canvasItems.length === 0 ? (
        <div className="empty-canvas">
          <CloudDatabase20Regular />
          <Text size={400} weight="semibold">No tables added yet</Text>
          <Text size={300}>Click "Add Table" to select tables from your lakehouses</Text>
        </div>
      ) : (
        <div className="canvas-grid">
          {canvasItems.map((canvasItem) => (
            <Card key={canvasItem.id} className="canvas-item-card">
              <CardHeader
                header={
                  <div className="canvas-item-header">
                    <div className="item-info">
                      <Text size={400} weight="semibold">{canvasItem.displayName}</Text>
                      <Text size={300}>{canvasItem.source.lakehouse?.name}</Text>
                    </div>
                    <Badge appearance="outline" color="informative">
                      {canvasItem.type === 'lakehouse-table' ? 'Lakehouse' : canvasItem.type}
                    </Badge>
                  </div>
                }
              />
              
              <div className="canvas-item-content">
                {canvasItem.source.table && (
                  <div className="table-info">
                    <TableSimple20Regular />
                    <Text size={300}>{canvasItem.source.table.rowCount.toLocaleString()} rows</Text>
                  </div>
                )}
                
                {canvasItem.lastEdited && (
                  <div className="last-edited">
                    <History20Regular />
                    <Text size={300}>Edited {canvasItem.lastEdited}</Text>
                  </div>
                )}
              </div>

              <div className="canvas-item-actions">
                <Button 
                  appearance="primary"
                  icon={<Edit20Regular />}
                  onClick={() => handleEditTable(canvasItem)}
                >
                  Edit Table
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Table Selection Dialog */}
      {showTableSelector && (
        <div className="table-selector-overlay">
          <Card className="table-selector-dialog">
            <CardHeader header={
              <Text size={500} weight="semibold">
                Select Tables from {selectedLakehouse?.name}
              </Text>
            } />
            
            <div className="table-selector-content">
              <Text size={300}>Choose one or more tables to add to your canvas:</Text>
              
              <div className="table-list">
                {availableTables.map((table) => (
                  <Card key={table.name} className="table-option">
                    <div className="table-option-content">
                      <div className="table-option-header">
                        <TableSimple20Regular />
                        <div>
                          <Text size={400} weight="semibold">{table.displayName}</Text>
                          <Text size={300}>{table.rowCount.toLocaleString()} rows, {table.schema.length} columns</Text>
                        </div>
                      </div>
                      
                      <Button 
                        appearance="primary"
                        onClick={() => handleTableSelection(table)}
                      >
                        Add to Canvas
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
              
              <div className="table-selector-actions">
                <Button 
                  appearance="secondary"
                  onClick={() => {
                    setShowTableSelector(false);
                    setSelectedLakehouse(null);
                    setAvailableTables([]);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}

/**
 * Table Editor (L2) - Detailed Excel editing experience
 */
function TableEditorView({
  workloadClient,
  item,
  onNavigateToCanvasOverview
}: {
  workloadClient: WorkloadClientAPI;
  item?: ItemWithDefinition<ExcelEditItemDefinition>;
  onNavigateToCanvasOverview?: () => void;
}) {
  const [currentEditingItem, setCurrentEditingItem] = useState<CanvasItem | null>(null);
  
  // Load current editing context
  useEffect(() => {
    const workflowState = item?.definition?.state as ExcelEditWorkflowState;
    console.log('🔍 TableEditor: Loading editing context...', workflowState?.currentEditingItem);
    
    if (workflowState?.currentEditingItem) {
      // Try to find the full item from canvas items first
      let fullItem = workflowState.canvasItems?.find(
        item => item.id === workflowState.currentEditingItem?.id
      );
      
      // If not found in canvas items, create a basic item from currentEditingItem
      if (!fullItem && workflowState.currentEditingItem) {
        console.log('🔄 Creating basic item from currentEditingItem');
        fullItem = {
          id: workflowState.currentEditingItem.id,
          type: workflowState.currentEditingItem.type as any,
          name: workflowState.currentEditingItem.name,
          displayName: workflowState.currentEditingItem.displayName,
          source: {
            lakehouse: workflowState.selectedLakehouse,
            table: workflowState.selectedTable
          }
        };
      }
      
      if (fullItem) {
        console.log('✅ TableEditor: Found editing item:', fullItem.displayName);
        setCurrentEditingItem(fullItem);
      } else {
        console.log('❌ TableEditor: Could not resolve editing item');
      }
    } else {
      console.log('❌ TableEditor: No currentEditingItem in state');
    }
  }, [item]);

  if (!currentEditingItem) {
    return (
      <div className="table-editor-loading">
        <Spinner size="large" />
        <Text>Loading table editor...</Text>
      </div>
    );
  }

  return (
    <div className="table-editor">
      {/* Table Editor Content - back button now in main editor above ribbon */}
      <div className="table-editor-content">
        <Card>
          <CardHeader
            header={
              <div className="editor-header">
                <div>
                  <Text size={500} weight="semibold">Editing: {currentEditingItem.displayName}</Text>
                  <Text size={300}>From {currentEditingItem.source.lakehouse?.name}</Text>
                </div>
                <Badge appearance="filled" color="success">
                  <Edit20Regular />
                  Excel Editor
                </Badge>
              </div>
            }
          />
          
          <div className="editor-content">
            {/* This will contain the actual Excel editing interface */}
            <MessageBar intent="info">
              <MessageBarBody>
                <Text size={300}>
                  Excel editing interface will be implemented here. This follows the same pattern as HelloWorld navigation.
                </Text>
              </MessageBarBody>
            </MessageBar>
            
            <div className="table-info">
              {currentEditingItem.source.table && (
                <>
                  <Text size={400} weight="medium">Table Information</Text>
                  <div className="table-stats">
                    <div className="stat">
                      <TableSimple20Regular />
                      <Text>{currentEditingItem.source.table.rowCount.toLocaleString()} rows</Text>
                    </div>
                    <div className="stat">
                      <DatabaseSearch20Regular />
                      <Text>{currentEditingItem.source.table.schema.length} columns</Text>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}