import { createSignal, createMemo, batch, Accessor, Setter } from '@awc/kettlejs';
import type { AdGroupDisplay, AdGroupSearch } from './adgroup.model.js';
import type { ApiResponse, BaseStore, Paginated } from '../../infrastructure/api/types.js';


export interface BaseAdgroupStore<T> extends BaseStore<T> {
    readonly selectedId: Accessor<string | null>;
    readonly selected: Accessor<T | null>;
    readonly active: Accessor<T[]>;
    readonly totalSpend: Accessor<number>;
    readonly totalImpressions: Accessor<number>;
    readonly totalClicks: Accessor<number>;
}

const [_items,   _setItems]   = createSignal<AdGroupDisplay[]>([]);
const [_total,   _setTotal]   = createSignal(0);
const [_page,    _setPage]    = createSignal(1);
const [_loading, _setLoading] = createSignal(false);
const [_error,   _setError]   = createSignal<string | null>(null);
const [_selId,   _setSelId]   = createSignal<string | null>(null);


export const adGroupDisplayStore = {
  items:      _items,
  total:      _total,
  page:       _page,
  loading:    _loading,
  error:      _error,
  selectedId: _selId,

  selected: createMemo(() => {
    const id = _selId();
    return id ? (_items().find(g => g.id === id) ?? null) : null;
  }),

  byCampaign: (campaignId: string) =>
    createMemo(() => _items().filter(g => g.id === campaignId)),

  active: createMemo(() => _items().filter(g => g.status === 'active')),

  totalSpend:       createMemo(() => _items().reduce((s, g) => s + (g.costs || 0), 0)),
  totalImpressions: createMemo(() => _items().reduce((s, g) => s + (g.impressions || 0), 0)),
  totalClicks:      createMemo(() => _items().reduce((s, g) => s + (g.clicks || 0), 0)),

  load(page: ApiResponse<AdGroupDisplay[]>): void {
    batch(() => {
      _setItems(page.data);
      _setTotal(page.count);
      _setPage(page.page ?? 1);
      this.setLoading(false)
    });
  },

  upsert(group: AdGroupDisplay): void {
    _setItems(prev => {
      const idx = prev.findIndex(g => g.id === group.id);
      return idx >= 0
        ? prev.map((g, i) => (i === idx ? group : g))
        : [group, ...prev];
    });
  },

  remove(id: string): void {
    _setItems(prev => prev.filter(g => g.id !== id));
  },

  setLoading: _setLoading,
  setError:   _setError,
  select:     _setSelId,
} as const;

export const adGroupStore = {
  display: adGroupDisplayStore,
  search: adGroupDisplayStore,
}
