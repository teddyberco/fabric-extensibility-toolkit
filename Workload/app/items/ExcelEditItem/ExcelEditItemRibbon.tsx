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
  ArrowLeft24Regular
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
}


const ExcelEditItemTabToolbar: React.FC<ExcelEditItemRibbonProps> = (props) => {
  const { t } = useTranslation();


  const handleSettingsClick = async () => {
    await props.openSettingsCallback();
  };

  const handleCanvasOverviewClick = () => {
    props.navigateToCanvasOverviewCallback();
  };

  async function onSaveAsClicked() {
    await props.saveItemCallback();
    return;
  }

  return (
    <Toolbar>
      {/* Back to Home tab Button - Only show in TABLE_EDITOR view */}
      {props.currentView === VIEW_TYPES.TABLE_EDITOR && (
        <Tooltip
          content={t("ItemEditor_Ribbon_BackToHome_Label", "Back to Home tab")}
          relationship="label">
          <ToolbarButton
            aria-label={t("ItemEditor_Ribbon_BackToHome_Label", "Back to Home tab")}
            data-testid="item-editor-back-to-home-btn"
            icon={<ArrowLeft24Regular />}
            onClick={handleCanvasOverviewClick}
          >
            {t("ItemEditor_Ribbon_BackToHome_Label", "Back to Home tab")}
          </ToolbarButton>
        </Tooltip>
      )}

      {/* Save Button - Disabled */}
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
      {/* Always show Home tab for consistent navigation */}
      <TabList defaultSelectedValue="home">
        <Tab value="home" data-testid="home-tab-btn">
          {t("ItemEditor_Ribbon_Home_Label")}
        </Tab>
      </TabList>

      {/* Toolbar Container */}
      <div className="toolbarContainer">
        <ExcelEditItemTabToolbar {...props} />
      </div>
    </div>
  );
}
