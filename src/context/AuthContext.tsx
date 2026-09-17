import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AuthSession, Organization, Role, Subscription, User } from '../types';

interface RealtimeEventPayload {
  event: string;
  data: any;
}

type RealtimeListener = (payload: RealtimeEventPayload) => void;

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  role: Role | null;
  subscription: Subscription | null;
  setSubscription: React.Dispatch<React.SetStateAction<Subscription | null>>;
  availableWorkspaces: Array<{ organization: Organization; role: Role }>;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isPlatformAdmin: boolean;
  login: (email: string, password: string, organization_id?: string) => Promise<void>;
  signup: (data: {
    email: string;
    password: string;
    org_name: string;
    industry: string;
    country: string;
    currency: string;
    timezone: string;
  }) => Promise<void>;
  acceptInvite: (token: string, password: string) => Promise<void>;
  logout: () => void;
  switchWorkspace: (targetOrgId: string) => Promise<void>;
  refreshSession: () => Promise<void>;
  subscribeToRealtime: (listener: RealtimeListener) => () => void;
  isRealtimeConnected: boolean;
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('goya_auth_token'));
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [availableWorkspaces, setAvailableWorkspaces] = useState<Array<{ organization: Organization; role: Role }>>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState<boolean>(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(false);

  const listenersRef = useRef<Set<RealtimeListener>>(new Set());
  const eventSourceRef = useRef<EventSource | null>(null);

  const authFetch = useCallback(
    async (url: string, init: RequestInit = {}): Promise<Response> => {
      const headers = new Headers(init.headers || {});
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      headers.set('Content-Type', 'application/json');
      return fetch(url, { ...init, headers });
    },
    [token]
  );

  const refreshSession = useCallback(async () => {
    if (!token) {
      setUser(null);
      setOrganization(null);
      setRole(null);
      setAvailableWorkspaces([]);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('goya_auth_token');
          setToken(null);
          setUser(null);
          setOrganization(null);
          setRole(null);
        }
        setIsLoading(false);
        return;
      }

      const data = await res.json();
      setUser(data.user);
      setOrganization(data.organization);
      setRole(data.role);
      setSubscription(data.subscription || null);
      setAvailableWorkspaces(data.available_workspaces || []);
      setIsPlatformAdmin(Boolean(data.is_platform_admin));
      setError(null);
    } catch (err: any) {
      console.error('Failed to restore session:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  // Supabase-style Realtime Subscription scoped to company_id
  useEffect(() => {
    if (!organization?.id) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsRealtimeConnected(false);
      return;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(`/api/realtime?company_id=${encodeURIComponent(organization.id)}`);
    eventSourceRef.current = es;

    es.onopen = () => {
      setIsRealtimeConnected(true);
    };

    es.onerror = () => {
      setIsRealtimeConnected(false);
    };

    const handleEvent = (event: MessageEvent, eventName: string) => {
      try {
        const parsed = JSON.parse(event.data);
        listenersRef.current.forEach((cb) => cb({ event: eventName, data: parsed }));
      } catch (err) {
        console.error('Error parsing SSE event:', err);
      }
    };

    const realtimeEventNames = [
      'employee_created',
      'employee_updated',
      'employee_deleted',
      'department_changed',
      'compensation_updated',
      'leave_request_created',
      'leave_request_updated',
      'leave_balance_updated',
      'attendance_updated',
      'compliance_updated',
      'task_created',
      'task_updated',
      'expense_created',
      'expense_updated',
      'expense_approved',
      'expense_rejected',
      'event_created',
      'event_updated',
      'event_deleted',
      'events_updated',
      'notification_created',
      'notification_updated',
      'notifications_read',
      'chat_channel_created',
      'chat_message_created',
      'subscription_updated',
    ];

    realtimeEventNames.forEach((name) => {
      es.addEventListener(name, (e) => {
        handleEvent(e as MessageEvent, name);
        if (name === 'subscription_updated') {
          try {
            const parsed = JSON.parse((e as MessageEvent).data);
            if (parsed.subscription) {
              setSubscription(parsed.subscription);
            }
          } catch (err) {
            console.error('Failed to parse subscription_updated event:', err);
          }
        }
      });
    });

    return () => {
      es.close();
      eventSourceRef.current = null;
      setIsRealtimeConnected(false);
    };
  }, [organization?.id]);

  const subscribeToRealtime = useCallback((listener: RealtimeListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const login = async (email: string, password: string, organization_id?: string) => {
    setError(null);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, organization_id }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    localStorage.setItem('goya_auth_token', data.token);
    setToken(data.token);
    setUser(data.user);
    setOrganization(data.organization);
    setRole(data.role);
    setSubscription(data.subscription || null);
    setAvailableWorkspaces(data.available_workspaces || []);
    setIsPlatformAdmin(Boolean(data.is_platform_admin));
  };

  const signup = async (form: {
    email: string;
    password: string;
    org_name: string;
    industry: string;
    country: string;
    currency: string;
    timezone: string;
  }) => {
    setError(null);
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Sign up failed');
    }

    localStorage.setItem('goya_auth_token', data.token);
    setToken(data.token);
    setUser(data.user);
    setOrganization(data.organization);
    setRole(data.role);
    setSubscription(data.subscription || null);
    setAvailableWorkspaces(data.available_workspaces || []);
  };

  const acceptInvite = async (inviteToken: string, password: string) => {
    setError(null);
    const res = await fetch('/api/invites/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: inviteToken, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to accept invitation');
    }

    localStorage.setItem('goya_auth_token', data.token);
    setToken(data.token);
    setUser(data.user);
    setOrganization(data.organization);
    setRole(data.role);
    setAvailableWorkspaces(data.available_workspaces || []);
  };

  const switchWorkspace = async (targetOrgId: string) => {
    if (!token) return;
    const res = await fetch('/api/auth/switch-workspace', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ target_org_id: targetOrgId }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to switch workspace');
    }

    localStorage.setItem('goya_auth_token', data.token);
    setToken(data.token);
    setOrganization(data.organization);
    setRole(data.role);
    setSubscription(data.subscription || null);
    await refreshSession();
  };

  const logout = () => {
    localStorage.removeItem('goya_auth_token');
    setToken(null);
    setUser(null);
    setOrganization(null);
    setRole(null);
    setSubscription(null);
    setAvailableWorkspaces([]);
    setIsPlatformAdmin(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        role,
        subscription,
        setSubscription,
        availableWorkspaces,
        token,
        isLoading,
        error,
        isPlatformAdmin,
        login,
        signup,
        acceptInvite,
        logout,
        switchWorkspace,
        refreshSession,
        subscribeToRealtime,
        isRealtimeConnected,
        authFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
