/**
 * The components `resolve` supplies without an import, declared for TypeScript.
 *
 * The compiler injects the import, so nothing in `App.tsx` imports these — which leaves
 * TypeScript reporting `Cannot find name`. Declaring them as globals makes the editor and
 * `tsc` agree with the compiler.
 *
 * `export import X = ns.X` rather than `const X: typeof import(...).X`: an alias resolves
 * to the original symbol, so hover keeps the real signature and JSDoc and
 * go-to-definition lands on the source.
 *
 * Hand-written here because the map is four entries. A component library generates this —
 * see `fluixi-ui-globals` in @fluixi-ui/resolver.
 */
import * as _summary from './components/Summary.js';
import * as _revenueChart from './components/RevenueChart.js';
import * as _exportDialog from './components/ExportDialog.js';
import * as _auditLog from './components/AuditLog.js';

declare global {
  export import Summary = _summary.Summary;
  export import RevenueChart = _revenueChart.RevenueChart;
  export import ExportDialog = _exportDialog.ExportDialog;
  export import AuditLog = _auditLog.AuditLog;
}
