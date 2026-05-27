import { Accessor, html, Show } from "@awc/kettlejs";
import { DashboardStats } from "../../../../lib/api";

export function DashboardHome({ stats }: {stats: Accessor<DashboardStats | undefined>}) {
      return html`
        <div>
          <h2 class="page-title">Vue d'ensemble</h2>
    
          ${Show({
            when: stats,
            fallback: html`
              <div class="stat-grid">
                ${[1, 2, 3, 4].map(() => html`
                  <div class="card stat-card">
                    <div class="skeleton" style="height:48px;width:80px;margin:0 auto .5rem"></div>
                    <div class="skeleton" style="height:14px;width:100px;margin:0 auto"></div>
                  </div>
                `)}
              </div>
            `,
            children: (s) => html`
              <div class="stat-grid">
                <div class="card stat-card">
                  <div class="stat-value">${s.users.toLocaleString()}</div>
                  <div class="stat-label">Utilisateurs actifs</div>
                </div>
                <div class="card stat-card">
                  <div class="stat-value">${s.revenue.toLocaleString()}€</div>
                  <div class="stat-label">Revenus mensuels</div>
                </div>
                <div class="card stat-card">
                  <div class="stat-value">${s.orders}</div>
                  <div class="stat-label">Commandes</div>
                </div>
                <div class="card stat-card">
                  <div class="stat-value">${s.conversion}%</div>
                  <div class="stat-label">Taux de conversion</div>
                </div>
              </div>
    
              <!-- Tableau d'activité récente -->
              <div class="card">
                <div class="card-header">Activité récente</div>
                <table class="table">
                  <thead>
                    <tr>
                      <th>Événement</th>
                      <th>Utilisateur</th>
                      <th>Date</th>
                      <th>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Nouvelle commande #389</td>
                      <td>Alice Martin</td>
                      <td>Aujourd'hui</td>
                      <td><span class="badge badge-success">Complétée</span></td>
                    </tr>
                    <tr>
                      <td>Inscription utilisateur</td>
                      <td>Charlie Petit</td>
                      <td>Hier</td>
                      <td><span class="badge badge-primary">Nouveau</span></td>
                    </tr>
                    <tr>
                      <td>Mise à jour profil</td>
                      <td>Bob Dupont</td>
                      <td>Il y a 2 jours</td>
                      <td><span class="badge badge-warning">En attente</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            `,
          })}
        </div>
      `;
}