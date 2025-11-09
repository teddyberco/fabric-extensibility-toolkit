import React from "react";
import { Tab, TabList } from '@fluentui/react-tabs';
import { Toolbar } from '@fluentui/react-toolbar';
import {
  ToolbarButton, Tooltip, Spinner
} from '@fluentui/react-components';
import {
  Settings24Regular,
  Flash24Regular,
  WindowNew24Regular,
  DatabaseArrowUp20Regular,
  Add20Regular,
  ArrowClockwise20Regular,
  CheckmarkCircle20Filled
} from "@fluentui/react-icons";
import { PageProps } from '../../App';
import { CurrentView, VIEW_TYPES } from "./ExcelEditItemModel";
import { useTranslation } from "react-i18next";
import '../../styles.scss';

/**
 * Props interface for the Excel Edit Item Ribbon component
 */
export interface ExcelEditItemRibbonProps extends PageProps {
  currentView: CurrentView;
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

  const handleStartSparkSession = async () => {
    if (props.startSparkSessionCallback) {
      await props.startSparkSessionCallback();
    }
  };

  return (
    <Toolbar>
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

      {/* Start Spark Session Button - Show in all views */}
      <Tooltip
        content={
          props.sparkSessionId 
            ? `Spark session active (${props.sparkSessionId.substring(0, 8)}...)` 
            : props.isSparkSessionStarting
            ? "Connecting to Spark session..."
            : props.currentView === VIEW_TYPES.EMPTY
            ? "Start Spark session (available after adding tables)"
            : "Start Spark session to enable faster data operations"
        }
        relationship="label">
        <ToolbarButton
          aria-label="Start Spark Session"
          data-testid="item-editor-start-spark-btn"
          icon={
            props.sparkSessionId 
              ? <CheckmarkCircle20Filled style={{ color: '#107C10' }} />
              : props.isSparkSessionStarting 
              ? <Spinner size="tiny" />
              : <Flash24Regular />
          }
          disabled={props.currentView === VIEW_TYPES.EMPTY || props.isSparkSessionStarting || !!props.sparkSessionId}
          onClick={handleStartSparkSession}
          appearance="subtle"
        >
          {props.isSparkSessionStarting ? "Connecting" : props.sparkSessionId ? "Spark Session" : "Start Spark Session"}
        </ToolbarButton>
      </Tooltip>

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
