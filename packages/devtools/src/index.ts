// @fluixi/devtools: live inspector for the Fluixi reactive graph.
// Instrumented signal/memo/effect register into a graph; createGraphView renders + animates the
// State → Memo → Effect propagation.
//
//   import { createReactor, createGraphView } from '@fluixi/devtools';
//
//   const reactor = createReactor();
//   reactor.run(({ createSignal, createMemo, createEffect }) => {
//     const [count, setCount] = createSignal(0, { name: 'count' });
//     const double = createMemo(() => count() * 2, { name: 'double' });
//     createEffect(() => console.log(double()), { name: 'log' });
//     setInterval(() => setCount((n) => n + 1), 1000);
//   });
//
//   const view = createGraphView(svgEl);
//   const tick = () => { reactor.sample(); view.update(reactor.graph); requestAnimationFrame(tick); };
//   tick();
export { createReactor, nodeVersion, nodeState } from './instrument.js';
export type { Reactor, ReactorApi, RNode, NodeKind, NodeState } from './instrument.js';
export { observeGraph } from './observe.js';
export type { ObservedGraph, ObserveOptions } from './observe.js';
export { installDevtoolsHook } from './hook.js';
export type { DevtoolsHook } from './hook.js';
export { formatValue, shorten } from './format.js';
export { callSite, currentCallSite } from './callsite.js';
export { serializeGraph, snapshotToRenderMap, applySnapshot } from './wire.js';
export type { GraphSnapshot, WireNode, SerializeOptions } from './wire.js';
export { toCommits } from './history.js';
export type { GraphEvent, GraphEventKind, Commit, History } from './history.js';
export { markReactiveSource } from './source.js';
export type { ReactiveSourceLocation, ReactiveSourceMetadata } from './source.js';
export { createGraphView, DEVTOOLS_CSS } from './graph-view.js';
export { createInspector, INSPECTOR_CSS } from './inspector.js';
export { createValuePane, VALUE_PANE_CSS } from './value-pane.js';
export type { ValuePane } from './value-pane.js';
export { indentValue } from './format.js';
export type { Inspector, InspectorOptions, ElementInspection } from './inspector.js';
export { createTimeline, TIMELINE_CSS } from './timeline.js';
export type { Timeline, TimelineOptions } from './timeline.js';
export { shortenPath } from './path.js';
export { registerDevtoolsPlugin, devtoolsPlugins, annotationOf, pluginRows, pluginBadge } from './plugin.js';
export type {
  DevtoolsPlugin,
  CollectContext,
  DirectiveReport,
  PluginNode,
  PluginRow,
} from './plugin.js';
export { createComponentTree, componentTree, TREE_KINDS, TREE_CSS } from './tree.js';
export { showHighlight, hideHighlight, removeHighlight, startPicking } from './highlight.js';
export { makeFloatable, FLOAT_CSS } from './float.js';
export type { Floatable, FloatOptions } from './float.js';
export type { PickOptions } from './highlight.js';
export type { ComponentTree, ComponentTreeOptions, TreeNode, ElementPick } from './tree.js';
export { createKindFilter, FILTERABLE_KINDS, DROPDOWN_FILTER_CSS, KIND_FILTER_CSS } from './kind-filter.js';
export type { KindFilter, KindFilterOptions } from './kind-filter.js';
export type { DomNode } from './dom.js';
export { createMenu, MENU_CSS } from './menu.js';
export type { Menu, MenuItem, MenuOptions } from './menu.js';
export { createDetailPanel, DETAIL_PANEL_CSS } from './detail-panel.js';
export type { DetailPanel, DetailPanelOptions } from './detail-panel.js';
export { changeRows, handleCopyClick, CHANGE_CSS } from './change-view.js';
export { copyText } from './copy.js';
export { exportGraph, graphToJson } from './export.js';
export type { ExportedGraph, ExportOptions } from './export.js';
export { diffValues } from './diff.js';
export type { ValueChange, ChangeEntry, ChangeOp } from './diff.js';
export { describeNode } from './describe.js';
export type { DomTarget } from './instrument.js';
export type { GraphView, GraphViewOptions, GraphDirection } from './graph-view.js';
