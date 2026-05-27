/**
 * JSX wrappers for adafri web components.
 *
 * Each export is a createComponent()-generated JSX component that:
 *  - Has full TypeScript types derived from the element class
 *  - Receives arrays/objects as DOM properties (not stringified attributes)
 *  - Binds custom events via addEventListener + reactive cleanup
 *
 * Usage:
 *   import { AccountsSelector } from '../ui/web-components.js';
 *
 *   <AccountsSelector
 *     accounts={act.accounts()}
 *     selected={act.account()?.id}
 *     onChange={(e) => act.select(e.detail)}
 *   />
 */

import { createJsxComponent as createComponent, EventName } from '@awc/kettlejs';
import { AdfAccountsSelector, AdfAccountsSelectorChangedEvent, AdfAccountsSelectorLoadedEvent } from '@awc/adf-accounts-selector';
import { AdfTable, AdfTableCell, AdfTableRow, AdfTableOptions, AdfTableCellClickEvent, AdfTableRowClickEvent, AdfTableSelectionChangeEvent, AdfTablePaginatorChangeEvent, AdfTableRowReorderEvent } from '@awc/adf-table';
import DOM from "@awc/dom"
// import '@awc/adf-accounts-selector/adf-accounts-selector.js';

export const AccountsSelector = createComponent({
  tagName:      'adf-accounts-selector',
  elementClass: AdfAccountsSelector,
  compiler: DOM,
  events: {
    onChange: 'change' as EventName<AdfAccountsSelectorChangedEvent>,
    onLoaded: 'loaded' as EventName<AdfAccountsSelectorLoadedEvent>,
  },
  displayName: 'AccountsSelector',
});
const TableComponent = createComponent({
    tagName: "adf-table",
    elementClass: AdfTable,
    compiler: DOM,
    displayName: "AdfTable",
    events: {
        onRowClick: 'row-click' as EventName<AdfTableRowClickEvent>,
        onCellClick: 'cell-click' as EventName<AdfTableCellClickEvent>,
        onSelectionChange: 'selection-change' as EventName<AdfTableSelectionChangeEvent>,
        onSortChange: 'sort-change' as EventName<CustomEvent>,
        onPageChange: 'page-change' as EventName<AdfTablePaginatorChangeEvent>,
        onRowReorder: 'row-reorder' as EventName<AdfTableRowReorderEvent>
    }
});

export const TableRow = createComponent({
    tagName: "adf-table-row",
    elementClass: AdfTableRow,
    compiler: DOM,
    displayName: "AdfTableRow"
});
export const TableCell = createComponent({
    tagName: "adf-table-cell",
    elementClass: AdfTableCell,
    compiler: DOM,
    displayName: "AdfTableCell"
});

export const Table = Object.assign(TableComponent, {
    Row: TableRow,
    Cell: TableCell
})
