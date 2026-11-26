import { Building2, Shield, Zap } from 'lucide-react';

// Broker portal metadata. Login field meanings differ per broker (Dhan: one access token;
// Upstox: API key + secret + redirect URI for its OAuth2 dialog), as in the old app.
type Field = { label: string; placeholder: string; help: string } | null;
export type Broker = {
  id: 'angel' | 'dhan' | 'upstox';
  name: string;
  description: string;
  icon: typeof Shield;
  gradient: string;
  panel: string;
  fields: { apiKey: Field; clientId: Field; password: Field; totp: Field };
};

export const BROKERS: Broker[] = [
  {
    id: 'angel',
    name: 'Angel Broking',
    description: 'SmartAPI - Professional Trading Platform',
    icon: Shield,
    gradient: 'from-blue-500 to-blue-600',
    panel: 'border-blue-200 bg-blue-50',
    fields: {
      apiKey: { label: 'API Key', placeholder: 'Enter your API Key', help: 'Your Angel Broking API key for SmartAPI access' },
      clientId: { label: 'Client ID', placeholder: 'Enter your Client ID', help: 'Your Angel Broking client ID' },
      password: { label: 'MPIN', placeholder: 'Enter your MPIN', help: 'MPIN is required for Angel Broking authentication' },
      totp: { label: 'TOTP Code', placeholder: 'Enter 6-digit TOTP', help: 'TOTP is mandatory for Angel Broking' },
    },
  },
  {
    id: 'dhan',
    name: 'DhanHQ',
    description: 'Advanced Trading & Investment Platform',
    icon: Zap,
    gradient: 'from-emerald-500 to-emerald-600',
    panel: 'border-emerald-200 bg-emerald-50',
    fields: {
      apiKey: { label: 'Access Token', placeholder: 'Enter your Dhan Access Token', help: 'Generate from Dhan portal - My Profile > Access DhanHQ APIs' },
      clientId: null,
      password: null,
      totp: null,
    },
  },
  {
    id: 'upstox',
    name: 'Upstox',
    description: "India's Leading Discount Broker",
    icon: Building2,
    gradient: 'from-violet-500 to-violet-600',
    panel: 'border-violet-200 bg-violet-50',
    fields: {
      apiKey: { label: 'API Key', placeholder: 'Enter your API Key (client_id)', help: 'Your Upstox API Key (Client ID) obtained during app registration' },
      clientId: { label: 'API Secret', placeholder: 'Enter your API Secret (client_secret)', help: 'Your Upstox API Secret (Client Secret) obtained during app registration' },
      password: { label: 'Redirect URI', placeholder: 'Enter your Redirect URI', help: 'Must match the URI registered in your Upstox app' },
      totp: null,
    },
  },
];
export const brokerById = (id: string | undefined) => BROKERS.find((b) => b.id === id);

// Saved accounts belong to dashboard user 1, as in the old app (it had no login).
export const PORTAL_USER = 1;

export type Profile = { full_name?: string; client_id?: string; email?: string; phone?: string; account_type?: string; account_status?: string; kyc_status?: string };
export type Balance = { available_balance: number; withdrawable_balance: number; utilized_margin: number; total_margin: number; currency?: string; last_updated?: string | null };
/** What the login / quick-login screens hand to the results screen (router state, so it never lands in the URL). */
export type ResultsState = { sessionToken: string; userId: string; brokerType: string; saved?: { profile: Profile; balance: Balance } };
