export interface Column<T> {
  key:       string;
  header:    string;
  render?:   (row: T) => unknown;
  width?:    string;
  align?:    'left' | 'center' | 'right';
  sortable?: boolean;
}

interface TableProps<T> {
  columns:   Column<T>[];
  rows:      T[];
  keyField:  keyof T;
  loading?:  boolean;
  empty?:    string;
  onRowClick?: (row: T) => void;
}

export function Table<T extends Record<string, unknown>>({
  columns,
  rows,
  keyField,
  loading  = false,
  empty    = 'No data',
  onRowClick,
}: TableProps<T>) {
  if (loading) {
    console.log('columns', columns, loading)
    return (
      <div class="table-container">
        <div class="table-loading" aria-label="Loading table data">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} class="table-skeleton-row" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            {columns?.map(col => (
              <th
                key={col.key}
                style={col.width ? `width:${col.width}` : undefined}
                class={`text-${col.align ?? 'left'}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0
            ? (
              <tr>
                <td colspan={columns.length} class="table-empty">{empty}</td>
              </tr>
            )
            : rows.map(row => (
              <tr
                key={String(row[keyField as string])}
                class={onRowClick ? 'table-row-clickable' : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map(col => (
                  <td key={col.key} class={`text-${col.align ?? 'left'}`}>
                    {col.render ? col.render(row) : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          }
        </tbody>
      </table>
    </div>
  );
}
