export interface WorkspaceManagerItemDefinition {
  managedWorkspaceId?: string;
  selectedItems?: WorkspaceItem[];
  operations?: WorkspaceOperation[];
  lastSync?: string;
}

export interface WorkspaceItem {
  id: string;
  displayName: string;
  type: string;
  description?: string;
  workspaceId: string;
  selected?: boolean;
}

export interface WorkspaceOperation {
  id: string;
  type: 'copy' | 'delete' | 'move' | 'rebind';
  sourceItems: string[];
  targetWorkspace?: string;
  targetDatasetId?: string; // For rebind operations
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  timestamp: string;
  errorMessage?: string;
}

export const VIEW_TYPES = {
  EMPTY: 'empty',
  ITEM_BROWSER: 'item-browser',
  OPERATIONS: 'operations'
} as const;

export type CurrentView = typeof VIEW_TYPES[keyof typeof VIEW_TYPES];