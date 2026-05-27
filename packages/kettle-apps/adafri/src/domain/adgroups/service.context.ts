import { createContext, createProvider, useContext } from "@awc/kettlejs";
import { ListParams,  ApiResponse, ApiActions } from "../../infrastructure/api/types";
import { Resource } from "@awc/reactive";
import { AdGroupDisplay, CreateAdGroupInput, UpdateAdGroupInput } from "../adgroups/adgroup.model";
import { Ad, CreateAdInput, UpdateAdInput } from "../ads/ad.model";

export interface AdgroupActions<T> extends ApiActions<T, CreateAdGroupInput, UpdateAdGroupInput> {}
// export interface AdgroupActions<T, A> {
//   get(id: string): Promise<ApiResponse<T>>;
//   listAds(id: string, params: ListParams): Promise<ApiResponse<T[]>>;
//   createAd(input: CreateAdInput): Promise<ApiResponse<A>>;
//   updateAd(id: string, input: UpdateAdInput): Promise<ApiResponse<A>>;
//   archiveAd(id: string): Promise<ApiResponse<A>>;
//   deleteAdg(id: string): Promise<ApiResponse<A>>;
//   publishAd(id: string): Promise<ApiResponse<A>>;
//   refetch(): void;
// }

export interface AdgroupServiceValue {
  /**
   * All reactive data resources (Suspense-compatible).
   * Use .latest outside Suspense to get last known value without throwing.
   */
  display: {
      value: Resource<AdGroupDisplay>
      adgroups:  Resource<AdGroupDisplay[]>;
      // ── Mutation namespaces ────────────────────────────────────────────────────
      actions: AdgroupActions<AdGroupDisplay>;
  }
}


// ── Context ────────────────────────────────────────────────────────────────────

export const AdgroupServiceContext = createContext<AdgroupServiceValue>();

export function AdgroupServiceProvider({ value, children, debug }: { children?: any, value: AdgroupServiceValue, debug?: boolean }) {
  return createProvider({ context: AdgroupServiceContext, value, children, debug });
}
export function useAdgroupService(): AdgroupServiceValue | null {
  return useContext(AdgroupServiceContext) ?? null;
}
