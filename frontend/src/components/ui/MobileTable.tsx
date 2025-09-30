import React, { useState } from 'react';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

interface Column {
  key: string;
  header: string;
  className?: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface MobileTableProps {
  data: any[];
  columns: Column[];
  keyField: string;
  className?: string;
  onRowClick?: (row: any) => void;
}

const MobileTable: React.FC<MobileTableProps> = ({
  data,
  columns,
  keyField,
  className = '',
  onRowClick
}) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const toggleRowExpansion = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedData = React.useMemo(() => {
    if (!sortColumn) return data;
    
    return [...data].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      
      if (sortDirection === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });
  }, [data, sortColumn, sortDirection]);

  return (
    <div className={`${className}`}>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  onClick={() => handleSort(column.key)}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 ${column.className || ''}`}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.header}</span>
                    {sortColumn === column.key && (
                      sortDirection === 'asc' ? 
                        <ChevronUpIcon className="h-4 w-4" /> : 
                        <ChevronDownIcon className="h-4 w-4" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.map((row) => (
              <tr
                key={row[keyField]}
                onClick={() => onRowClick && onRowClick(row)}
                className={onRowClick ? 'hover:bg-gray-50 cursor-pointer' : ''}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-6 py-4 whitespace-nowrap text-sm ${column.className || ''}`}
                  >
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {sortedData.map((row) => {
          const isExpanded = expandedRows.has(row[keyField]);
          const primaryColumn = columns[0];
          const secondaryColumns = columns.slice(1);

          return (
            <div
              key={row[keyField]}
              className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden"
            >
              {/* Card Header */}
              <div
                onClick={() => {
                  if (onRowClick) onRowClick(row);
                  toggleRowExpansion(row[keyField]);
                }}
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {primaryColumn.render ? 
                      primaryColumn.render(row[primaryColumn.key], row) : 
                      row[primaryColumn.key]
                    }
                  </div>
                  {secondaryColumns.length > 1 && (
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      {secondaryColumns[0].render ? 
                        secondaryColumns[0].render(row[secondaryColumns[0].key], row) : 
                        row[secondaryColumns[0].key]
                      }
                    </div>
                  )}
                </div>
                <div className="ml-4 flex-shrink-0">
                  {isExpanded ? 
                    <ChevronUpIcon className="h-5 w-5 text-gray-400" /> : 
                    <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                  }
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
                  <div className="grid grid-cols-2 gap-3">
                    {secondaryColumns.map((column) => (
                      <div key={column.key}>
                        <dt className="text-xs font-medium text-gray-500 uppercase">
                          {column.header}
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {column.render ? 
                            column.render(row[column.key], row) : 
                            row[column.key]
                          }
                        </dd>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {data.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No data available</p>
        </div>
      )}
    </div>
  );
};

export default MobileTable;