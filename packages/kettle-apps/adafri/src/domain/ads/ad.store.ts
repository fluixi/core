import { createSignal, createMemo, batch } from '@awc/kettlejs';
import type { Ad } from './ad.model.js';
import type { Paginated } from '../../infrastructure/api/types.js';

const [_items,   _setItems]   = createSignal<Ad[]>([]);
const [_total,   _setTotal]   = createSignal(0);
const [_page,    _setPage]    = createSignal(1);
const [_loading, _setLoading] = createSignal(false);
const [_error,   _setError]   = createSignal<string | null>(null);
const [_selId,   _setSelId]   = createSignal<string | null>(null);

export const adStore = {
  items:      _items,
  total:      _total,
  page:       _page,
  loading:    _loading,
  error:      _error,
  selectedId: _selId,

  selected: createMemo(() => {
    const id = _selId();
    return id ? (_items().find(a => a.id === id) ?? null) : null;
  }),

  byAdGroup: (adGroupId: string) =>
    createMemo(() => _items().filter(a => a.adGroupId === adGroupId)),

  byCampaign: (campaignId: string) =>
    createMemo(() => _items().filter(a => a.campaignId === campaignId)),

  active: createMemo(() => _items().filter(a => a.status === 'active')),

  totalSpend:       createMemo(() => _items().reduce((s, a) => s + a.spend, 0)),
  totalImpressions: createMemo(() => _items().reduce((s, a) => s + a.impressions, 0)),
  totalClicks:      createMemo(() => _items().reduce((s, a) => s + a.clicks, 0)),

  load(page: Paginated<Ad>): void {
    batch(() => {
      _setItems(page.data);
      _setTotal(page.count);
      _setPage(page.page ?? 1);
    });
  },

  upsert(ad: Ad): void {
    _setItems(prev => {
      const idx = prev.findIndex(a => a.id === ad.id);
      return idx >= 0
        ? prev.map((a, i) => (i === idx ? ad : a))
        : [ad, ...prev];
    });
  },

  remove(id: string): void {
    _setItems(prev => prev.filter(a => a.id !== id));
  },

  setLoading: _setLoading,
  setError:   _setError,
  select:     _setSelId,
} as const;
