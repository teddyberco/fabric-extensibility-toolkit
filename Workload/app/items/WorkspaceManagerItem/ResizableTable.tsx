import React, { useState, useRef, useEffect } from 'react';
import { Checkbox, Text, Badge } from '@fluentui/react-components';
import { WorkspaceItem } from './WorkspaceManagerItemModel';
import '../../styles.scss';

interface Column {
  id: string;
  label: string;
  width: number;
  minWidth: number;
  render: (item: WorkspaceItem) => React.ReactNode;
}

interface ResizableTableProps {
  items: WorkspaceItem[];
  onSelectionChange: (itemId: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
}

export const ResizableTable: React.FC<ResizableTableProps> = ({ items, onSelectionChange, onSelectAll }) => {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    select: 80,
    name: 250,
    type: 220,
    description: 300,
  });

  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  // Define columns dynamically to always use latest props
  const columns: Column[] = React.useMemo(() => [
    {
      id: 'select',
      label: 'Select',
      width: columnWidths.select,
      minWidth: 60,
      render: (item) => (
        <Checkbox
          checked={item.selected || false}
          onChange={(_, data) => onSelectionChange(item.id, data.checked === true)}
        />
      ),
    },
    {
      id: 'name',
      label: 'Name',
      width: columnWidths.name,
      minWidth: 150,
      render: (item) => <Text weight="semibold">{item.displayName}</Text>,
    },
    {
      id: 'type',
      label: 'Type',
      width: columnWidths.type,
      minWidth: 180,
      render: (item) => <Badge appearance="outline">{item.type}</Badge>,
    },
    {
      id: 'description',
      label: 'Description',
      width: columnWidths.description,
      minWidth: 200,
      render: (item) => <Text>{item.description || 'No description'}</Text>,
    },
  ], [columnWidths, onSelectionChange, items]);

  const handleMouseDown = (columnId: string, minWidth: number, currentWidth: number, e: React.MouseEvent) => {
    e.preventDefault();
    setResizingColumn(columnId);
    startXRef.current = e.clientX;
    startWidthRef.current = currentWidth;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (resizingColumn === null) return;

      const diff = e.clientX - startXRef.current;
      const column = columns.find(c => c.id === resizingColumn);
      if (!column) return;

      const newWidth = Math.max(
        column.minWidth,
        startWidthRef.current + diff
      );

      setColumnWidths((prev) => ({
        ...prev,
        [resizingColumn]: newWidth
      }));
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
    };

    if (resizingColumn !== null) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColumn, columns]);

  const allSelected = items.length > 0 && items.every((item) => item.selected);

  return (
    <table className="resizable-table">
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.id} style={{ width: `${column.width}px` }}>
              {column.id === 'select' ? (
                <Checkbox
                  checked={allSelected}
                  onChange={(_, data) => onSelectAll(data.checked === true)}
                />
              ) : (
                column.label
              )}
              <div
                className={`resizer ${resizingColumn === column.id ? 'resizing' : ''}`}
                onMouseDown={(e) => handleMouseDown(column.id, column.minWidth, column.width, e)}
              />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id}>
            {columns.map((column) => (
              <td key={column.id} style={{ width: `${column.width}px` }}>
                {column.render(item)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
