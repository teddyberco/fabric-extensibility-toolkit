import React from "react";
import { Stack } from "@fluentui/react";
import { Text, Button, Card, CardHeader } from "@fluentui/react-components";
import "../../styles.scss";
import { useTranslation } from "react-i18next";
import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { WorkspaceManagerItemDefinition } from "./WorkspaceManagerItemModel";

interface WorkspaceManagerItemEmptyStateProps {
  workloadClient: WorkloadClientAPI;
  item: ItemWithDefinition<WorkspaceManagerItemDefinition>;
  itemDefinition: WorkspaceManagerItemDefinition;
  onFinishEmpty: (definition: WorkspaceManagerItemDefinition) => void;
}

export const WorkspaceManagerItemEmpty: React.FC<WorkspaceManagerItemEmptyStateProps> = ({
  workloadClient,
  item,
  itemDefinition: definition,
  onFinishEmpty: onFinishEmpty
}) => {
  const { t } = useTranslation();
  
  const initializeWorkspaceManager = () => {
    const initialDefinition: WorkspaceManagerItemDefinition = {
      managedWorkspaceId: item.workspaceId,
      selectedItems: [],
      operations: [],
      lastSync: new Date().toISOString()
    };
    onFinishEmpty(initialDefinition);
  };
  
  return (
    <Stack className="empty-item-container" horizontalAlign="center" tokens={{ childrenGap: 16 }}>
      <Stack.Item>
        <img
          src="/assets/items/WorkspaceManagerItem/EditorEmpty.svg"
          alt="Empty workspace manager illustration"
          className="empty-item-image"
        />
      </Stack.Item>
      <Stack.Item>
        <Text as="h2" size={800} weight="semibold">
          Welcome to Workspace Manager
        </Text>
      </Stack.Item>
      <Stack.Item style={{ marginTop: '16px', marginBottom: '24px' }}>
        <Text>
          {t('WorkspaceManagerItemEditorEmpty_Message', {itemName: item.displayName})}
        </Text>
      </Stack.Item>
      <Stack.Item style={{ marginTop: '16px', marginBottom: '16px' }}>
        <Card style={{ padding: '16px', maxWidth: '400px' }}>
          <CardHeader
            header={<Text weight="semibold">What is Workspace Manager?</Text>}
          />
          <Text>
            Workspace Manager helps you efficiently manage multiple items within your current workspace. 
            You can copy items to other workspaces, delete multiple items at once, and organize your workspace content.
          </Text>
        </Card>
      </Stack.Item>
      <Stack.Item style={{ marginTop: '16px', marginBottom: '16px' }}>
        <Card style={{ padding: '16px', maxWidth: '400px' }}>
          <CardHeader
            header={<Text weight="semibold">Key Features:</Text>}
          />
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li>Browse and select items in your workspace</li>
            <li>Copy items to other workspaces</li>
            <li>Delete multiple items simultaneously</li>
            <li>Track operation history</li>
          </ul>
        </Card>
      </Stack.Item>
      <Stack.Item style={{ marginTop: '24px' }}>
        <Button appearance="primary" onClick={initializeWorkspaceManager}>
          {t('WorkspaceManagerItemEditorEmpty_Button')}
        </Button>
      </Stack.Item>
    </Stack>
  );
};