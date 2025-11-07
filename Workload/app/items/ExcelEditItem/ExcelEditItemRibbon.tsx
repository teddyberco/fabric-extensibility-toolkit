import React from "react";
import { Tab, TabList } from '@fluentui/react-tabs';
import { Toolbar } from '@fluentui/react-toolbar';
import {
  ToolbarButton, Tooltip
} from '@fluentui/react-components';
import {
  Save24Regular,
  Settings24Regular,
  Rocket24Regular,
  Flash24Regular,
  WindowNew24Regular,
  DatabaseArrowUp20Regular,
  Add20Regular,
  ArrowClockwise20Regular
} from "@fluentui/react-icons";
import { PageProps } from '../../App';
import { CurrentView, VIEW_TYPES } from "./ExcelEditItemModel";
import { useTranslation } from "react-i18next";
import '../../styles.scss';

/**
 * Props interface for the Excel Edit Item Ribbon component
 */
export interface ExcelEditItemRibbonProps extends PageProps {
  isSaveButtonEnabled?: boolean;
  currentView: CurrentView;
  saveItemCallback: () => Promise<void>;
  openSettingsCallback: () => Promise<void>;
  navigateToCanvasOverviewCallback: () => void;
  startSparkSessionCallback?: () => Promise<void>;
  isSparkSessionStarting?: boolean;
  sparkSessionId?: string | null;
  openInExcelOnlineCallback?: () => void;
  saveToLakehouseCallback?: () => Promise<void>;
  excelWebUrl?: string;
  addTableCallback?: () => Promise<void>;
  refreshExcelCallback?: () => Promise<void>;
}


const ExcelEditItemTabToolbar: React.FC<ExcelEditItemRibbonProps> = (props) => {
  const { t } = useTranslation();


  const handleSettingsClick = async () => {
    await props.openSettingsCallback();
  };

  const handleCanvasOverviewClick = () => {
    props.navigateToCanvasOverviewCallback();
  };

  const handleStartSparkSession = async () => {
    if (props.startSparkSessionCallback) {
      await props.startSparkSessionCallback();
    }
  };

  async function onSaveAsClicked() {
    await props.saveItemCallback();
    return;
  }

  return (
    <Toolbar>
      {/* Add Table Button - Show in Empty and Canvas Overview (main page), not in Table Editor */}
      {(props.currentView === VIEW_TYPES.EMPTY || props.currentView === VIEW_TYPES.CANVAS_OVERVIEW) && props.addTableCallback && (
        <Tooltip
          content="Add a table from your Lakehouse"
          relationship="label">
          <ToolbarButton
            aria-label="Add Table"
            data-testid="item-editor-add-table-btn"
            icon={<Add20Regular />}
            onClick={props.addTableCallback}
            appearance="primary"
          >
            Add Table
          </ToolbarButton>
        </Tooltip>
      )}

      {/* Save Button - Only show in Canvas Overview and Empty views, not in Table Editor */}
      {props.currentView !== VIEW_TYPES.TABLE_EDITOR && (
        <Tooltip
          content={t("ItemEditor_Ribbon_Save_Label")}
          relationship="label">
          <ToolbarButton
            disabled={!props.isSaveButtonEnabled}
            aria-label={t("ItemEditor_Ribbon_Save_Label")}
            data-testid="item-editor-save-btn"
            icon={<Save24Regular />}
            onClick={onSaveAsClicked}
          />
        </Tooltip>
      )}

      {/* Settings Button */}
      <Tooltip
        content={t("ItemEditor_Ribbon_Settings_Label")}
        relationship="label">
        <ToolbarButton
          aria-label={t("ItemEditor_Ribbon_Settings_Label")}
          data-testid="item-editor-settings-btn"
          icon={<Settings24Regular />}
          onClick={handleSettingsClick} 
        />
      </Tooltip>

      {/* Start Spark Session Button - Show in CANVAS_OVERVIEW and TABLE_EDITOR views */}
      {(props.currentView === VIEW_TYPES.CANVAS_OVERVIEW || props.currentView === VIEW_TYPES.TABLE_EDITOR) && (
        <Tooltip
          content={
            props.sparkSessionId 
              ? `Spark session active: ${props.sparkSessionId.substring(0, 8)}...` 
              : "Start Spark Session (makes data downloads faster)"
          }
          relationship="label">
          <ToolbarButton
            aria-label="Start Spark Session"
            data-testid="item-editor-start-spark-btn"
            icon={<Flash24Regular />}
            disabled={props.isSparkSessionStarting || !!props.sparkSessionId}
            onClick={handleStartSparkSession}
            appearance={props.sparkSessionId ? "primary" : "subtle"}
          >
            {props.isSparkSessionStarting ? "Starting..." : props.sparkSessionId ? "Session Ready" : "Start Spark"}
          </ToolbarButton>
        </Tooltip>
      )}

      {/* Open in Excel Online Button - Always show in Table Editor, disabled when no URL */}
      {props.currentView === VIEW_TYPES.TABLE_EDITOR && props.openInExcelOnlineCallback && (
        <Tooltip
          content={props.excelWebUrl ? t("Open in Excel Online (Full Editor)") : t("Creating Excel file... Please wait")}
          relationship="label">
          <ToolbarButton
            aria-label={t("Open in Excel Online")}
            data-testid="open-excel-online-btn"
            icon={<WindowNew24Regular />}
            onClick={props.openInExcelOnlineCallback}
            appearance="primary"
            disabled={!props.excelWebUrl}
          >
            Open in Excel Online
          </ToolbarButton>
        </Tooltip>
      )}

      {/* Refresh Excel Button - Show in Table Editor when Excel URL exists */}
      {props.currentView === VIEW_TYPES.TABLE_EDITOR && props.refreshExcelCallback && props.excelWebUrl && (
        <Tooltip
          content="Refresh Excel (regenerate access token)"
          relationship="label">
          <ToolbarButton
            aria-label="Refresh Excel"
            data-testid="refresh-excel-btn"
            icon={<ArrowClockwise20Regular />}
            onClick={props.refreshExcelCallback}
          >
            Refresh
          </ToolbarButton>
        </Tooltip>
      )}

      {/* Save to Lakehouse Button - Only show in Table Editor */}
      {props.currentView === VIEW_TYPES.TABLE_EDITOR && props.saveToLakehouseCallback && (
        <Tooltip
          content={t("Save Excel data back to Lakehouse")}
          relationship="label">
          <ToolbarButton
            aria-label={t("Save to Lakehouse")}
            data-testid="save-to-lakehouse-btn"
            icon={<DatabaseArrowUp20Regular />}
            onClick={props.saveToLakehouseCallback}
          >
            Save to Lakehouse
          </ToolbarButton>
        </Tooltip>
      )}

      {/* Getting Started Button */}
      {props.currentView === VIEW_TYPES.EMPTY && (
      <Tooltip
        content={t("ItemEditor_Ribbon_CanvasOverview_Label", "Canvas Overview")}
        relationship="label">
        <ToolbarButton
          aria-label={t("ItemEditor_Ribbon_CanvasOverview_Label", "Canvas Overview")}
          data-testid="item-editor-canvas-overview-btn"
          icon={<Rocket24Regular />}
          onClick={handleCanvasOverviewClick}
        />
      </Tooltip>
      )}
    </Toolbar>
  );
};

/**
 * Main Ribbon component
 */
export function ExcelEditItemRibbon(props: ExcelEditItemRibbonProps) {
  const { t } = useTranslation();

  return (
    <div className="ribbon">
      {/* Only show Home tab in L1 views, not in L2 (TABLE_EDITOR) */}
      {props.currentView !== VIEW_TYPES.TABLE_EDITOR && (
        <TabList defaultSelectedValue="home">
          <Tab value="home" data-testid="home-tab-btn">
            {t("ItemEditor_Ribbon_Home_Label")}
          </Tab>
        </TabList>
      )}

      {/* Toolbar Container */}
      <div className="toolbarContainer">
        <ExcelEditItemTabToolbar {...props} />
      </div>
    </div>
  );
}
