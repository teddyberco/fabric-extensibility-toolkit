import React from "react";
import { Tab, TabList } from '@fluentui/react-tabs';
import { Toolbar } from '@fluentui/react-toolbar';
import {
  ToolbarButton, Tooltip
} from '@fluentui/react-components';
import {
  Save24Regular,
  Settings24Regular,
  Copy24Regular,
  Delete24Regular,
  ArrowSync24Regular,
  Link24Regular
} from "@fluentui/react-icons";
import { PageProps } from '../../App';
import '../../styles.scss';
import { t } from "i18next";

const WorkspaceManagerItemEditorRibbonHomeTabToolbar = (props: WorkspaceManagerItemEditorRibbonProps) => {

  async function onSaveClicked() {
    await props.saveItemCallback();
    return;
  }

  async function onSettingsClicked() {
    await props.openSettingsCallback();
    return;
  }

  async function onRefreshClicked() {
    if (props.refreshWorkspaceCallback) {
      await props.refreshWorkspaceCallback();
    }
    return;
  }

  async function onBulkDeleteClicked() {
    if (props.bulkDeleteCallback) {
      await props.bulkDeleteCallback();
    }
    return;
  }

  async function onBulkCopyClicked() {
    if (props.bulkCopyCallback) {
      await props.bulkCopyCallback();
    }
    return;
  }

  async function onRebindReportClicked() {
    if (props.rebindReportCallback) {
      await props.rebindReportCallback();
    }
    return;
  }

  return (
    <Toolbar>
      <Tooltip
        content={t("ItemEditor_Ribbon_Save_Label")}
        relationship="label">
        <ToolbarButton
          disabled={!props.isSaveButtonEnabled}
          aria-label={t("ItemEditor_Ribbon_Save_Label")}
          data-testid="workspace-manager-item-editor-save-btn"
          icon={<Save24Regular />}
          onClick={onSaveClicked} />
      </Tooltip>
      <Tooltip
        content={t("WorkspaceManagerItem_Ribbon_Refresh_Label")}
        relationship="label">
        <ToolbarButton
          aria-label={t("WorkspaceManagerItem_Ribbon_Refresh_Label")}
          data-testid="workspace-manager-item-editor-refresh-btn"
          icon={<ArrowSync24Regular />}
          onClick={onRefreshClicked} />
      </Tooltip>
      <Tooltip
        content={t("WorkspaceManagerItem_Ribbon_BulkCopy_Label")}
        relationship="label">
        <ToolbarButton
          aria-label={t("WorkspaceManagerItem_Ribbon_BulkCopy_Label")}
          data-testid="workspace-manager-item-editor-bulk-copy-btn"
          icon={<Copy24Regular />}
          onClick={onBulkCopyClicked}
          disabled={!props.hasSelectedItems} />
      </Tooltip>
      <Tooltip
        content={t("WorkspaceManagerItem_Ribbon_BulkDelete_Label")}
        relationship="label">
        <ToolbarButton
          aria-label={t("WorkspaceManagerItem_Ribbon_BulkDelete_Label")}
          data-testid="workspace-manager-item-editor-bulk-delete-btn"
          icon={<Delete24Regular />}
          onClick={onBulkDeleteClicked}
          disabled={!props.hasSelectedItems} />
      </Tooltip>
      <Tooltip
        content="Rebind Report to Different Semantic Model"
        relationship="label">
        <ToolbarButton
          aria-label="Rebind Report"
          data-testid="workspace-manager-item-editor-rebind-report-btn"
          icon={<Link24Regular />}
          onClick={onRebindReportClicked}
          disabled={!props.hasSelectedReport} />
      </Tooltip>
      <Tooltip
        content={t("ItemEditor_Ribbon_Settings_Label")}
        relationship="label">
        <ToolbarButton
          aria-label={t("ItemEditor_Ribbon_Settings_Label")}
          data-testid="workspace-manager-item-editor-settings-btn"
          icon={<Settings24Regular />}
          onClick={onSettingsClicked} />
      </Tooltip>
    </Toolbar>
  );
};

export interface WorkspaceManagerItemEditorRibbonProps extends PageProps {
  isRibbonDisabled?: boolean;
  isSaveButtonEnabled?: boolean;
  hasSelectedItems?: boolean;
  hasSelectedReport?: boolean;
  saveItemCallback: () => Promise<void>;
  openSettingsCallback: () => Promise<void>;
  refreshWorkspaceCallback?: () => Promise<void>;
  bulkCopyCallback?: () => Promise<void>;
  bulkDeleteCallback?: () => Promise<void>;
  rebindReportCallback?: () => Promise<void>;
}

export function WorkspaceManagerItemEditorRibbon(props: WorkspaceManagerItemEditorRibbonProps) {
  const { isRibbonDisabled } = props;
  return (
    <div className="ribbon">
      <TabList disabled={isRibbonDisabled}>
        <Tab value="home" data-testid="home-tab-btn">
          {t("ItemEditor_Ribbon_Home_Label")}
        </Tab>
      </TabList>
      <div className="toolbarContainer">
        <WorkspaceManagerItemEditorRibbonHomeTabToolbar {...props} />
      </div>
    </div>
  );
};