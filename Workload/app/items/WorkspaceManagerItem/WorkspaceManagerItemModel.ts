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
  type: 'copy' | 'delete' | 'move' | 'rebind' | 'clone';
  sourceItems: string[];
  targetWorkspace?: string;
  targetDatasetId?: string; // For rebind operations
  clonedItemId?: string; // For clone operations - the new item ID
  clonedItemName?: string; // For clone operations - the new item name
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  timestamp: string; // When the operation was created
  startTime?: string; // When the operation actually started
  endTime?: string; // When the operation finished
  duration?: number; // Duration in milliseconds
  userName?: string; // User who initiated the operation
  errorMessage?: string;
  logs?: string[]; // Operation logs for debugging and history
}

export const VIEW_TYPES = {
  EMPTY: 'empty',
  ITEM_BROWSER: 'item-browser',
  OPERATIONS: 'operations'
} as const;

export type CurrentView = typeof VIEW_TYPES[keyof typeof VIEW_TYPES];