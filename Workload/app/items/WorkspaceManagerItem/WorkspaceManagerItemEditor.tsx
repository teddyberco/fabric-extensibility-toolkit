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
  Option,
  Spinner
} from "@fluentui/react-components";
import React, { useEffect, useState, useCallback } from "react";
import { ContextProps, PageProps } from "../../App";
import { WorkspaceManagerItemEditorRibbon } from "./WorkspaceManagerItemEditorRibbon";
import { callGetItem, getWorkloadItem, saveItemDefinition } from "../../controller/ItemCRUDController";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { useLocation, useParams } from "react-router-dom";
import "../../styles.scss";
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
  const [showCloneProgressDialog, setShowCloneProgressDialog] = useState<boolean>(false);
  const [cloneProgressLogs, setCloneProgressLogs] = useState<string[]>([]);
  const [showOperationLogsDialog, setShowOperationLogsDialog] = useState<boolean>(false);
  const [selectedOperation, setSelectedOperation] = useState<WorkspaceOperation | null>(null);

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
            "Item Saved",
            `${editorItem.displayName} has been saved successfully.`,
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

  async function handleCloneSemanticModel() {
    // Get the first selected semantic model
    const selectedSemanticModel = workspaceItems.find(item => item.selected && item.type === 'SemanticModel');
    
    if (!selectedSemanticModel) {
      callNotificationOpen(
        workloadClient,
        "No Semantic Model Selected",
        "Please select a semantic model to clone. Only one semantic model can be cloned at a time.",
        undefined,
        undefined
      );
      return;
    }

    const clonedName = `${selectedSemanticModel.displayName} (Copy)`;
    
    // Capture operation start time
    const operationStartTime = new Date();
    const operationId = `op-${Date.now()}`;
    
    // Initialize progress dialog
    setCloneProgressLogs([]);
    setShowCloneProgressDialog(true);

    const addLog = (message: string) => {
      setCloneProgressLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    };

    try {
      addLog("[START] Starting semantic model clone operation...");
      addLog(`[INFO] Operation ID: ${operationId}`);
      addLog(`[INFO] Started at: ${operationStartTime.toLocaleString()}`);
      addLog(`[INFO] Source: ${selectedSemanticModel.displayName}`);
      addLog(`[INFO] Target: ${clonedName}`);

      // Step 1: Get token with Item.ReadWrite.All scope
      const scopes = "https://api.fabric.microsoft.com/Item.ReadWrite.All";
      addLog("[AUTH] Acquiring authentication token...");
      console.log("Requesting token for clone operation:", scopes);
      const accessToken = await callAcquireFrontendAccessToken(workloadClient, scopes);
      console.log("Token acquired successfully");
      addLog("[SUCCESS] Authentication successful");

      // Step 2: Get the source semantic model metadata to understand what we're cloning
      addLog("[INFO] Fetching source model metadata...");
      console.log("Getting item metadata for semantic model:", selectedSemanticModel.id);
      const getItemUrl = `${EnvironmentConstants.FabricApiBaseUrl}/v1/workspaces/${editorItem.workspaceId}/items/${selectedSemanticModel.id}`;
      
      const getItemResponse = await fetch(getItemUrl, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + accessToken.token
        }
      });

      if (!getItemResponse.ok) {
        const errorText = await getItemResponse.text();
        throw new Error(`Failed to get item metadata: ${getItemResponse.status} ${getItemResponse.statusText} - ${errorText}`);
      }

      const itemMetadata = await getItemResponse.json();
      console.log("[INFO] Semantic model metadata:", {
        id: itemMetadata.id,
        displayName: itemMetadata.displayName,
        type: itemMetadata.type,
        description: itemMetadata.description,
        workspaceId: itemMetadata.workspaceId
      });
      addLog("[SUCCESS] Source model metadata retrieved");

      // Step 3: Get the source semantic model definition using Core Items API (asynchronous operation)
      addLog("[INFO] Requesting model definition (this may take a few seconds)...");
      console.log("[INFO] Starting asynchronous getDefinition for semantic model:", selectedSemanticModel.id);
      const getDefUrl = `${EnvironmentConstants.FabricApiBaseUrl}/v1/workspaces/${editorItem.workspaceId}/items/${selectedSemanticModel.id}/getDefinition`;
      
      const getDefResponse = await fetch(getDefUrl, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + accessToken.token
        }
      });

      console.log("[API] getDefinition response status:", getDefResponse.status, getDefResponse.statusText);

      let definitionData = null;

      // 202 Accepted means the operation is asynchronous - need to poll for completion
      if (getDefResponse.status === 202) {
        const operationLocation = getDefResponse.headers.get('location') || getDefResponse.headers.get('x-ms-operation-location');
        console.log("[ASYNC] Operation is asynchronous. Location header:", operationLocation);

        if (!operationLocation) {
          throw new Error("Received 202 Accepted but no operation location header was provided");
        }

        // Poll the operation until it completes
        addLog("[WAIT] Waiting for definition extraction to complete...");
        console.log("[POLL] Polling for operation completion...");
        let attempts = 0;
        const maxAttempts = 30; // 30 attempts with 2s delay = 1 minute max

        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between polls
          attempts++;

          const pollResponse = await fetch(operationLocation, {
            method: 'GET',
            headers: {
              'Authorization': 'Bearer ' + accessToken.token
            }
          });

          console.log(`[POLL] Poll attempt ${attempts}: Status ${pollResponse.status}`);

          if (pollResponse.status === 200) {
            // Operation completed - check the status
            const operationStatus = await pollResponse.json();
            console.log("[SUCCESS] Operation completed with status:", operationStatus);

            // Check if operation succeeded
            if (operationStatus.status === 'Succeeded') {
              // Operation succeeded - get the result from the Location header
              // The poll response includes a Location header pointing to the result URL
              const resultLocation = pollResponse.headers.get('location');
              
              if (resultLocation) {
                console.log("� Fetching definition result from Location header:", resultLocation);
                
                const resultResponse = await fetch(resultLocation, {
                  method: 'GET',
                  headers: {
                    'Authorization': 'Bearer ' + accessToken.token
                  }
                });

                console.log(`[API] GET result response status:`, resultResponse.status);

                if (resultResponse.ok) {
                  definitionData = await resultResponse.json();
                  console.log("[SUCCESS] Definition result retrieved successfully");
                  console.log("[INFO] Definition structure:", definitionData);
                  const partsCount = definitionData?.definition?.parts?.length || 0;
                  addLog(`[SUCCESS] Definition retrieved successfully (${partsCount} parts)`);
                } else {
                  const errorText = await resultResponse.text();
                  console.log("[ERROR] Failed to GET result:", errorText);
                  throw new Error(`Failed to get definition result: ${resultResponse.status} ${resultResponse.statusText} - ${errorText}`);
                }
              } else {
                // No Location header - check if result is embedded in the operation status
                console.log("[WARN] No Location header found in poll response");
                console.log("� Checking operation status for embedded result...");
                
                if (operationStatus.result) {
                  console.log("[SUCCESS] Result found in operation status.result");
                  definitionData = operationStatus.result;
                } else if (operationStatus.definition) {
                  console.log("[SUCCESS] Result found in operation status.definition");
                  definitionData = operationStatus.definition;
                } else {
                  throw new Error(`Operation succeeded but no result location or embedded result found. Operation status: ${JSON.stringify(operationStatus)}`);
                }
              }
              break;

            } else if (operationStatus.status === 'Failed') {
              throw new Error(`Operation failed: ${JSON.stringify(operationStatus.error || operationStatus)}`);
            } else {
              // Other status, continue polling
              console.log(`[WAIT] Operation status: ${operationStatus.status}, continuing to poll...`);
            }
          } else if (!pollResponse.ok && pollResponse.status !== 202) {
            // Error occurred
            const errorText = await pollResponse.text();
            throw new Error(`Operation failed: ${pollResponse.status} ${pollResponse.statusText} - ${errorText}`);
          }
          // If still 202, continue polling
        }

        if (!definitionData) {
          throw new Error(`Operation timed out after ${attempts} attempts (${attempts * 2} seconds)`);
        }

      } else if (getDefResponse.status === 200) {
        // Synchronous response (some items may return immediately)
        console.log("[SUCCESS] Received synchronous response");
        definitionData = await getDefResponse.json();

      } else {
        // Unexpected status code
        const errorText = await getDefResponse.text();
        throw new Error(`Failed to get definition: ${getDefResponse.status} ${getDefResponse.statusText} - ${errorText}`);
      }

      console.log("[INFO] Definition retrieved:", definitionData);
      console.log("[INFO] Definition parts count:", definitionData?.definition?.parts?.length || 0);

      // Validate that we have a definition with parts (Core Items API format)
      if (!definitionData || !definitionData.definition || !definitionData.definition.parts || definitionData.definition.parts.length === 0) {
        throw new Error(`[ERROR] This semantic model cannot be cloned via API.\n\nPossible reasons:\n• The model may be empty (no tables/data)\n• The model may be a Power BI Desktop model (not Fabric-native)\n• The model may use a legacy format that doesn't support API export\n\nAPI Response: ${JSON.stringify(definitionData)}\n\nSuggestion: Try creating a new Fabric-native semantic model or use the Fabric portal's built-in clone feature.`);
      }

      // Step 4: Create new semantic model WITH the definition included using Core Items API
      addLog("[CREATE] Creating new semantic model with definition...");
      console.log("Creating new semantic model with definition:", clonedName);
      const createUrl = `${EnvironmentConstants.FabricApiBaseUrl}/v1/workspaces/${editorItem.workspaceId}/items`;
      
      const createResponse = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + accessToken.token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          displayName: clonedName,
          type: 'SemanticModel',
          description: selectedSemanticModel.description || `Clone of ${selectedSemanticModel.displayName}`,
          definition: definitionData.definition  // Include definition from source model
        })
      });

      console.log("[API] Create response status:", createResponse.status, createResponse.statusText);
      
      let newSemanticModelId: string;

      if (createResponse.status === 202) {
        // Create is also asynchronous - poll for completion
        const createOperationLocation = createResponse.headers.get('location') || createResponse.headers.get('x-ms-operation-location');
        console.log("[WAIT] Create operation is asynchronous. Location header:", createOperationLocation);

        if (!createOperationLocation) {
          throw new Error("Received 202 Accepted for create but no operation location header was provided");
        }

        // Poll the create operation
        addLog("[WAIT] Waiting for model creation to complete...");
        console.log("[WAIT] Polling for create operation completion...");
        let createAttempts = 0;
        const maxCreateAttempts = 30;
        let createResultData = null;

        while (createAttempts < maxCreateAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          createAttempts++;
          if (createAttempts % 5 === 0) {
            addLog(`[WAIT] Still waiting... (${createAttempts * 2} seconds elapsed)`);
          }

          const createPollResponse = await fetch(createOperationLocation, {
            method: 'GET',
            headers: {
              'Authorization': 'Bearer ' + accessToken.token
            }
          });

          console.log(`[POLL] Create poll attempt ${createAttempts}: Status ${createPollResponse.status}`);

          if (createPollResponse.status === 200) {
            const createOperationStatus = await createPollResponse.json();
            console.log("[SUCCESS] Create operation completed with status:", createOperationStatus);

            if (createOperationStatus.status === 'Succeeded') {
              // Get result from Location header
              const createResultLocation = createPollResponse.headers.get('location');
              
              if (createResultLocation) {
                console.log("[FETCH] Fetching create result from Location header:", createResultLocation);
                
                const createResultResponse = await fetch(createResultLocation, {
                  method: 'GET',
                  headers: {
                    'Authorization': 'Bearer ' + accessToken.token
                  }
                });

                if (createResultResponse.ok) {
                  createResultData = await createResultResponse.json();
                  console.log("[SUCCESS] Create result retrieved:", createResultData);
                  addLog("[SUCCESS] New semantic model created successfully!");
                } else {
                  const errorText = await createResultResponse.text();
                  throw new Error(`Failed to get create result: ${createResultResponse.status} - ${errorText}`);
                }
              } else if (createOperationStatus.result) {
                // Result embedded in operation status
                createResultData = createOperationStatus.result;
                console.log("[SUCCESS] Create result found in operation status");
              } else {
                throw new Error(`Create operation succeeded but no result found: ${JSON.stringify(createOperationStatus)}`);
              }
              break;
            } else if (createOperationStatus.status === 'Failed') {
              throw new Error(`Create operation failed: ${JSON.stringify(createOperationStatus.error || createOperationStatus)}`);
            }
          } else if (!createPollResponse.ok && createPollResponse.status !== 202) {
            const errorText = await createPollResponse.text();
            throw new Error(`Create operation polling failed: ${createPollResponse.status} - ${errorText}`);
          }
        }

        if (!createResultData) {
          throw new Error(`Create operation timed out after ${createAttempts} attempts`);
        }

        // Extract the ID from the create result
        newSemanticModelId = createResultData.id;
        console.log("[SUCCESS] New semantic model created successfully with ID:", newSemanticModelId);

      } else if (createResponse.status === 200 || createResponse.status === 201) {
        // Synchronous create response
        const newSemanticModel = await createResponse.json();
        console.log("[INFO] Create response body:", newSemanticModel);
        
        if (!newSemanticModel || !newSemanticModel.id) {
          throw new Error(`Create response did not return a valid item: ${JSON.stringify(newSemanticModel)}`);
        }
        
        newSemanticModelId = newSemanticModel.id;
        console.log("[SUCCESS] New semantic model created successfully with ID:", newSemanticModelId);

      } else {
        const errorText = await createResponse.text();
        throw new Error(`Failed to create new semantic model: ${createResponse.status} ${createResponse.statusText} - ${errorText}`);
      }

      // Success! Record the operation
      const operationEndTime = new Date();
      const durationMs = operationEndTime.getTime() - operationStartTime.getTime();
      const durationSeconds = (durationMs / 1000).toFixed(1);
      
      addLog(`[SUCCESS] Clone completed! New model ID: ${newSemanticModelId}`);
      addLog(`[TIME] Finished at: ${operationEndTime.toLocaleString()}`);
      addLog(`[TIME] Total duration: ${durationSeconds} seconds`);
      addLog("[SAVE] Saving operation history...");

      // Capture logs before state updates
      const finalLogs = [
        ...cloneProgressLogs,
        `${new Date().toLocaleTimeString()}: [SUCCESS] Clone completed! New model ID: ${newSemanticModelId}`,
        `${new Date().toLocaleTimeString()}: [TIME] Finished at: ${operationEndTime.toLocaleString()}`,
        `${new Date().toLocaleTimeString()}: [TIME] Total duration: ${durationSeconds} seconds`,
        `${new Date().toLocaleTimeString()}: [SAVE] Saving operation history...`
      ];

      const operation: WorkspaceOperation = {
        id: operationId,
        type: 'clone',
        sourceItems: [selectedSemanticModel.id],
        clonedItemId: newSemanticModelId,
        clonedItemName: clonedName,
        status: 'completed',
        timestamp: new Date().toISOString(),
        startTime: operationStartTime.toISOString(),
        endTime: operationEndTime.toISOString(),
        duration: durationMs,
        logs: finalLogs // Save the complete logs with the operation
      };

      const updatedOperations = [...(editorItem.definition?.operations || []), operation];
      const updatedDefinition = { ...editorItem.definition, operations: updatedOperations };
      updateItemDefinition({ operations: updatedOperations });
      
      // Save the item definition
      await saveItemDefinition(workloadClient, editorItem.id, updatedDefinition);
      addLog("[SUCCESS] Operation history saved");

      addLog("[INFO] Refreshing workspace items...");
      // Refresh workspace items to show the new semantic model
      await refreshWorkspaceItems();
      
      addLog("[SUCCESS] Clone operation completed successfully!");
      
      // Close dialog after a brief delay to show final message
      setTimeout(() => {
        setShowCloneProgressDialog(false);
      }, 2000);

      callNotificationOpen(
        workloadClient,
        "Clone Successful",
        `Semantic model "${selectedSemanticModel.displayName}" has been successfully cloned as "${clonedName}".`,
        undefined,
        undefined
      );
      
    } catch (error: any) {
      console.error("Clone operation failed:", error);
      const operationEndTime = new Date();
      const durationMs = operationEndTime.getTime() - operationStartTime.getTime();
      const durationSeconds = (durationMs / 1000).toFixed(1);
      
      addLog(`[ERROR] Error: ${error?.message || 'Unknown error'}`);
      addLog(`[TIME] Failed after ${durationSeconds} seconds`);
      addLog("[SAVE] Saving failed operation to history...");
      
      // Capture logs before state updates
      const finalLogs = [
        ...cloneProgressLogs,
        `${new Date().toLocaleTimeString()}: [ERROR] Error: ${error?.message || 'Unknown error'}`,
        `${new Date().toLocaleTimeString()}: [TIME] Failed after ${durationSeconds} seconds`,
        `${new Date().toLocaleTimeString()}: [SAVE] Saving failed operation to history...`
      ];
      
      // Record failed operation
      const operation: WorkspaceOperation = {
        id: operationId,
        type: 'clone',
        sourceItems: [selectedSemanticModel.id],
        status: 'failed',
        timestamp: new Date().toISOString(),
        startTime: operationStartTime.toISOString(),
        endTime: operationEndTime.toISOString(),
        duration: durationMs,
        errorMessage: error?.message || 'Unknown error',
        logs: finalLogs // Save the complete logs even on failure for debugging
      };

      const updatedOperations = [...(editorItem.definition?.operations || []), operation];
      const updatedDefinition = { ...editorItem.definition, operations: updatedOperations };
      updateItemDefinition({ operations: updatedOperations });
      
      // Save the item definition
      await saveItemDefinition(workloadClient, editorItem.id, updatedDefinition);
      addLog("[SUCCESS] Operation history saved");

      // Keep dialog open on error so user can see logs
      addLog("[ERROR] Clone operation failed - see details above");

      callNotificationOpen(
        workloadClient,
        "Clone Operation Failed",
        error?.message || "Failed to clone semantic model.",
        undefined,
        undefined
      );
    }
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

    const operationId = `op-${Date.now()}`;
    const operationStartTime = new Date();
    const operationLogs: string[] = [];
    
    // Helper to add log entries
    const addLog = (message: string) => {
      const logEntry = `${new Date().toLocaleTimeString()}: ${message}`;
      operationLogs.push(logEntry);
      console.log(logEntry);
    };

    try {
      addLog(`[INFO] Starting rebind operation for report "${reportToRebind.displayName}"`);
      addLog(`[INFO] Target Semantic Model ID: ${selectedDatasetId}`);
      
      // Request token with Report.ReadWrite.All scope
      const scopes = "https://api.fabric.microsoft.com/Report.ReadWrite.All";
      addLog("[AUTH] Requesting authentication token...");
      const accessToken = await callAcquireFrontendAccessToken(workloadClient, scopes);
      addLog("[SUCCESS] Token acquired successfully");

      // Call Power BI REST API to rebind report
      const apiUrl = `https://api.powerbi.com/v1.0/myorg/groups/${editorItem.workspaceId}/reports/${reportToRebind.id}/Rebind`;
      addLog(`[API] Calling Power BI API to rebind report...`);
      
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

      // Success! Record the operation
      const operationEndTime = new Date();
      const durationMs = operationEndTime.getTime() - operationStartTime.getTime();
      const durationSeconds = (durationMs / 1000).toFixed(1);
      
      addLog(`[SUCCESS] Rebind completed successfully!`);
      addLog(`[TIME] Finished at: ${operationEndTime.toLocaleString()}`);
      addLog(`[TIME] Total duration: ${durationSeconds} seconds`);
      addLog("[SAVE] Saving operation history...");

      // Record the operation with logs
      const operation: WorkspaceOperation = {
        id: operationId,
        type: 'rebind',
        sourceItems: [reportToRebind.id],
        targetDatasetId: selectedDatasetId,
        status: 'completed',
        timestamp: operationStartTime.toISOString(),
        startTime: operationStartTime.toISOString(),
        endTime: operationEndTime.toISOString(),
        duration: durationMs,
        logs: operationLogs
      };

      const updatedOperations = [...(editorItem.definition?.operations || []), operation];
      const updatedDefinition = { ...editorItem.definition, operations: updatedOperations };
      updateItemDefinition({ operations: updatedOperations });
      
      // Save the item definition
      await saveItemDefinition(workloadClient, editorItem.id, updatedDefinition);
      addLog("[SUCCESS] Operation history saved");

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
      const operationEndTime = new Date();
      const durationMs = operationEndTime.getTime() - operationStartTime.getTime();
      const durationSeconds = (durationMs / 1000).toFixed(1);
      
      addLog(`[ERROR] Error: ${error?.message || 'Unknown error'}`);
      addLog(`[TIME] Failed after ${durationSeconds} seconds`);
      addLog("[SAVE] Saving failed operation to history...");
      
      // Record failed operation with logs
      const operation: WorkspaceOperation = {
        id: operationId,
        type: 'rebind',
        sourceItems: [reportToRebind.id],
        targetDatasetId: selectedDatasetId,
        status: 'failed',
        timestamp: operationStartTime.toISOString(),
        startTime: operationStartTime.toISOString(),
        endTime: operationEndTime.toISOString(),
        duration: durationMs,
        errorMessage: error?.message || 'Unknown error',
        logs: operationLogs
      };

      const updatedOperations = [...(editorItem.definition?.operations || []), operation];
      const updatedDefinition = { ...editorItem.definition, operations: updatedOperations };
      updateItemDefinition({ operations: updatedOperations });
      
      // Save the item definition
      await saveItemDefinition(workloadClient, editorItem.id, updatedDefinition);
      addLog("[SUCCESS] Failed operation history saved");
      
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

  function handleViewOperationLogs(operation: WorkspaceOperation) {
    setSelectedOperation(operation);
    setShowOperationLogsDialog(true);
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
  const hasSelectedSemanticModel = workspaceItems.filter(item => item.selected && item.type === 'SemanticModel').length === 1;

  if (isLoadingData) {
    return (<ItemEditorLoadingProgressBar 
      message="Loading Workspace Manager..." />);
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
            hasSelectedSemanticModel={hasSelectedSemanticModel}
            saveItemCallback={SaveItem}
            openSettingsCallback={openSettings}
            refreshWorkspaceCallback={refreshWorkspaceItems}
            bulkCopyCallback={handleBulkCopy}
            bulkDeleteCallback={handleBulkDelete}
            rebindReportCallback={handleRebindReport}
            cloneSemanticModelCallback={handleCloneSemanticModel}
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
              <h2>Workspace Manager</h2>
              
              {/* Workspace Information Section */}
              <div className="section" data-testid='workspace-manager-metadata'>
                <Field label="Item ID" orientation="horizontal" className="field">
                  <Label>{editorItem?.id}</Label>
                </Field>
                <Field label="Item Type" orientation="horizontal" className="field">
                  <Label>{editorItem?.type}</Label>
                </Field>
                <Field label="Item Name" orientation="horizontal" className="field">
                  <Label>{editorItem?.displayName}</Label>
                </Field>
                <Field label="Workspace ID" orientation="horizontal" className="field">
                  <Label>{editorItem?.workspaceId}</Label>
                </Field>
                {editorItem?.definition?.lastSync && (
                  <Field label="Last Synced" orientation="horizontal" className="field">
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
                      <Card 
                        key={operation.id}
                        style={{ cursor: operation.logs ? 'pointer' : 'default' }}
                        onClick={() => operation.logs && handleViewOperationLogs(operation)}
                      >
                        <CardHeader
                          header={
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Badge 
                                appearance="filled" 
                                color={operation.status === 'failed' ? 'danger' : operation.type === 'delete' ? 'warning' : 'success'}
                              >
                                {operation.type.toUpperCase()}
                              </Badge>
                              <Text weight="semibold">
                                {operation.sourceItems.length} item{operation.sourceItems.length !== 1 ? 's' : ''}
                              </Text>
                              <Badge appearance="outline" color={operation.status === 'completed' ? 'success' : operation.status === 'failed' ? 'danger' : 'warning'}>
                                {operation.status}
                              </Badge>
                              <Text size={200} style={{ color: '#6b6b6b' }}>
                                {new Date(operation.timestamp).toLocaleString()}
                              </Text>
                              {operation.logs && (
                                <Text size={200} style={{ color: '#0078d4', marginLeft: 'auto' }}>
                                  [INFO] View logs
                                </Text>
                              )}
                            </div>
                          }
                          description={
                            operation.errorMessage ? (
                              <Text size={200} style={{ color: '#d13438' }}>
                                {operation.errorMessage}
                              </Text>
                            ) : operation.clonedItemName ? (
                              <Text size={200} style={{ color: '#6b6b6b' }}>
                                Created: {operation.clonedItemName}
                              </Text>
                            ) : undefined
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

        {/* Clone Progress Dialog */}
        <Dialog open={showCloneProgressDialog} modalType="non-modal">
          <DialogSurface style={{ maxWidth: '600px', minWidth: '600px' }}>
            <DialogBody>
              <DialogTitle>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Spinner size="small" />
                  <span>Cloning Semantic Model</span>
                </div>
              </DialogTitle>
              <DialogContent>
                <div style={{ 
                  height: '400px',
                  overflowY: 'auto', 
                  fontFamily: 'monospace', 
                  fontSize: '12px',
                  backgroundColor: '#f5f5f5',
                  padding: '12px',
                  borderRadius: '4px',
                  border: '1px solid #e0e0e0'
                }}>
                  {cloneProgressLogs.map((log, index) => (
                    <div key={index} style={{ marginBottom: '4px' }}>
                      {log}
                    </div>
                  ))}
                  {cloneProgressLogs.length === 0 && (
                    <Text>Initializing clone operation...</Text>
                  )}
                </div>
                <div style={{ marginTop: '12px' }}>
                  <Text size={200} style={{ color: '#6b6b6b' }}>
                    This may take up to a minute depending on the size of the semantic model.
                  </Text>
                </div>
              </DialogContent>
              <DialogActions>
                <Button 
                  appearance="secondary" 
                  onClick={() => setShowCloneProgressDialog(false)}
                >
                  Close
                </Button>
              </DialogActions>
            </DialogBody>
          </DialogSurface>
        </Dialog>

        {/* Operation Logs Dialog */}
        <Dialog open={showOperationLogsDialog} onOpenChange={(_, data) => setShowOperationLogsDialog(data.open)}>
          <DialogSurface style={{ maxWidth: '700px', minWidth: '700px' }}>
            <DialogBody>
              <DialogTitle>
                Operation Logs
              </DialogTitle>
              <DialogContent>
                {selectedOperation && (
                  <>
                    <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                        <Badge appearance="filled" color={selectedOperation.status === 'failed' ? 'danger' : 'success'}>
                          {selectedOperation.type.toUpperCase()}
                        </Badge>
                        <Badge appearance="outline" color={selectedOperation.status === 'completed' ? 'success' : 'danger'}>
                          {selectedOperation.status}
                        </Badge>
                      </div>
                      
                      {/* Operation ID */}
                      <Text size={200} style={{ display: 'block', marginBottom: '8px', color: '#424242' }}>
                        <strong>Operation ID:</strong> {selectedOperation.id}
                      </Text>
                      
                      {/* Timing Information */}
                      <div style={{ marginBottom: '8px' }}>
                        {selectedOperation.startTime && (
                          <Text size={200} style={{ display: 'block', marginBottom: '4px', color: '#424242' }}>
                            <strong>Started:</strong> {new Date(selectedOperation.startTime).toLocaleString()}
                          </Text>
                        )}
                        {selectedOperation.endTime && (
                          <Text size={200} style={{ display: 'block', marginBottom: '4px', color: '#424242' }}>
                            <strong>Finished:</strong> {new Date(selectedOperation.endTime).toLocaleString()}
                          </Text>
                        )}
                        {selectedOperation.duration !== undefined && (
                          <Text size={200} style={{ display: 'block', marginBottom: '4px', color: '#424242' }}>
                            <strong>Duration:</strong> {(selectedOperation.duration / 1000).toFixed(1)} seconds
                          </Text>
                        )}
                      </div>
                      
                      {/* User Information */}
                      {selectedOperation.userName && (
                        <Text size={200} style={{ display: 'block', marginBottom: '8px', color: '#424242' }}>
                          <strong>Initiated by:</strong> {selectedOperation.userName}
                        </Text>
                      )}
                      
                      {/* Result Information */}
                      {selectedOperation.clonedItemName && (
                        <Text size={200} style={{ color: '#107c10', display: 'block', marginTop: '8px' }}>
                          [SUCCESS] <strong>Created:</strong> {selectedOperation.clonedItemName}
                        </Text>
                      )}
                      {selectedOperation.errorMessage && (
                        <Text size={200} style={{ color: '#d13438', display: 'block', marginTop: '8px' }}>
                          [ERROR] <strong>Error:</strong> {selectedOperation.errorMessage}
                        </Text>
                      )}
                    </div>
                    
                    <div style={{ 
                      height: '400px',
                      overflowY: 'auto', 
                      fontFamily: 'monospace', 
                      fontSize: '12px',
                      backgroundColor: '#f5f5f5',
                      padding: '12px',
                      borderRadius: '4px',
                      border: '1px solid #e0e0e0'
                    }}>
                      {selectedOperation.logs && selectedOperation.logs.length > 0 ? (
                        selectedOperation.logs.map((log, index) => (
                          <div key={index} style={{ marginBottom: '4px' }}>
                            {log}
                          </div>
                        ))
                      ) : (
                        <Text style={{ color: '#6b6b6b' }}>No logs available for this operation.</Text>
                      )}
                    </div>
                  </>
                )}
              </DialogContent>
              <DialogActions>
                <Button 
                  appearance="secondary" 
                  onClick={() => {
                    setShowOperationLogsDialog(false);
                    setSelectedOperation(null);
                  }}
                >
                  Close
                </Button>
              </DialogActions>
            </DialogBody>
          </DialogSurface>
        </Dialog>
      </Stack>
    );
  }
}