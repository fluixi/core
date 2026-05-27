// Page analytiques — /dashboard/analytics
// Démontre : routeData, Show, rendu de tableaux, données asynchrones
import { useRouteData } from '@awc/kettlejs/router';
import { html, Show } from '@awc/kettlejs';
import { getAnalytics, type AnalyticsData } from '../../lib/api';
import { Analytics } from '../../components/ui/jsx/components/analytics';

export const routeData = () => {
  return getAnalytics();
};

export default function AnalyticsPage() {
  const data = useRouteData<AnalyticsData>();

  return <Analytics data={data} />;
}
