import { SupportedEnvironments } from "./types";

function isPublicEnvironment(appVersion: string) {
  return SupportedEnvironments.includes(appVersion);
}

function isTunneledEnvironment(appVersion: string) {
  if (isPublicEnvironment(appVersion) || appVersion.match(/^[0-9]+$/)) {
    return false;
  }
  return true;
}

export { isPublicEnvironment, isTunneledEnvironment };
