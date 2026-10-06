import { supabase } from './supabase';

interface AuthUser {
  id: string;
  email: string;
  email_verified: boolean;
  created_at: string;
}

interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  created_at: string;
}

interface OrganizationMember {
  user_id: string;
  organization_id: string;
  role: 'hr_head' | 'hr_analyst';
  created_at: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  industry?: string;
  country?: string;
  created_at: string;
}

/**
 * Verify Supabase Auth token and get user info
 * Returns null if token is invalid
 */
export async function verifyAuthToken(token: string): Promise<AuthUser | null> {
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      return null;
    }
    return {
      id: data.user.id,
      email: data.user.email || '',
      email_verified: data.user.email_confirmed_at !== null,
      created_at: data.user.created_at,
    };
  } catch {
    return null;
  }
}

/**
 * Get user profile by user ID
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Get organization membership for a user
 */
export async function getOrganizationMembership(userId: string, organizationId: string): Promise<OrganizationMember | null> {
  try {
    const { data, error } = await supabase
      .from('organization_members')
      .select('*')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single();
    
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Get all organization memberships for a user
 */
export async function getUserMemberships(userId: string): Promise<OrganizationMember[]> {
  try {
    const { data, error } = await supabase
      .from('organization_members')
      .select('*')
      .eq('user_id', userId);
    
    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

/**
 * Get organization by ID
 */
export async function getOrganization(organizationId: string): Promise<Organization | null> {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();
    
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Get organizations for a user's memberships
 */
export async function getUserOrganizations(userId: string): Promise<(Organization & { role: string })[]> {
  try {
    const { data, error } = await supabase
      .from('organization_members')
      .select('organization_id, role, organizations(*)')
      .eq('user_id', userId);
    
    if (error || !data) return [];
    
    return data
      .filter((m: any) => m.organizations)
      .map((m: any) => ({
        ...m.organizations,
        role: m.role,
      }));
  } catch {
    return [];
  }
}
