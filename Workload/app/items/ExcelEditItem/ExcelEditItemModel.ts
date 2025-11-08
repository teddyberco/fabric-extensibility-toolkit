export interface ExcelEditItemDefinition  {
  state?: ExcelEditWorkflowState | string; // Support both new workflow and legacy string state
}

export interface ExcelEditWorkflowState {
  // Canvas overview state - collection of all selected tables/sources
  canvasItems?: Array<{
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
    excelWebUrl?: string; // OneDrive/SharePoint URL for Excel Online editing
    excelEmbedUrl?: string; // Office Online embed URL for preview
    excelFileId?: string; // OneDrive file ID for token refresh
    isCreatingExcel?: boolean; // Flag to indicate Excel creation in progress
  }>;
  
  // Current editing context (for L2 table editor)
  currentEditingItem?: {
    id: string;
    type: 'lakehouse-table' | 'uploaded-file' | 'external-source';
    name: string;
    displayName: string;
    excelWebUrl?: string; // OneDrive/SharePoint URL for Excel Online editing
    excelEmbedUrl?: string; // Office Online embed URL for preview
    excelFileId?: string; // OneDrive file ID for token refresh
  };
  
  // Lakehouse selection state (legacy compatibility)
  selectedLakehouse?: {
    id: string;
    name: string;
    workspaceId: string;
  };
  
  // Table selection state (legacy compatibility)
  selectedTable?: {
    name: string;
    displayName: string;
    schema: Array<{ name: string; dataType: string }>;
    rowCount: number;
  };
  
  // Available tables for selected lakehouse
  availableTables?: Array<{
    name: string;
    displayName: string;
    schema: Array<{ name: string; dataType: string }>;
    rowCount: number;
  }>;
  
  // Workflow progress tracking
  workflowStep?: 'canvas-overview' | 'table-editing' | 'completed';
  
  // Excel editing state
  excelEditingState?: {
    lastSavedPath?: string;
    lastEditedDate?: string;
    hasUnsavedChanges?: boolean;
  };
  
  // User preferences
  preferences?: {
    defaultSaveLocation?: 'lakehouse' | 'item-onelake';
    autoSave?: boolean;
  };
  
  // Legacy support
  lakehouseId?: string;
  tableId?: string;
  lastSavedPath?: string;
  lastEditedDate?: string;
}

export const VIEW_TYPES = {
  EMPTY: 'empty',
  CANVAS_OVERVIEW: 'canvas-overview',  // L1: Main canvas showing all tables/sources
  TABLE_EDITOR: 'table-editor'         // L2: Detailed table editing experience
} as const;

export type CurrentView = typeof VIEW_TYPES[keyof typeof VIEW_TYPES];

// Helper functions for state management
export function createEmptyWorkflowState(): ExcelEditWorkflowState {
  return {
    workflowStep: 'canvas-overview',
    canvasItems: [],
    preferences: {
      defaultSaveLocation: 'lakehouse',
      autoSave: false
    }
  };
}

export function isWorkflowStateValid(state?: ExcelEditWorkflowState): boolean {
  if (!state) return false;
  
  // Check if we have at least one canvas item, legacy lakehouse selection, or a selected table
  return !!(
    state.canvasItems?.length || 
    (state.selectedLakehouse?.id) ||  // Just check for lakehouse ID, not name
    (state.selectedTable?.name)       // Or if we have a selected table
  );
}

export function shouldShowCanvasOverview(state?: ExcelEditWorkflowState): boolean {
  return isWorkflowStateValid(state) && 
         (state.workflowStep === 'canvas-overview' || !state.currentEditingItem);
}

export function shouldShowTableEditor(state?: ExcelEditWorkflowState): boolean {
  return isWorkflowStateValid(state) && 
         !!(state.currentEditingItem?.id) && 
         state.workflowStep === 'table-editing';
}

export function getWorkflowStep(state?: ExcelEditWorkflowState): string {
  if (!state) return 'canvas-overview';
  
  if (shouldShowTableEditor(state)) return 'table-editing';
  if (shouldShowCanvasOverview(state)) return 'canvas-overview';
  
  return 'canvas-overview';
}
