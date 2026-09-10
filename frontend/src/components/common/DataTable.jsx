import React, { useState, useMemo } from 'react';
import { 
  Search, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Download, 
  RefreshCw, 
  Filter,
  FileSpreadsheet,
  Database,
  Plus,
  Minus
} from 'lucide-react';

export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  searchable = true,
  searchPlaceholder = 'Search records...',
  searchKeys = null,
  defaultPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  exportable = false,
  exportFileName = 'export',
  emptyMessage = 'No matching records found',
  headerActions = null,
  title = null,
  subtitle = null,
  icon: Icon = null,
  className = '',
  style = {},
  expandableRowRender = null,
  rowKey = (row, idx) => row.id ?? idx
}) {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [expandedRowKeys, setExpandedRowKeys] = useState(new Set());

  const toggleRowExpand = (key) => {
    setExpandedRowKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // 1. Client-side Search Filtering
  const filteredData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    if (!search.trim()) return data;

    const term = search.trim().toLowerCase();

    return data.filter(row => {
      const keysToSearch = searchKeys || columns.map(c => c.key).filter(Boolean);
      return keysToSearch.some(k => {
        const val = row[k];
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(term);
      });
    });
  }, [data, search, searchKeys, columns]);

  // 2. Client-side Sorting
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;

    const { key, direction } = sortConfig;
    const col = columns.find(c => c.key === key);

    return [...filteredData].sort((a, b) => {
      let aVal = a[key];
      let bVal = b[key];

      // Custom sorting function if provided on column
      if (col && typeof col.sortFn === 'function') {
        return direction === 'asc' ? col.sortFn(a, b) : col.sortFn(b, a);
      }

      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      // Number comparison
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // Date string comparison
      const aDate = Date.parse(aVal);
      const bDate = Date.parse(bVal);
      if (!isNaN(aDate) && !isNaN(bDate) && typeof aVal === 'string' && aVal.includes('-')) {
        return direction === 'asc' ? aDate - bDate : bDate - aDate;
      }

      // String comparison
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      if (aStr < bStr) return direction === 'asc' ? -1 : 1;
      if (aStr > bStr) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig, columns]);

  // 3. Pagination calculations
  const totalRecords = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedData = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, safeCurrentPage, pageSize]);

  const handleSort = (key, sortable) => {
    if (sortable === false) return;
    setSortConfig(prev => {
      if (prev.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        return { key: null, direction: 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const handleExportCSV = () => {
    if (!sortedData.length) return;

    // Determine export columns (ignore custom action columns with no key or string representation)
    const exportCols = columns.filter(c => c.key && c.exportable !== false);
    const headers = exportCols.map(c => `"${c.label.replace(/"/g, '""')}"`).join(',');

    const rows = sortedData.map(row => {
      return exportCols.map(c => {
        let val = row[c.key];
        if (val === null || val === undefined) val = '';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${exportFileName}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Visible page range for pagination controls
  const paginationRange = useMemo(() => {
    const delta = 2;
    const range = [];
    for (let i = Math.max(2, safeCurrentPage - delta); i <= Math.min(totalPages - 1, safeCurrentPage + delta); i++) {
      range.push(i);
    }
    if (safeCurrentPage - delta > 2) range.unshift('...');
    if (safeCurrentPage + delta < totalPages - 1) range.push('...');
    range.unshift(1);
    if (totalPages > 1) range.push(totalPages);
    return Array.from(new Set(range));
  }, [safeCurrentPage, totalPages]);

  const startEntry = totalRecords === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endEntry = Math.min(safeCurrentPage * pageSize, totalRecords);

  return (
    <div className={`datatable-container panel ${className}`} style={{ ...style }}>
      {/* Optional Panel Header */}
      {(title || headerActions) && (
        <div className="panel-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          {title && (
            <div>
              <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {Icon && <Icon size={16} color="var(--accent)" />}
                <span>{title}</span>
                <span className="badge badge-gray" style={{ fontSize: '0.68rem', fontWeight: 700 }}>
                  {totalRecords} records
                </span>
              </div>
              {subtitle && (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {subtitle}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
            {exportable && sortedData.length > 0 && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={handleExportCSV}
                title="Export filtered records to CSV file"
                style={{ fontSize: '0.72rem', padding: '4px 8px' }}
              >
                <Download size={13} /> Export CSV
              </button>
            )}
            {headerActions}
          </div>
        </div>
      )}

      {/* Toolbar: Search Input + Page Size Selector */}
      <div className="datatable-toolbar" style={{
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap',
        background: 'var(--bg-input)',
        borderBottom: '1px solid var(--border-color)'
      }}>
        {/* Search Box */}
        {searchable && (
          <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '380px' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              style={{
                paddingLeft: '32px',
                paddingRight: search ? '30px' : '10px',
                paddingTop: '6px',
                paddingBottom: '6px',
                fontSize: '0.78rem',
                width: '100%',
                borderRadius: 'var(--radius-sm)'
              }}
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1); // reset to page 1 on search
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setCurrentPage(1);
                }}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 2
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>
        )}

        {/* Right side controls: Page Size Selector & Record Count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
          <span>Show</span>
          <select
            className="form-select"
            style={{ width: 'auto', padding: '4px 22px 4px 8px', fontSize: '0.74rem' }}
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            {pageSizeOptions.map(opt => (
              <option key={opt} value={opt}>{opt} entries</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="table-wrap" style={{ minHeight: loading ? '140px' : 'auto' }}>
        <table className="data-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              {expandableRowRender && (
                <th style={{ width: '42px', textAlign: 'center', padding: '8px 4px', userSelect: 'none' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}></span>
                </th>
              )}
              {columns.map((col, idx) => {
                const isSortable = col.sortable !== false && col.key;
                const isSorted = sortConfig.key === col.key;

                return (
                  <th
                    key={col.key || idx}
                    style={{
                      cursor: isSortable ? 'pointer' : 'default',
                      textAlign: col.align || 'left',
                      width: col.width || 'auto',
                      userSelect: 'none',
                      whiteSpace: 'nowrap'
                    }}
                    onClick={() => handleSort(col.key, col.sortable)}
                    title={isSortable ? 'Click to sort column' : ''}
                  >
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      justifyContent: col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start',
                      width: '100%'
                    }}>
                      <span>{col.label}</span>
                      {isSortable && (
                        <span style={{ color: isSorted ? 'var(--accent)' : 'var(--text-muted)', display: 'inline-flex' }}>
                          {isSorted ? (
                            sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                          ) : (
                            <ArrowUpDown size={11} style={{ opacity: 0.5 }} />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + (expandableRowRender ? 1 : 0)} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                    <RefreshCw size={16} className="animate-spin" color="var(--accent)" />
                    <span>Loading datatable records...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length > 0 ? (
              paginatedData.map((row, rowIdx) => {
                const key = typeof rowKey === 'function' ? rowKey(row, rowIdx) : (row[rowKey] ?? rowIdx);
                const isExpanded = expandedRowKeys.has(key);

                return (
                  <React.Fragment key={key}>
                    <tr className={isExpanded ? 'row-expanded-parent' : ''} style={{ transition: 'background-color 0.15s ease' }}>
                      {expandableRowRender && (
                        <td style={{ width: '42px', textAlign: 'center', verticalAlign: 'middle', padding: '6px 4px' }}>
                          <button
                            type="button"
                            className="btn-row-expand"
                            onClick={() => toggleRowExpand(key)}
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '5px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: isExpanded ? 'var(--accent)' : 'var(--bg-surface)',
                              color: isExpanded ? '#ffffff' : 'var(--text-secondary)',
                              border: '1px solid var(--border-color)',
                              cursor: 'pointer',
                              padding: 0,
                              transition: 'all 0.15s ease'
                            }}
                            title={isExpanded ? 'Collapse row details' : 'Expand row details'}
                          >
                            {isExpanded ? <Minus size={13} strokeWidth={2.5} /> : <Plus size={13} strokeWidth={2.5} />}
                          </button>
                        </td>
                      )}
                      {columns.map((col, colIdx) => (
                        <td
                          key={col.key || colIdx}
                          style={{
                            textAlign: col.align || 'left',
                            verticalAlign: 'middle'
                          }}
                        >
                          {col.render ? col.render(row, rowIdx) : row[col.key]}
                        </td>
                      ))}
                    </tr>
                    {expandableRowRender && isExpanded && (
                      <tr key={`${key}-child`} className="row-expanded-child">
                        <td
                          colSpan={columns.length + 1}
                          style={{
                            padding: '14px 18px',
                            background: 'var(--bg-input)',
                            borderBottom: '1px solid var(--border-color)',
                            borderTop: '1px dashed var(--border-color)'
                          }}
                        >
                          {expandableRowRender(row, rowIdx)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <tr>
                <td colSpan={columns.length + (expandableRowRender ? 1 : 0)} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <Database size={24} style={{ opacity: 0.3 }} />
                    <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{emptyMessage}</div>
                    {search && (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ marginTop: '4px', fontSize: '0.72rem' }}
                        onClick={() => setSearch('')}
                      >
                        Clear search query "{search}"
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="datatable-footer" style={{
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        background: 'var(--bg-input)',
        borderTop: '1px solid var(--border-color)',
        fontSize: '0.75rem',
        color: 'var(--text-secondary)'
      }}>
        {/* Counter */}
        <div>
          Showing <strong>{startEntry}</strong> to <strong>{endEntry}</strong> of <strong>{totalRecords}</strong> entries
          {search && sortedData.length !== data.length && (
            <span style={{ marginLeft: '4px', color: 'var(--text-muted)' }}>
              (filtered from {data.length} total records)
            </span>
          )}
        </div>

        {/* Pagination Buttons */}
        {totalPages > 1 && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ padding: '3px 6px' }}
              disabled={safeCurrentPage === 1}
              onClick={() => setCurrentPage(1)}
              title="First Page"
            >
              <ChevronsLeft size={13} />
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ padding: '3px 6px' }}
              disabled={safeCurrentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              title="Previous Page"
            >
              <ChevronLeft size={13} />
            </button>

            {paginationRange.map((p, idx) => (
              p === '...' ? (
                <span key={`ellipsis-${idx}`} style={{ padding: '0 4px', color: 'var(--text-muted)' }}>...</span>
              ) : (
                <button
                  key={p}
                  type="button"
                  className={`btn btn-sm ${safeCurrentPage === p ? 'btn-primary' : 'btn-outline'}`}
                  style={{
                    padding: '3px 8px',
                    minWidth: '28px',
                    fontSize: '0.72rem',
                    fontWeight: safeCurrentPage === p ? 700 : 500
                  }}
                  onClick={() => setCurrentPage(p)}
                >
                  {p}
                </button>
              )
            ))}

            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ padding: '3px 6px' }}
              disabled={safeCurrentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              title="Next Page"
            >
              <ChevronRight size={13} />
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ padding: '3px 6px' }}
              disabled={safeCurrentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
              title="Last Page"
            >
              <ChevronsRight size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
