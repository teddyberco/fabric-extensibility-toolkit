import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { Stack } from "@fluentui/react";
import { Button } from "@fluentui/react-components";
import { useTranslation } from "react-i18next";
import { PageProps, ContextProps } from "../../App";
import { ItemWithDefinition, getWorkloadItem, callGetItem, saveItemDefinition, callGetItemDefinition, convertGetItemResultToWorkloadItem } from "../../controller/ItemCRUDController";
import { callOpenSettings } from "../../controller/SettingsController";
import { callNotificationOpen } from "../../controller/NotificationController";
import { ItemEditorLoadingProgressBar } from "../../controls/ItemEditorLoadingProgressBar";
import { ExcelEditItemDefinition, VIEW_TYPES, CurrentView, ExcelEditWorkflowState, isWorkflowStateValid, createEmptyWorkflowState } from "./ExcelEditItemModel";
import { ExcelEditItemEditorEmpty } from "./ExcelEditItemEditorEmpty";
import { ExcelEditItemEditorDefault } from "./ExcelEditItemEditorDefault";
import "../../styles.scss";
import { ExcelEditItemRibbon } from "./ExcelEditItemRibbon";


export function ExcelEditItemEditor(props: PageProps) {
  const { workloadClient } = props;
  const pageContext = useParams<ContextProps>();
  const { t } = useTranslation();

  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [item, setItem] = useState<ItemWithDefinition<ExcelEditItemDefinition>>();
  const [currentView, setCurrentView] = useState<CurrentView>(VIEW_TYPES.EMPTY);
  const [hasBeenSaved, setHasBeenSaved] = useState<boolean>(false);
  const [sparkSessionId, setSparkSessionId] = useState<string | null>(null);
  const [isSparkSessionStarting, setIsSparkSessionStarting] = useState(false);

  const { pathname } = useLocation();

  async function loadDataFromUrl(pageContext: ContextProps, pathname: string): Promise<void> {
    setIsLoading(true);
    var LoadedItem: ItemWithDefinition<ExcelEditItemDefinition> = undefined;
    if (pageContext.itemObjectId) {
      // for Edit scenario we get the itemObjectId and then load the item via the workloadClient SDK
      try {
        LoadedItem = await getWorkloadItem<ExcelEditItemDefinition>(
          workloadClient,
          pageContext.itemObjectId,
        );

        // Ensure item definition is properly initialized without mutation
        if (!LoadedItem.definition) {
          LoadedItem = {
            ...LoadedItem,
            definition: {
              state: undefined,
            }
          };
        }
        else {
          console.log('LoadedItem definition: ', LoadedItem.definition);
        }

        setItem(LoadedItem);
        
        // Smart view determination based on saved state
        const workflowState = LoadedItem?.definition?.state as ExcelEditWorkflowState;
        if (!LoadedItem?.definition?.state || !isWorkflowStateValid(workflowState)) {
          // No valid state - show empty view to start workflow
          setCurrentView(VIEW_TYPES.EMPTY);
          console.log('📍 No valid state found - showing empty view');
        } else {
          // Always default to canvas overview unless explicitly in active editing
          // This ensures the user sees the table list by default after reopening
          setCurrentView(VIEW_TYPES.CANVAS_OVERVIEW);
          console.log('📍 Defaulting to canvas overview (table list)');
        }

      } catch (error) {
        setItem(undefined);
      }
    } else {
      console.log(`non-editor context. Current Path: ${pathname}`);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    setHasBeenSaved(false);
  }, [currentView, item?.id]);

  useEffect(() => {
    loadDataFromUrl(pageContext, pathname);
  }, [pageContext, pathname]);

  // Determine current view based on item state - only for initial load
  useEffect(() => {
    console.log('🔄 useEffect: Determining view based on item state:', item?.definition?.state);
    
    if (!item?.definition?.state) {
      console.log('📍 useEffect: No state - showing empty view');
      setCurrentView(VIEW_TYPES.EMPTY);
      return;
    }

    // Only set view on initial load, don't override explicit navigation
    if (currentView === VIEW_TYPES.EMPTY || !currentView) {
      console.log('📍 useEffect: Initial load - defaulting to canvas overview (table list)');
      setCurrentView(VIEW_TYPES.CANVAS_OVERVIEW);
    } else {
      console.log('📍 useEffect: View already set, not overriding:', currentView);
    }
  }, [item?.definition?.state, currentView]);


  const navigateToCanvasOverview = async () => {
    console.log('🧭 navigateToCanvasOverview called');
    console.trace('🔍 Call stack for navigateToCanvasOverview:');
    if (!item) {
      console.log('❌ No item available for navigation');
      return;
    }
    
    console.log('📍 Current item state before navigation:', item.definition?.state);
    
    // Reload the item to get the fresh state (after table selection save)
    try {
      console.log('🔄 Reloading item to get fresh state...');
      const freshItem = await callGetItem(workloadClient, item.id);
      const freshDefinition = await callGetItemDefinition(workloadClient, item.id);
      
      console.log('🔍 Debug freshItem:', freshItem);
      console.log('🔍 Debug freshDefinition:', freshDefinition);
      console.log('🔍 Debug freshDefinition.definition:', freshDefinition?.definition);
      
      // Use the proper convertGetItemResultToWorkloadItem function
      const updatedItem = convertGetItemResultToWorkloadItem<ExcelEditItemDefinition>(
        freshItem,
        freshDefinition,
        createEmptyWorkflowState() as ExcelEditItemDefinition
      );
      
      console.log('✅ Fresh item loaded:', updatedItem);
      console.log('✅ Fresh item definition:', updatedItem.definition);
      console.log('✅ Fresh item state:', updatedItem.definition?.state);
      setItem(updatedItem);
      
      // Set the view to canvas overview
      setCurrentView(VIEW_TYPES.CANVAS_OVERVIEW);
      console.log('✅ View set to CANVAS_OVERVIEW with fresh state');
    } catch (error) {
      console.error('❌ Error reloading item for navigation:', error);
      // Fallback - just set the view anyway
      setCurrentView(VIEW_TYPES.CANVAS_OVERVIEW);
    }
  };

  const navigateToTableEditor = async () => {
    console.log('🧭 navigateToTableEditor called');
    console.trace('🔍 Call stack for navigateToTableEditor:');
    if (!item) {
      console.log('❌ No item available for table editor navigation');
      return;
    }
    
    // Reload the item to get the fresh state (after editing context save)
    try {
      console.log('🔄 Reloading item to get fresh editing state...');
      const freshItem = await callGetItem(workloadClient, item.id);
      const freshDefinition = await callGetItemDefinition(workloadClient, item.id);
      
      console.log('🔍 Debug fresh editing state:', freshDefinition?.definition);
      
      // Use the proper convertGetItemResultToWorkloadItem function
      const updatedItem = convertGetItemResultToWorkloadItem<ExcelEditItemDefinition>(
        freshItem,
        freshDefinition,
        createEmptyWorkflowState() as ExcelEditItemDefinition
      );
      
      console.log('✅ Fresh item loaded for table editor:', updatedItem);
      console.log('✅ Fresh editing state:', updatedItem.definition?.state);
      setItem(updatedItem);
      
      // Set the view to table editor
      setCurrentView(VIEW_TYPES.TABLE_EDITOR);
      console.log('✅ View set to TABLE_EDITOR (L2)');
    } catch (error) {
      console.error('❌ Error reloading item for table editor navigation:', error);
      // Fallback - just set the view anyway
      setCurrentView(VIEW_TYPES.TABLE_EDITOR);
    }
  };

  const handleOpenSettings = async () => {
    if (item) {
      try {
        const item_res = await callGetItem(workloadClient, item.id);
        await callOpenSettings(workloadClient, item_res.item, 'About');
      } catch (error) {
        console.error('Failed to open settings:', error);
      }
    }
  };

  const handleStartSparkSession = async () => {
    console.log('🚀 Starting Spark session...');
    setIsSparkSessionStarting(true);
    
    try {
      // Get lakehouse info from the first canvas item with lakehouse metadata
      const workflowState = item?.definition?.state as ExcelEditWorkflowState;
      const canvasItem = workflowState?.canvasItems?.find(
        (ci: any) => ci.source?.lakehouse?.id && ci.source?.lakehouse?.workspaceId
      );

      if (!canvasItem) {
        callNotificationOpen(
          workloadClient,
          "No Lakehouse Connected",
          "Please add a table from a lakehouse first before starting a Spark session.",
          undefined,
          undefined
        );
        return;
      }

      const workspaceId = canvasItem.source.lakehouse.workspaceId;
      const lakehouseId = canvasItem.source.lakehouse.id;

      // Import Spark utilities
      const { SparkLivyClient } = await import('../../clients/SparkLivyClient');
      const { getOrCreateSparkSession } = await import('../../utils/SparkQueryHelper');

      const sparkClient = new SparkLivyClient(workloadClient);
      const session = await getOrCreateSparkSession(sparkClient, workspaceId, lakehouseId);
      
      setSparkSessionId(session.id);
      console.log('✅ Spark session ready:', session.id);

      callNotificationOpen(
        workloadClient,
        "Spark Session Ready",
        `Session ${session.id.substring(0, 8)}... is ready to process queries. Data downloads will be faster now.`,
        undefined,
        undefined
      );
    } catch (error: any) {
      console.error('❌ Error starting Spark session:', error);
      callNotificationOpen(
        workloadClient,
        "Spark Session Error",
        `Failed to start Spark session: ${error.message}`,
        undefined,
        undefined
      );
    } finally {
      setIsSparkSessionStarting(false);
    }
  };

  async function SaveItem() {
    if (!item?.definition?.state) {
      console.error('❌ No item state to save');
      return;
    }

    var successResult = await saveItemDefinition<ExcelEditItemDefinition>(
      workloadClient,
      item.id,
      item.definition
    );
    const wasSaved = Boolean(successResult);
    setHasBeenSaved(wasSaved);
    callNotificationOpen(
      props.workloadClient,
      t("ItemEditor_Saved_Notification_Title"),
      t("ItemEditor_Saved_Notification_Text", { itemName: item.displayName }),
      undefined,
      undefined
    );
  }

  const isSaveEnabled = () => {
    if (currentView === VIEW_TYPES.EMPTY) {
      return false;
    }

    if (currentView === VIEW_TYPES.CANVAS_OVERVIEW || currentView === VIEW_TYPES.TABLE_EDITOR) {
      if (hasBeenSaved) {
        return false;
      }

      if (!item?.definition?.state) {
        return true;
      }

      return false;
    }

    return false;
  };


  // Show loading state
  if (isLoading) {
    return (
      <ItemEditorLoadingProgressBar
        message={t("ExcelEditItemEditor_Loading", "Loading item...")}
      />
    );
  }

  // Render appropriate view based on state
  return (
    <Stack className="editor" data-testid="item-editor-inner">
      {/* Back to Canvas button - shown above ribbon for table editor */}
      {currentView === VIEW_TYPES.TABLE_EDITOR && (
        <div className="back-to-home-container">
          <Button 
            appearance="subtle" 
            onClick={async () => {
              console.log('🏠 Back to Canvas clicked - clearing editing state');
              
              // Clear current editing context when going back
              const currentState = item?.definition?.state as ExcelEditWorkflowState;
              if (currentState && item) {
                const updatedState: ExcelEditWorkflowState = {
                  ...currentState,
                  currentEditingItem: undefined,
                  workflowStep: 'canvas-overview'
                };
                
                console.log('🧹 Clearing editing state:', { 
                  currentEditingItem: updatedState.currentEditingItem, 
                  workflowStep: updatedState.workflowStep 
                });

                try {
                  await saveItemDefinition<ExcelEditItemDefinition>(
                    workloadClient,
                    item.id,
                    { state: updatedState }
                  );
                  
                  console.log('✅ Editing state cleared and saved');
                  
                  // Update local state
                  setItem({
                    ...item,
                    definition: {
                      ...item.definition,
                      state: updatedState
                    }
                  });
                } catch (error) {
                  console.error('❌ Failed to clear editing context:', error);
                }
              }
              
              // Navigate to canvas overview
              navigateToCanvasOverview();
            }}
            icon={<span>←</span>}
          >
            Back to Canvas
          </Button>
        </div>
      )}
      
      <ExcelEditItemRibbon
        {...props}
        isSaveButtonEnabled={isSaveEnabled()}
        currentView={currentView}
        saveItemCallback={SaveItem}
        openSettingsCallback={handleOpenSettings}
        navigateToCanvasOverviewCallback={navigateToCanvasOverview}
        startSparkSessionCallback={handleStartSparkSession}
        isSparkSessionStarting={isSparkSessionStarting}
        sparkSessionId={sparkSessionId}
      />
      {currentView === VIEW_TYPES.EMPTY ? (
        <ExcelEditItemEditorEmpty
          workloadClient={workloadClient}
          item={item}
          onNavigateToCanvasOverview={navigateToCanvasOverview}
        />
      ) : currentView === VIEW_TYPES.CANVAS_OVERVIEW ? (
        <ExcelEditItemEditorDefault
          workloadClient={workloadClient}
          item={item}
          currentView={currentView}
          onNavigateToTableEditor={navigateToTableEditor}
          sparkSessionId={sparkSessionId}
        />
      ) : (
        <ExcelEditItemEditorDefault
          workloadClient={workloadClient}
          item={item}
          currentView={currentView}
          onNavigateToCanvasOverview={navigateToCanvasOverview}
          sparkSessionId={sparkSessionId}
        />
      )}
    </Stack>
  );
}
