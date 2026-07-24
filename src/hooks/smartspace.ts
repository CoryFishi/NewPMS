import axios from "axios";
import { useQueries } from "@tanstack/react-query";
import { handleSingleLogin, buildApiUrl, authHeaders } from "@hooks/opentech";

export const FACILITY_QUERY_KEY = "smartspace-facility";

const REQUEST_TIMEOUT_MS = 15000;
const MAX_CONCURRENT_FACILITY_FETCHES = 6;
const FIVE_MINUTES_MS = 5 * 60 * 1000;

// Module-level semaphore: at most MAX_CONCURRENT_FACILITY_FETCHES facility
// fetches run at once; the rest queue in FIFO order.
let activeFetches = 0;
const waitQueue: (() => void)[] = [];

async function withFacilitySlot<T>(task: () => Promise<T>): Promise<T> {
  if (activeFetches >= MAX_CONCURRENT_FACILITY_FETCHES) {
    await new Promise<void>((resolve) => waitQueue.push(resolve));
  }
  activeFetches++;
  try {
    return await task();
  } finally {
    activeFetches--;
    const next = waitQueue.shift();
    if (next) next();
  }
}

export async function fetchFacilityStatus(
  facility: any,
  // eslint-disable-next-line no-unused-vars
  getBearerToken: (credential: any) => string | null
) {
  // Bearer token is critical — no token, no data.
  let bearer = getBearerToken(facility);
  if (!bearer) {
    const login: any = await handleSingleLogin(facility);
    if (!login?.token?.access_token) {
      throw new Error("Authentication failed");
    }
    bearer = login.token.access_token;
  }

  const headers = authHeaders({ ...facility, token: { access_token: bearer } });
  const get = (path: string) =>
    axios
      .get(buildApiUrl(facility, path), { headers, timeout: REQUEST_TIMEOUT_MS })
      .then((res) => res.data);

  const failedSections: string[] = [];
  const guard = <T,>(section: string, promise: Promise<T>, fallback: T): Promise<T> =>
    promise.catch(() => {
      failedSections.push(section);
      return fallback;
    });

  // Facility detail is deliberately unguarded — its rejection fails the query.
  const [edgeRouter, aps, summary, smartlocks, smartMotion, facilityDetail] =
    await Promise.all([
      guard("edgeRouter", get(`/facilities/${facility.id}/edgerouterstatus`), null),
      guard(
        "accessPoints",
        get(`/facilities/${facility.id}/edgerouterplatformdevicesstatus`),
        [] as any[]
      ),
      guard(
        "smartlockSummary",
        get(`/facilities/${facility.id}/smartlockstatussummary`),
        null
      ),
      guard("smartlocks", get(`/facilities/${facility.id}/smartlockstatus`), [] as any[]),
      guard("smartMotion", get(`/facilities/${facility.id}/smartmotionstatus`), [] as any[]),
      get(`/facilities/${facility.id}`),
    ]);

  const weather = await guard(
    "weather",
    axios
      .get(
        `https://api.weatherapi.com/v1/current.json?q=${facilityDetail?.city}&key=${
          import.meta.env.VITE_WEATHER_KEY
        }`,
        { timeout: REQUEST_TIMEOUT_MS }
      )
      .then((res) => res.data),
    null
  );

  const smartMotionOkayCount = smartMotion.filter(
    (s: any) => s.overallStatus === "ok"
  ).length;
  const smartMotionWarningCount = smartMotion.filter(
    (s: any) => s.overallStatus === "warning"
  ).length;
  const smartMotionErrorCount = smartMotion.filter(
    (s: any) => s.overallStatus === "error"
  ).length;
  const smartMotionOfflineCount = smartMotion.filter(
    (s: any) => s.isDeviceOffline
  ).length;
  const smartMotionLowestSignal = Math.min(
    ...smartMotion
      .filter((s: any) => !s.isDeviceOffline)
      .map((s: any) => s.signalQuality || 255)
  );
  const smartMotionLowestBattery = Math.min(
    ...smartMotion
      .filter((s: any) => !s.isDeviceOffline)
      .map((s: any) => s.batteryLevel)
  );

  const lowestSignal = Math.min(
    ...smartlocks
      .filter((s: any) => !s.isDeviceOffline)
      .map((s: any) => s.signalQuality || 255)
  );
  const lowestBattery = Math.min(
    ...smartlocks
      .filter((s: any) => !s.isDeviceOffline)
      .map((s: any) => s.batteryLevel || 100)
  );
  const offlineCount = smartlocks.filter((s: any) => s.isDeviceOffline).length;

  const smartMotionFields = {
    smartMotion,
    smartMotionOkayCount,
    smartMotionWarningCount,
    smartMotionErrorCount,
    smartMotionOfflineCount,
    smartMotionLowestSignal: isFinite(smartMotionLowestSignal)
      ? Math.round((smartMotionLowestSignal / 255) * 100)
      : 0,
    smartMotionLowestBattery: isFinite(smartMotionLowestBattery)
      ? smartMotionLowestBattery
      : 0,
  };

  const shared = {
    ...facility,
    bearer,
    edgeRouterStatus: edgeRouter?.connectionStatus || "error",
    onlineAccessPointsCount: aps.filter((ap: any) => !ap.isDeviceOffline).length || 0,
    offlineAccessPointsCount: aps.filter((ap: any) => ap.isDeviceOffline).length || 0,
    edgeRouterName: edgeRouter?.name || "Edge Router",
    edgeRouter: edgeRouter || {},
    accessPoints: aps || [],
    facilityDetail,
    weather,
    failedSections,
    ...smartMotionFields,
  };

  if (smartlocks.length > 0) {
    return {
      ...shared,
      okCount: summary?.okCount || 0,
      warningCount: summary?.warningCount || 0,
      errorCount: summary?.errorCount || 0,
      offlineCount,
      lowestSignal: isFinite(lowestSignal)
        ? Math.round((lowestSignal / 255) * 100)
        : 0,
      lowestBattery: isFinite(lowestBattery) ? lowestBattery : 0,
      smartLocks: smartlocks,
    };
  }
  return {
    ...shared,
    okCount: -100,
    warningCount: -100,
    errorCount: -100,
    offlineCount: -100,
    lowestSignal: -100,
    lowestBattery: -100,
    smartLocks: [],
  };
}

export function useFacilityStatusQueries(
  selectedTokens: any[],
  // eslint-disable-next-line no-unused-vars
  getBearerToken: (credential: any) => string | null
) {
  const facilities = selectedTokens ?? [];
  return useQueries({
    queries: facilities.map((facility: any) => ({
      queryKey: [FACILITY_QUERY_KEY, facility.environment, facility.id],
      queryFn: () => withFacilitySlot(() => fetchFacilityStatus(facility, getBearerToken)),
      staleTime: FIVE_MINUTES_MS,
      refetchInterval: FIVE_MINUTES_MS,
    })),
    combine: (results) => ({
      results,
      loaded: results.filter((r) => r.data).map((r) => r.data as any),
      pending: facilities.filter((_: any, i: number) => results[i].isPending),
      errored: facilities
        .map((facility: any, i: number) => ({
          facility,
          error: results[i].error,
          refetch: results[i].refetch,
          isError: results[i].isError,
          isFetching: results[i].isFetching,
        }))
        .filter((e) => e.isError),
      lastUpdatedAt: Math.max(0, ...results.map((r) => r.dataUpdatedAt || 0)),
      // Facilities re-fetching in the background (already have data on screen)
      refreshingKeys: facilities
        .filter((_: any, i: number) => results[i].isFetching && !results[i].isPending)
        .map((facility: any) => `${facility.environment}:${facility.id}`),
    }),
  });
}
