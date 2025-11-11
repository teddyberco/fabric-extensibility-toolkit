import { AccessToken, WorkloadClientAPI } from "@ms-fabric/workload-client";

/**
 * Calls acquire frontend access token from the WorkloadClientAPI.
 * @param {WorkloadClientAPI} workloadClient - An instance of the WorkloadClientAPI.
 * @param {string} scopes - The scopes for which the access token is requested.
 * @returns {AccessToken}
 */
export async function callAcquireFrontendAccessToken(
    workloadClient: WorkloadClientAPI, 
    scopes: string): Promise<AccessToken> {
    return workloadClient.auth.acquireFrontendAccessToken({ scopes: scopes?.length ? scopes.split(' ') : [] });
}

/**
 * Requests a token with dynamic consent for additional scopes.
 * This will show a consent popup if the user hasn't granted permission.
 * @param {WorkloadClientAPI} workloadClient - An instance of the WorkloadClientAPI.
 * @param {string} additionalScopes - Space-separated scopes to request consent for.
 * @returns {AccessToken}
 */
export async function callAcquireAccessTokenWithConsent(
    workloadClient: WorkloadClientAPI, 
    additionalScopes: string): Promise<AccessToken> {
    // According to Microsoft docs, acquireAccessToken supports additionalScopesToConsent
    // https://learn.microsoft.com/en-us/fabric/workload-development-kit/authentication-javascript-api
    return (workloadClient.auth as any).acquireAccessToken({ 
        additionalScopesToConsent: additionalScopes?.length ? additionalScopes.split(' ') : [] 
    });
}

/**
 * Requests full consent for all static dependencies of the workload.
 * This will show a full consent popup regardless of previous consent.
 * @param {WorkloadClientAPI} workloadClient - An instance of the WorkloadClientAPI.
 * @returns {AccessToken}
 */
export async function callPromptFullConsent(
    workloadClient: WorkloadClientAPI): Promise<AccessToken> {
    return (workloadClient.auth as any).acquireAccessToken({ 
        promptFullConsent: true 
    });
}
