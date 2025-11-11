import { Label, Stack } from "@fluentui/react";
import { 
  Field, 
  Button, 
  Card, 
  CardHeader, 
  Text,
  Badge,
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Dropdown,
  Option
} from "@fluentui/react-components";
import React, { useEffect, useState, useCallback } from "react";
import { ContextProps, PageProps } from "../../App";
import { WorkspaceManagerItemEditorRibbon } from "./WorkspaceManagerItemEditorRibbon";
import { callGetItem, getWorkloadItem, saveItemDefinition } from "../../controller/ItemCRUDController";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { useLocation, useParams } from "react-router-dom";
import "../../styles.scss";
import { useTranslation } from "react-i18next";
import { WorkspaceManagerItemDefinition, WorkspaceItem, WorkspaceOperation, VIEW_TYPES, CurrentView } from "./WorkspaceManagerItemModel";
import { WorkspaceManagerItemEmpty } from "./WorkspaceManagerItemEditorEmpty";
import { ItemEditorLoadingProgressBar } from "../../controls/ItemEditorLoadingProgressBar";
import { callNotificationOpen } from "../../controller/NotificationController";
import { callOpenSettings } from "../../controller/SettingsController";
import { callAcquireFrontendAccessToken } from "../../controller/AuthenticationController";
import { EnvironmentConstants } from "../../constants";
import { ResizableTable } from "./ResizableTable";

export function WorkspaceManagerItemEditor(props: PageProps) {
  const pageContext = useParams<ContextProps>();
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const { workloadClient } = props;
  const [isUnsaved, setIsUnsaved] = useState<boolean>(true);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [editorItem, setEditorItem] = useState<ItemWithDefinition<WorkspaceManagerItemDefinition>>(undefined);
  const [selectedView, setSelectedView] = useState<CurrentView>(VIEW_TYPES.EMPTY);
  const [workspaceItems, setWorkspaceItems] = useState<WorkspaceItem[]>([]);
  const [isLoadingWorkspaceItems, setIsLoadingWorkspaceItems] = useState<boolean>(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [itemsToDelete, setItemsToDelete] = useState<WorkspaceItem[]>([]);
  const [showRebindDialog, setShowRebindDialog] = useState<boolean>(false);
  const [reportToRebind, setReportToRebind] = useState<WorkspaceItem | null>(null);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [semanticModels, setSemanticModels] = useState<WorkspaceItem[]>([]);

  // Helper function to update item definition immutably
  const updateItemDefinition = useCallback((updates: Partial<WorkspaceManagerItemDefinition>) => {
    setEditorItem(prevItem => {
      if (!prevItem) return prevItem;
      
      return {
        ...prevItem,
        definition: {
          ...prevItem.definition,
          ...updates
        }
      };
    });
    setIsUnsaved(true);
  }, []);

  useEffect(() => {
      loadDataFromUrl(pageContext, pathname);
    }, [pageContext, pathname]);

  async function SaveItem(definition?: WorkspaceManagerItemDefinition) {
    var successResult = await saveItemDefinition<WorkspaceManagerItemDefinition>(
      workloadClient,
      editorItem.id,
      definition || editorItem.definition);
    setIsUnsaved(!successResult);
    callNotificationOpen(
            workloadClient,
            t("ItemEditor_Saved_Notification_Title"),
            t("ItemEditor_Saved_Notification_Text", { itemName: editorItem.displayName }),
            undefined,
            undefined
        );
  }

  async function openSettings() {
    if (editorItem) {
      try {
        const item_res = await callGetItem(workloadClient, editorItem.id);
        await callOpenSettings(workloadClient, item_res.item, 'About');
      } catch (error) {
        console.error('Failed to open settings:', error);
      }
    }
  }

  async function refreshWorkspaceItems() {
    if (!editorItem?.workspaceId) return;
    
    setIsLoadingWorkspaceItems(true);
    
    try {
      // Acquire token for Workspace.Read.All scope
      // Note: AAD app must have this permission configured. Run AddFabricPermissionsToAADApp.ps1 to add it.
      const scopes = "https://api.fabric.microsoft.com/Workspace.Read.All";
      
      console.log("Requesting token for scope:", scopes);
      const accessToken = await callAcquireFrontendAccessToken(workloadClient, scopes);
      console.log("Token acquired successfully");
      
      // Call Fabric REST API directly
      const apiUrl = `${EnvironmentConstants.FabricApiBaseUrl}/v1/workspaces/${editorItem.workspaceId}/items`;
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + accessToken.token
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API call failed: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      const fabricItems = result.value || [];
      
      // Convert Fabric items to our WorkspaceItem format
      const workspaceItems: WorkspaceItem[] = fabricItems.map((item: any) => ({
        id: item.id,
        displayName: item.displayName,
        type: item.type,
        description: item.description || undefined,
        workspaceId: editorItem.workspaceId,
        selected: false
      }));
      
      setWorkspaceItems(workspaceItems);
      updateItemDefinition({ 
        selectedItems: workspaceItems,
        lastSync: new Date().toISOString() 
      });
      
      callNotificationOpen(
        workloadClient,
        "Items Loaded Successfully",
        `Found ${workspaceItems.length} items in workspace.`,
        undefined,
        undefined
      );
      
    } catch (error: any) {
      console.error("Failed to load workspace items:", error);
      
      // Check if user denied consent
      const errorMessage = error?.code === 'user_cancelled' 
        ? "Permission denied. Please grant consent to access workspace items."
        : error?.message || "Failed to load workspace items";
      
      callNotificationOpen(
        workloadClient,
        "Error Loading Items", 
        errorMessage,
        undefined,
        undefined
      );
    } finally {
      setIsLoadingWorkspaceItems(false);
    }
  }

  async function handleBulkCopy() {
    const selectedItems = workspaceItems.filter(item => item.selected);
    if (selectedItems.length === 0) {
      callNotificationOpen(
        workloadClient,
        "No Items Selected",
        "Please select items to copy.",
        undefined,
        undefined
      );
      return;
    }

    // Note: Fabric API doesn't provide direct copy functionality yet
    // This is a placeholder implementation for future enhancement
    callNotificationOpen(
      workloadClient,
      "Copy Feature Not Available",
      "Item copying functionality will be available in a future update. Currently, only delete operations are supported through the Fabric API.",
      undefined,
      undefined
    );

    const operation: WorkspaceOperation = {
      id: `op-${Date.now()}`,
      type: 'copy',
      sourceItems: selectedItems.map(item => item.id),
      status: 'completed',
      timestamp: new Date().toISOString()
    };

    const updatedOperations = [...(editorItem.definition?.operations || []), operation];
    updateItemDefinition({ operations: updatedOperations });
  }

  async function handleBulkDelete() {
    const selectedItems = workspaceItems.filter(item => item.selected);
    if (selectedItems.length === 0) {
      callNotificationOpen(
        workloadClient,
        "No Items Selected",
        "Please select items to delete.",
        undefined,
        undefined
      );
      return;
    }

    // Show confirmation dialog
    setItemsToDelete(selectedItems);
    setShowDeleteDialog(true);
  }



  async function confirmBulkDelete() {
    setShowDeleteDialog(false);
    
    if (!editorItem?.workspaceId) {
      callNotificationOpen(
        workloadClient,
        "Error",
        "Workspace ID not found. Cannot delete items.",
        undefined,
        undefined
      );
      return;
    }
    
    // Delete items using direct API calls
    let deletedCount = 0;
    let failedCount = 0;
    const deletedItemIds: string[] = [];
    const failedItems: Array<{name: string, error: string}> = [];

    try {
      // Acquire token for Item.ReadWrite.All scope for delete operations
      // Note: AAD app must have this permission configured. Run AddFabricPermissionsToAADApp.ps1 to add it.
      const scopes = "https://api.fabric.microsoft.com/Item.ReadWrite.All";
      
      console.log("Requesting token for delete scope:", scopes);
      const accessToken = await callAcquireFrontendAccessToken(workloadClient, scopes);
      console.log("Token acquired successfully for delete");

      for (const item of itemsToDelete) {
        try {
          console.log(`Attempting to delete item: ${item.displayName} (${item.id}) of type ${item.type}`);
          
          const apiUrl = `${EnvironmentConstants.FabricApiBaseUrl}/v1/workspaces/${editorItem.workspaceId}/items/${item.id}`;
          
          const response = await fetch(apiUrl, {
            method: 'DELETE',
            headers: {
              'Authorization': 'Bearer ' + accessToken.token
            }
          });
          
          if (!response.ok) {
            throw new Error(`Delete failed: ${response.status} ${response.statusText}`);
          }
          
          deletedItemIds.push(item.id);
          deletedCount++;
          console.log(`Successfully deleted: ${item.displayName}`);
        } catch (error: any) {
          console.error(`Failed to delete item ${item.displayName} of type ${item.type}:`, error);
          
          let errorMessage = error?.message || 'Unknown error';
          
          failedItems.push({ name: `${item.displayName} (${item.type})`, error: errorMessage });
          failedCount++;
        }
      }

      // Update the UI to remove successfully deleted items
      const remainingItems = workspaceItems.filter(item => !deletedItemIds.includes(item.id));
      setWorkspaceItems(remainingItems);

      // Record the operation
      const operation: WorkspaceOperation = {
        id: `op-${Date.now()}`,
        type: 'delete',
        sourceItems: deletedItemIds,
        status: failedCount === 0 ? 'completed' : 'failed',
        timestamp: new Date().toISOString(),
        errorMessage: failedCount > 0 ? `${failedCount} items failed to delete` : undefined
      };

      const updatedOperations = [...(editorItem.definition?.operations || []), operation];
      updateItemDefinition({ 
        selectedItems: remainingItems,
        operations: updatedOperations 
      });

      // Show result notification
      if (failedCount === 0) {
        callNotificationOpen(
          workloadClient,
          "Delete Operation Complete",
          `Successfully deleted ${deletedCount} items.`,
          undefined,
          undefined
        );
      } else if (deletedCount > 0) {
        const failedNames = failedItems.map(f => f.name).join(', ');
        callNotificationOpen(
          workloadClient,
          "Delete Operation Partially Complete",
          `Deleted ${deletedCount} items successfully. Failed to delete ${failedCount} items: ${failedNames}. This may be due to insufficient permissions or item protection.`,
          undefined,
          undefined
        );
      } else {
        const failedDetails = failedItems.map(f => `${f.name}: ${f.error}`).join('; ');
        callNotificationOpen(
          workloadClient,
          "Delete Operation Failed",
          `Failed to delete all ${failedCount} items. ${failedDetails}`,
          undefined,
          undefined
        );
      }
      
    } catch (error: any) {
      console.error("Bulk delete operation failed:", error);
      const errorMessage = error?.message || 'Unknown error occurred';
      callNotificationOpen(
        workloadClient,
        "Delete Operation Failed",
        `Failed to delete items: ${errorMessage}`,
        undefined,
        undefined
      );
    }
  }

  async function handleRebindReport() {
    // Get the first selected report
    const selectedReport = workspaceItems.find(item => item.selected && item.type === 'Report');
    
    if (!selectedReport) {
      callNotificationOpen(
        workloadClient,
        "No Report Selected",
        "Please select a report to rebind. Only reports can be rebound to different semantic models.",
        undefined,
        undefined
      );
      return;
    }

    // Load available semantic models
    const datasets = workspaceItems.filter(item => item.type === 'SemanticModel');
    if (datasets.length === 0) {
      callNotificationOpen(
        workloadClient,
        "No Semantic Models Found",
        "No semantic models found in this workspace. Please ensure you have semantic models available.",
        undefined,
        undefined
      );
      return;
    }

    setSemanticModels(datasets);
    setReportToRebind(selectedReport);
    setShowRebindDialog(true);
  }

  async function confirmRebindReport() {
    setShowRebindDialog(false);
    
    if (!reportToRebind || !selectedDatasetId || !editorItem?.workspaceId) {
      callNotificationOpen(
        workloadClient,
        "Error",
        "Missing required information for rebind operation.",
        undefined,
        undefined
      );
      return;
    }

    try {
      // Request token with Report.ReadWrite.All scope
      const scopes = "https://api.fabric.microsoft.com/Report.ReadWrite.All";
      console.log("Requesting token for rebind scope:", scopes);
      const accessToken = await callAcquireFrontendAccessToken(workloadClient, scopes);
      console.log("Token acquired successfully for rebind");

      // Call Power BI REST API to rebind report
      const apiUrl = `https://api.powerbi.com/v1.0/myorg/groups/${editorItem.workspaceId}/reports/${reportToRebind.id}/Rebind`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + accessToken.token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          datasetId: selectedDatasetId
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Rebind failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      // Record the operation
      const operation: WorkspaceOperation = {
        id: `op-${Date.now()}`,
        type: 'rebind',
        sourceItems: [reportToRebind.id],
        targetDatasetId: selectedDatasetId,
        status: 'completed',
        timestamp: new Date().toISOString()
      };

      const updatedOperations = [...(editorItem.definition?.operations || []), operation];
      updateItemDefinition({ operations: updatedOperations });

      callNotificationOpen(
        workloadClient,
        "Rebind Successful",
        `Report "${reportToRebind.displayName}" has been successfully rebound to the selected semantic model.`,
        undefined,
        undefined
      );

      // Reset state
      setReportToRebind(null);
      setSelectedDatasetId('');
      
    } catch (error: any) {
      console.error("Rebind operation failed:", error);
      callNotificationOpen(
        workloadClient,
        "Rebind Operation Failed",
        error?.message || "Failed to rebind report to semantic model.",
        undefined,
        undefined
      );
    }
  }

  function toggleItemSelection(itemId: string, checked: boolean) {
    const updatedItems = workspaceItems.map(item => 
      item.id === itemId ? { ...item, selected: checked } : item
    );
    setWorkspaceItems(updatedItems);
    updateItemDefinition({ selectedItems: updatedItems });
  }

  function selectAllItems(checked: boolean) {
    const updatedItems = workspaceItems.map(item => ({ ...item, selected: checked }));
    setWorkspaceItems(updatedItems);
    updateItemDefinition({ selectedItems: updatedItems });
  }

  async function loadDataFromUrl(pageContext: ContextProps, pathname: string): Promise<void> {
    setIsLoadingData(true);
    var item: ItemWithDefinition<WorkspaceManagerItemDefinition> = undefined;    
    if (pageContext.itemObjectId) {
      try {
        item = await getWorkloadItem<WorkspaceManagerItemDefinition>(
          workloadClient,
          pageContext.itemObjectId,          
        );
        
        // Ensure item definition is properly initialized without mutation
        if (!item.definition) {
          item = {
            ...item,
            definition: {
              managedWorkspaceId: item.workspaceId,
              selectedItems: [],
              operations: [],
              lastSync: undefined
            }
          };
        }
        
        setEditorItem(item);
        
        // Load workspace items if they exist
        if (item.definition.selectedItems) {
          setWorkspaceItems(item.definition.selectedItems);
        }
        
      } catch (error) {
        setEditorItem(undefined);        
      } 
    } else {
      console.log(`non-editor context. Current Path: ${pathname}`);
    }
    setIsUnsaved(false);
    if(item?.definition?.managedWorkspaceId && item.definition.selectedItems?.length > 0) {
      setSelectedView(VIEW_TYPES.ITEM_BROWSER);
    } else {
      setSelectedView(VIEW_TYPES.EMPTY);
    }
    setIsLoadingData(false);
  }

  async function handleFinishEmpty(definition: WorkspaceManagerItemDefinition) {
    updateItemDefinition(definition);
    await SaveItem(definition);
    setSelectedView(VIEW_TYPES.ITEM_BROWSER);
    // Load workspace items immediately after initialization
    await refreshWorkspaceItems();
  }

  const selectedItemsCount = workspaceItems.filter(item => item.selected).length;
  const hasSelectedItems = selectedItemsCount > 0;
  const hasSelectedReport = workspaceItems.some(item => item.selected && item.type === 'Report');

  if (isLoadingData) {
    return (<ItemEditorLoadingProgressBar 
      message={t("WorkspaceManagerItemEditor_LoadingProgressBar_Text")} />);
  }
  else {
    return (
      <Stack className="editor" data-testid="item-editor-inner">
        <WorkspaceManagerItemEditorRibbon
            {...props}        
            isRibbonDisabled={selectedView === VIEW_TYPES.EMPTY}
            isSaveButtonEnabled={isUnsaved}
            hasSelectedItems={hasSelectedItems}
            hasSelectedReport={hasSelectedReport}
            saveItemCallback={SaveItem}
            openSettingsCallback={openSettings}
            refreshWorkspaceCallback={refreshWorkspaceItems}
            bulkCopyCallback={handleBulkCopy}
            bulkDeleteCallback={handleBulkDelete}
            rebindReportCallback={handleRebindReport}
        />
        <Stack className="main">
          {selectedView === VIEW_TYPES.EMPTY && (
            <span>
              <WorkspaceManagerItemEmpty
                workloadClient={workloadClient}
                item={editorItem}
                itemDefinition={editorItem?.definition}
                onFinishEmpty={handleFinishEmpty}
              />
            </span>
          )}
          {selectedView === VIEW_TYPES.ITEM_BROWSER && (
          <span>
              <h2>{t('WorkspaceManagerItemEditor_Title')}</h2>
              
              {/* Workspace Information Section */}
              <div className="section" data-testid='workspace-manager-metadata'>
                <Field label={t('Item_ID_Label')} orientation="horizontal" className="field">
                  <Label>{editorItem?.id}</Label>
                </Field>
                <Field label={t('Item_Type_Label')} orientation="horizontal" className="field">
                  <Label>{editorItem?.type}</Label>
                </Field>
                <Field label={t('Item_Name_Label')} orientation="horizontal" className="field">
                  <Label>{editorItem?.displayName}</Label>
                </Field>
                <Field label={t('Workspace_ID_Label')} orientation="horizontal" className="field">
                  <Label>{editorItem?.workspaceId}</Label>
                </Field>
                {editorItem?.definition?.lastSync && (
                  <Field label={t('WorkspaceManagerItem_LastSync_Label')} orientation="horizontal" className="field">
                    <Label>{new Date(editorItem.definition.lastSync).toLocaleString()}</Label>
                  </Field>
                )}
              </div>

              {/* Workspace Items Section */}
              <div className="section" style={{ marginTop: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <Text as="h3" size={600} weight="semibold">
                    Workspace Items
                  </Text>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {selectedItemsCount > 0 && (
                      <Badge appearance="filled" color="informative">
                        {selectedItemsCount} selected
                      </Badge>
                    )}
                    <Button 
                      appearance="outline" 
                      onClick={refreshWorkspaceItems}
                      disabled={isLoadingWorkspaceItems}
                    >
                      {isLoadingWorkspaceItems ? "Refreshing..." : "Refresh Items"}
                    </Button>
                  </div>
                </div>

                {workspaceItems.length === 0 ? (
                  <Card>
                    <Text>No items found in workspace. Click "Refresh Items" to scan for workspace content.</Text>
                  </Card>
                ) : (
                  <div>
                    <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <Text size={300} style={{ color: '#6b6b6b' }}>
                        {workspaceItems.length} items found
                      </Text>
                    </div>
                    
                    <ResizableTable
                      items={workspaceItems}
                      onSelectionChange={toggleItemSelection}
                      onSelectAll={selectAllItems}
                    />
                  </div>
                )}
              </div>

              {/* Operations History Section */}
              {editorItem?.definition?.operations && editorItem.definition.operations.length > 0 && (
                <div className="section" style={{ marginTop: '24px' }}>
                  <Text as="h3" size={600} weight="semibold" style={{ marginBottom: '16px' }}>
                    Recent Operations
                  </Text>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {editorItem.definition.operations.slice(-5).reverse().map((operation) => (
                      <Card key={operation.id}>
                        <CardHeader
                          header={
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Badge 
                                appearance="filled" 
                                color={operation.type === 'delete' ? 'danger' : 'success'}
                              >
                                {operation.type.toUpperCase()}
                              </Badge>
                              <Text weight="semibold">
                                {operation.sourceItems.length} items
                              </Text>
                              <Text size={200} style={{ color: '#6b6b6b' }}>
                                {new Date(operation.timestamp).toLocaleString()}
                              </Text>
                            </div>
                          }
                        />
                      </Card>
                    ))}
                  </div>
                </div>
              )}
          </span>
          )}       
        </Stack>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={(_, data) => setShowDeleteDialog(data.open)}>
          <DialogSurface>
            <DialogBody>
              <DialogTitle>Confirm Delete</DialogTitle>
              <DialogContent>
                <Text>
                  Are you sure you want to delete {itemsToDelete.length} item(s)? This action cannot be undone.
                </Text>
                {itemsToDelete.length > 0 && (
                  <div style={{ marginTop: '12px', maxHeight: '200px', overflowY: 'auto' }}>
                    <Text weight="semibold">Items to be deleted:</Text>
                    <ul style={{ marginTop: '8px' }}>
                      {itemsToDelete.map(item => (
                        <li key={item.id}>
                          <Text size={200}>{item.displayName} ({item.type})</Text>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </DialogContent>
              <DialogActions>
                <Button appearance="secondary" onClick={() => setShowDeleteDialog(false)}>
                  Cancel
                </Button>
                <Button appearance="primary" onClick={confirmBulkDelete}>
                  Delete
                </Button>
              </DialogActions>
            </DialogBody>
          </DialogSurface>
        </Dialog>

        {/* Rebind Report Dialog */}
        <Dialog open={showRebindDialog} onOpenChange={(_, data) => setShowRebindDialog(data.open)}>
          <DialogSurface>
            <DialogBody>
              <DialogTitle>Rebind Report to Semantic Model</DialogTitle>
              <DialogContent>
                <Text>
                  Select a semantic model to rebind the report "{reportToRebind?.displayName}" to:
                </Text>
                <div style={{ marginTop: '16px' }}>
                  <Dropdown
                    placeholder="Select a semantic model"
                    value={semanticModels.find(ds => ds.id === selectedDatasetId)?.displayName || ''}
                    onOptionSelect={(_, data) => setSelectedDatasetId(data.optionValue as string)}
                  >
                    {semanticModels.map(dataset => (
                      <Option key={dataset.id} value={dataset.id}>
                        {dataset.displayName}
                      </Option>
                    ))}
                  </Dropdown>
                </div>
                <div style={{ marginTop: '12px' }}>
                  <Text size={200} style={{ color: '#6b6b6b' }}>
                    Note: This will change the data source for the report. The report must be compatible with the selected semantic model.
                  </Text>
                </div>
              </DialogContent>
              <DialogActions>
                <Button appearance="secondary" onClick={() => setShowRebindDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  appearance="primary" 
                  onClick={confirmRebindReport}
                  disabled={!selectedDatasetId}
                >
                  Rebind
                </Button>
              </DialogActions>
            </DialogBody>
          </DialogSurface>
        </Dialog>
      </Stack>
    );
  }
}