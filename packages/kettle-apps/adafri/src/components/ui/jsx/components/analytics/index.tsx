import { Accessor, Show } from "@awc/kettlejs";
import { AnalyticsData } from "../../../../../lib/api";

export function Analytics({ data }: {data: Accessor<AnalyticsData | undefined>}) {
  return (
    <div>
      <h2 className="page-title">Analytiques</h2>
      <p className="page-subtitle">Données de trafic et de référencement</p>

      <Show when={data} fallback={
            <>
                <div className="skeleton" style="height:300px;margin-bottom:1rem"></div>
                <div className="skeleton" style="height:200px"></div>
            </>
      }>
        {(d) => (<>
            <div className="card mb-4">
            <div className="card-header">Pages les plus visitées</div>
            <table className="table">
              <thead>
                <tr><th>Page</th><th>Vues</th><th>Graphique</th></tr>
              </thead>
              <tbody>
                {d.pageViews.map(
                  (pv) => (
                    <tr>
                      <td>{pv.page}</td>
                      <td><strong>{pv.views.toLocaleString()}</strong></td>
                      <td>
                        <div style={{background: "#dbeafe", borderRadius: "4px", height: "20px", width: `${Math.round((pv.views / 5000) * 100)}%`}}></div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          <div className="card">
            <div className="card-header">Sources de trafic</div>
            <table className="table">
              <thead>
                <tr><th>Source</th><th>Visites</th><th>Part</th></tr>
              </thead>
              <tbody>
                {d.topReferrers.map((ref) => {
                  const total = d.topReferrers.reduce((s, r) => s + r.visits, 0);
                  const pct = ((ref.visits / total) * 100).toFixed(1);
                  return (
                    <tr>
                      <td>{ref.source}</td>
                      <td>{ref.visits.toLocaleString()}</td>
                      <td><span className="badge badge-primary">{pct}%</span></td>
                    </tr>
                    )
                })}
              </tbody>
            </table>
          </div>
        </>)}
      </Show>
    </div>
  );
}