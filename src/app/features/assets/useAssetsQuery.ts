import { useCallback } from "react";
import type { AssetDevice } from "../../../domain/models/assets";
import { LIVE_DATA_REFRESH_INTERVAL_MS } from "../../../domain/services/liveDataRefreshPolicy";
import { useAsyncPolling } from "../../hooks/useAsyncPolling";
import { useRepositoryQuery } from "../../hooks/useRepositoryQuery";
import { useAppServices } from "../../providers/AppServicesProvider";

export function useAssetsQuery() {
  const { assetsRepository, dataMode } = useAppServices();
  const query = useCallback(() => assetsRepository.listAssets(), [assetsRepository]);
  const queryResult = useRepositoryQuery<AssetDevice[]>({
    initialData: [],
    keepPreviousData: true,
    query,
  });
  const { refresh } = queryResult;

  const refreshAssets = useCallback(async () => {
    await refresh();
  }, [refresh]);

  useAsyncPolling(refreshAssets, LIVE_DATA_REFRESH_INTERVAL_MS.assets, {
    enabled: dataMode === "openRemote",
  });

  return queryResult;
}
