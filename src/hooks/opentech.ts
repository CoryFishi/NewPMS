import axios from "axios";
import qs from "qs";

export interface Facility {
  id?: string | number;
  name?: string;
  api: string;
  apiSecret: string;
  client: string;
  clientSecret: string;
  environment: string; // "" | "staging" | "-dev" | "-qa"
  token?: { access_token: string; [k: string]: unknown };
}

export type OpenTechService = "accesscontrol" | "accessevent";

function getEnvKeys(f: Facility): { tokenStageKey: string; tokenEnvKey: string } {
  const tokenStageKey = f.environment === "staging" ? "cia-stg-1.aws." : "";
  const tokenEnvKey = f.environment === "staging" ? "" : f.environment;
  return { tokenStageKey, tokenEnvKey };
}

export function buildAuthUrl(f: Facility): string {
  const { tokenStageKey, tokenEnvKey } = getEnvKeys(f);
  return `https://auth.${tokenStageKey}insomniaccia${tokenEnvKey}.com/auth/token`;
}

export function buildApiUrl(
  f: Facility,
  path: string,
  service: OpenTechService = "accesscontrol",
): string {
  const { tokenStageKey, tokenEnvKey } = getEnvKeys(f);
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `https://${service}.${tokenStageKey}insomniaccia${tokenEnvKey}.com${suffix}`;
}

export function authHeaders(f: Facility, contentType: string = "application/json") {
  return {
    Authorization: "Bearer " + f.token?.access_token,
    accept: "application/json",
    "api-version": "2.0",
    "Content-Type": contentType,
  };
}

async function login(facility: Facility) {
  const data = qs.stringify({
    grant_type: "password",
    username: facility.api,
    password: facility.apiSecret,
    client_id: facility.client,
    client_secret: facility.clientSecret,
  });

  const config = {
    method: "post",
    url: buildAuthUrl(facility),
    headers: {
      accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    data,
  };

  const response = await axios(config);
  return { message: "Successfully authenticated!", token: response.data };
}

export async function handleSingleLogin(facility: Facility) {
  try {
    return await login(facility);
  } catch (error) {
    console.error("Error during single login:", error);
    return { error: "Failed to authenticate." };
  }
}

export async function handleMultiLogin(facilities: Facility) {
  try {
    return await login(facilities);
  } catch (error) {
    console.error("Error during single login:", error);
    throw error;
  }
}

export function getEnvironmentName(facility: Facility) {
  if (facility.environment === "") {
    return "Production";
  } else if (facility.environment === "staging") {
    return "Staging";
  } else if (facility.environment === "-dev") {
    return "Development";
  } else if (facility.environment === "-qa") {
    return "QA";
  } else {
    return facility.environment.toUpperCase();
  }
}
