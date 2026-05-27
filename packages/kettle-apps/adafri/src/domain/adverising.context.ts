import { createContext, createProvider, useContext } from "@awc/kettlejs";
import { CampaignServiceValue } from "./campaigns/service.context";
import { AdgroupServiceValue } from "./adgroups/service.context";

export interface GadsServiceValue {
  /**
   * All reactive data resources (Suspense-compatible).
   * Use .latest outside Suspense to get last known value without throwing.
   */
  campaigns: CampaignServiceValue
  adgroups: AdgroupServiceValue
}


// ── Context ────────────────────────────────────────────────────────────────────

export const GadsServiceContext = createContext<GadsServiceValue>();

export function GadsServiceProvider({ value, children, debug }: { children?: any, value: GadsServiceValue, debug?: boolean }) {
  return createProvider({ context: GadsServiceContext, value, children, debug });
}
export function useGadsService(): GadsServiceValue | null {
  return useContext(GadsServiceContext) ?? null;
}
