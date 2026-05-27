import { createSignal, createMemo, batch, Accessor, Setter } from '@awc/kettlejs';
import type { CampaignDisplay, CampaignSearch } from './campaign.model.js';
import type { ApiResponse, BaseStore } from '../../infrastructure/api/types.js';

const [_items,   _setItems]   = createSignal<CampaignDisplay[]>([]);
const [_total,   _setTotal]   = createSignal(0);
const [_page,    _setPage]    = createSignal(1);
const [_loading, _setLoading] = createSignal(false);
const [_error,   _setError]   = createSignal<string | null>(null);
const [_selId,   _setSelId]   = createSignal<string | null>(null);


export interface BaseCampaignStore<T> extends BaseStore<T> {
    readonly totalSpend: Accessor<number>;
    readonly totalImpressions: Accessor<number>;
    readonly totalClicks: Accessor<number>;
    readonly totalConversions: Accessor<number>;
    readonly avgCTR: Accessor<number>;
}
export const campaignDisplayStore = {
  items:   _items,
  total:   _total,
  page:    _page,
  loading: _loading,
  error:   _error,
  selectedId: _selId,

  selected: createMemo(() => {
    const id = _selId();
    return id ? (_items().find(c => c.id === id) ?? null) : null;
  }),

  active: createMemo(() => _items().filter(c => c.status === 'active')),

  totalSpend:       createMemo(() => _items().reduce((s, c) => s + (c.costs || 0), 0)),
  totalImpressions: createMemo(() => _items().reduce((s, c) => s + (c.impressions || 0), 0)),
  totalClicks:      createMemo(() => _items().reduce((s, c) => s + (c.clicks || 0), 0)),
  totalConversions: createMemo(() => _items().reduce((s, c) => s + (c.Conversions || 0), 0)),

  avgCTR: createMemo(() => {
    const imp = _items().reduce((s, c) => s + (c.impressions || 0), 0);
    const clk = _items().reduce((s, c) => s + (c.clicks || 0), 0);
    return imp > 0 ? (clk / imp) * 100 : 0;
  }),

  load(page: ApiResponse<CampaignDisplay[]>): void {
    console.log('se items', page)
    batch(() => {
      _setItems(page.data);
      _setTotal(page.count);
      _setPage(page.page ?? 1);
      campaignDisplayStore.setLoading(false)
    });
  },

  upsert(campaign: CampaignDisplay): void {
    _setItems(prev => {
      const idx = prev.findIndex(c => c.id === campaign.id);
      return idx >= 0
        ? prev.map((c, i) => (i === idx ? campaign : c))
        : [campaign, ...prev];
    });
  },

  remove(id: string): void {
    _setItems(prev => prev.filter(c => c.id !== id));
  },

  setLoading: _setLoading,
  setError:   _setError,
  select:     _setSelId,
} as const;

interface CampaignStore{ display: BaseCampaignStore<CampaignDisplay>, search: BaseCampaignStore<CampaignSearch>}
export const campaignStore: CampaignStore = {
  display: campaignDisplayStore,
  search: campaignDisplayStore
} as any as CampaignStore
