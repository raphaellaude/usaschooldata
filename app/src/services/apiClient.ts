import {createClient} from '@connectrpc/connect';
import {createConnectTransport} from '@connectrpc/connect-web';
import {MembershipService} from '../gen/membership/v1/membership_pb';
import {API_BASE_URL} from '../constants';

// Create the transport for Connect RPC
const transport = createConnectTransport({
  baseUrl: API_BASE_URL,
  // Use JSON format for better debugging (can switch to binary later if needed)
  useBinaryFormat: false,
});

// Create the client for the Membership service
export const membershipClient = createClient(MembershipService, transport);
