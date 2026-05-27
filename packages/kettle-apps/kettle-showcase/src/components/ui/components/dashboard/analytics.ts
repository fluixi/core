import { Accessor, html, Show } from "@awc/kettlejs";
import { AnalyticsData } from "../../../../lib/api";

export function Analytics({ data }: {data: Accessor<AnalyticsData | undefined>}) {
  return html`
    <div>
      <h2 class="page-title">Analytiques</h2>
      <p class="page-subtitle">Données de trafic et de référencement</p>

      ${Show({
        when: data,
        fallback: html`
          <div class="skeleton" style="height:300px;margin-bottom:1rem"></div>
          <div class="skeleton" style="height:200px"></div>
        `,
        children: () => {
          const d = data();
          return html`
          <!-- Tableau des pages vues -->
          <div class="card mb-4">
            <div class="card-header">Pages les plus visitées</div>
            <table class="table">
              <thead>
                <tr><th>Page</th><th>Vues</th><th>Graphique</th></tr>
              </thead>
              <tbody>
                ${d.pageViews.map(
                  (pv) => html`
                    <tr>
                      <td>${pv.page}</td>
                      <td><strong>${pv.views.toLocaleString()}</strong></td>
                      <td>
                        <div style="background:#dbeafe;border-radius:4px;height:20px;width:${Math.round(
                          (pv.views / 5000) * 100
                        )}%"></div>
                      </td>
                    </tr>
                  `
                )}
              </tbody>
            </table>
          </div>

          <!-- Tableau des sources de trafic -->
          <div class="card">
            <div class="card-header">Sources de trafic</div>
            <table class="table">
              <thead>
                <tr><th>Source</th><th>Visites</th><th>Part</th></tr>
              </thead>
              <tbody>
                ${d.topReferrers.map((ref) => {
                  const total = d.topReferrers.reduce((s, r) => s + r.visits, 0);
                  const pct = ((ref.visits / total) * 100).toFixed(1);
                  return html`
                    <tr>
                      <td>${ref.source}</td>
                      <td>${ref.visits.toLocaleString()}</td>
                      <td><span class="badge badge-primary">${pct}%</span></td>
                    </tr>
                  `;
                })}
              </tbody>
            </table>
          </div>
        `
        },
      })}
    </div>
  `;
}