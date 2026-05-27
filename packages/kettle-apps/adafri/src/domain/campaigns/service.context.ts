import { createContext, createProvider, useContext } from "@awc/kettlejs";
import { ListParams,  ApiResponse, ApiActions } from "../../infrastructure/api/types";
import { CampaignDisplay, CreateCampaignInput, UpdateCampaignInput } from "./campaign.model";
import { Resource } from "@awc/reactive";
import { AdGroupDisplay, CreateAdGroupInput, UpdateAdGroupInput } from "../adgroups/adgroup.model";
import { AdgroupServiceValue } from "../adgroups/service.context";

// export interface CamapignsActions<T> extends ApiActions<T, CreateCampaignInput, UpdateCampaignInput> {}
export interface CamapignActions<T, A>  extends ApiActions<T, CreateCampaignInput, UpdateCampaignInput> {
  get(id: string): Promise<ApiResponse<T>>;
  agdroup: ApiActions<T, CreateAdGroupInput, UpdateAdGroupInput>
  refetch(): void;
}

export interface CampaignServiceValue {
  /**
   * All reactive data resources (Suspense-compatible).
   * Use .latest outside Suspense to get last known value without throwing.
   */
  display: {
      value: Resource<CampaignDisplay>,
      campaigns:  Resource<CampaignDisplay[]>;
      // ── Mutation namespaces ────────────────────────────────────────────────────
      actions: CamapignActions<CampaignDisplay, AdGroupDisplay>;
  }
}


// ── Context ────────────────────────────────────────────────────────────────────

export const CampaignServiceContext = createContext<CampaignServiceValue>();

export function CampaignServiceProvider({ value, children, debug }: { children?: any, value: CampaignServiceValue, debug?: boolean }) {
  return createProvider({ context: CampaignServiceContext, value, children, debug });
}
export function useCampaignService(): CampaignServiceValue | null {
  return useContext(CampaignServiceContext) ?? null;
}
