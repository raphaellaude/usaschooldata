import {createConnectTransport} from '@connectrpc/connect-web';
import {createClient} from '@connectrpc/connect';
import {MembershipService} from '../gen/membership/v1/membership_pb';
import {DirectoryService} from '../gen/directory/v1/directory_pb';

/**
 * Get the API base URL from environment variables
 * Defaults to production URL if not specified
 */
function getApiUrl(): string {
  const url = import.meta.env.VITE_API_URL;

  if (!url) {
    console.warn('VITE_API_URL not set, using production URL');
    return 'https://api.usaschooldata.org';
  }

  return url;
}

/**
 * Create the Connect transport for API communication
 */
export const transport = createConnectTransport({
  baseUrl: getApiUrl(),
  // Add timeout configuration
  defaultTimeoutMs: 30000, // 30 seconds
});

/**
 * Create the Membership Service client
 * This is a singleton that can be imported throughout the app
 */
export const membershipClient = createClient(MembershipService, transport);

/**
 * Create the Directory Service client
 * This is a singleton that can be imported throughout the app
 */
export const directoryClient = createClient(DirectoryService, transport);
