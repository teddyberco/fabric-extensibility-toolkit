import React, { useState } from "react";
import { Button, Text } from "@fluentui/react-components";
import { CloudDatabase20Regular, DatabaseSearch20Regular } from "@fluentui/react-icons";
import { callDatahubOpen } from "../../controller/DataHubController";

import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { ExcelEditItemDefinition } from "./ExcelEditItemModel";
import "../../styles.scss";

interface ExcelEditItemEditorEmptyProps {
  workloadClient: WorkloadClientAPI;
  item?: ItemWithDefinition<ExcelEditItemDefinition>;
  onNavigateToGettingStarted: () => void;
}

/**
 * Empty state component - the first screen users see
 * This shows the lakehouse selection interface to start the Excel editing workflow
 */
export function ExcelEditItemEditorEmpty({
  workloadClient,
  item,
  onNavigateToGettingStarted
}: ExcelEditItemEditorEmptyProps) {
  const [isLoading, setIsLoading] = useState(false);

  const loadLakehouses = async () => {
    setIsLoading(true);
    
    try {
      console.log('🔍 Opening DataHub lakehouse selector...');
      
      // Use the official Fabric SDK DataHub API for lakehouse selection
      const selectedLakehouse = await callDatahubOpen(
        workloadClient,
        ["Lakehouse"],
        "Select a lakehouse to use for Excel data integration",
        false,
        true
      );
      
      if (selectedLakehouse) {
        console.log('✅ Lakehouse selected:', selectedLakehouse);
        
        // Store lakehouse selection in localStorage for the main editor to pick up
        const lakehouseInfo = {
          id: selectedLakehouse.id,
          name: selectedLakehouse.displayName,
          workspaceId: selectedLakehouse.workspaceId
        };
        localStorage.setItem('selectedLakehouse', JSON.stringify(lakehouseInfo));
        
        // Navigate to the main editor which will skip lakehouse selection
        onNavigateToGettingStarted();
      }
    } catch (err) {
      console.error('Lakehouse selection error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="empty-state-container">
      <div className="empty-state-content">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <CloudDatabase20Regular style={{ fontSize: '4rem', color: '#0078d4', marginBottom: '1rem' }} />
          <Text size={600} weight="semibold" block style={{ marginBottom: '0.5rem' }}>
            Excel Lakehouse Editor
          </Text>
          <Text size={400} block style={{ color: '#605e5c', marginBottom: '2rem' }}>
            Connect to your Fabric Lakehouse to edit data with Excel
          </Text>
        </div>

        <div style={{ maxWidth: '500px', margin: '0 auto' }}>
          {/* Step 1: Lakehouse Selection */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#0078d4', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>1</div>
              <Text weight="semibold" size={400}>Select Your Lakehouse</Text>
            </div>
            
            <div style={{ padding: '1.5rem', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e1e1e1', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <DatabaseSearch20Regular style={{ fontSize: '1.5rem', color: '#0078d4' }} />
                <div>
                  <Text weight="semibold" block>Choose a Lakehouse</Text>
                  <Text size={200} style={{ color: '#666' }}>
                    Select the lakehouse containing the data you want to edit
                  </Text>
                </div>
              </div>
              
              <Button 
                appearance="primary" 
                icon={<DatabaseSearch20Regular />}
                onClick={loadLakehouses}
                disabled={isLoading}
                style={{ width: '100%' }}
              >
                {isLoading ? 'Opening DataHub...' : 'Browse Lakehouses'}
              </Button>
              
              {isLoading && (
                <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                  <Text size={200} style={{ color: '#666' }}>
                    Opening Fabric DataHub for lakehouse selection...
                  </Text>
                </div>
              )}
            </div>
          </div>

          {/* Preview of Next Steps */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem' }}>
            <div style={{ padding: '0.75rem', backgroundColor: '#f3f2f1', borderRadius: '6px', opacity: '0.6', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#d1d1d1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>2</div>
                <Text size={200} style={{ color: '#666' }}>Select Table</Text>
              </div>
            </div>
            
            <div style={{ padding: '0.75rem', backgroundColor: '#f3f2f1', borderRadius: '6px', opacity: '0.6', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#d1d1d1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>3</div>
                <Text size={200} style={{ color: '#666' }}>Edit in Excel</Text>
              </div>
            </div>
            
            <div style={{ padding: '0.75rem', backgroundColor: '#f3f2f1', borderRadius: '6px', opacity: '0.6', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#d1d1d1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>4</div>
                <Text size={200} style={{ color: '#666' }}>Save to OneLake</Text>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
