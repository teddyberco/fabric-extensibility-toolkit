export interface ExcelEditItemDefinition  {
  state?: ExcelEditWorkflowState | string; // Support both new workflow and legacy string state
}

export interface ExcelEditWorkflowState {
  lakehouseId?: string;
  tableId?: string;
  lastSavedPath?: string;
  lastEditedDate?: string;
  workflowStep?: string;
}

export const VIEW_TYPES = {
  EMPTY: 'empty',
  GETTING_STARTED: 'getting-started'
} as const;

export type CurrentView = typeof VIEW_TYPES[keyof typeof VIEW_TYPES];
