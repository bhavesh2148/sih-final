"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "./supabase/client";

export type UserRole = "worker" | "hse_officer" | "site_admin";

export interface CustomUser {
  id: string;
  email?: string;
  role: UserRole;
  user_metadata: {
    full_name?: string;
    badge_number?: string;
    site?: string;
    is_anonymous?: boolean;
  };
}

interface WorkerLoginParams {
  badgeId?: string;
  workerName?: string;
  site?: string;
  isAnonymous?: boolean;
}

interface AuthContextType {
  user: User | CustomUser | null;
  session: Session | null;
  role: UserRole | null;
  loading: boolean;
  isConfigured: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: any }>;
  signUpWithPassword: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signInWithMagicLink: (email: string) => Promise<{ error: any }>;
  signInAsDemoOfficer: (role?: "hse_officer" | "site_admin") => void;
  signInAsWorker: (params: WorkerLoginParams) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | CustomUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);

  // Derive role
  const role: UserRole | null = (user as any)?.role || (user as any)?.user_metadata?.role || (user ? "hse_officer" : null);

  useEffect(() => {
    const isConfig = isSupabaseConfigured();
    setConfigured(isConfig);

    // First check local storage for active worker or demo session
    try {
      const cachedSession = localStorage.getItem("sifense_active_session");
      if (cachedSession) {
        const parsed = JSON.parse(cachedSession);
        setUser(parsed);
        setLoading(false);
        return;
      }
    } catch (e) {
      console.error("Error reading local session:", e);
    }

    if (isConfig) {
      const supabase = createClient();

      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        if (session?.user) {
          const u = session.user as any;
          u.role = u.user_metadata?.role || "hse_officer";
          setUser(u);
        }
        setLoading(false);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        if (session?.user) {
          const u = session.user as any;
          u.role = u.user_metadata?.role || "hse_officer";
          setUser(u);
        } else {
          // If no supabase session, check if there was a worker session
          try {
            const cached = localStorage.getItem("sifense_active_session");
            if (cached) {
              setUser(JSON.parse(cached));
            } else {
              setUser(null);
            }
          } catch {
            setUser(null);
          }
        }
        setLoading(false);
      });

      return () => subscription.unsubscribe();
    } else {
      setLoading(false);
    }
  }, []);

  const signInWithPassword = async (email: string, password: string) => {
    if (!configured) {
      signInAsDemoOfficer("hse_officer");
      return { error: null };
    }
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data?.user) {
      const u = data.user as any;
      u.role = "hse_officer";
      setUser(u);
      try {
        localStorage.setItem("sifense_active_session", JSON.stringify(u));
      } catch (e) {}
    }
    return { error };
  };

  const signUpWithPassword = async (email: string, password: string, fullName?: string) => {
    if (!configured) {
      signInAsDemoOfficer("hse_officer");
      return { error: null };
    }
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || "HSE Officer",
          role: "hse_officer",
        },
      },
    });
    return { error };
  };

  const signInWithMagicLink = async (email: string) => {
    if (!configured) {
      signInAsDemoOfficer("hse_officer");
      return { error: null };
    }
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({ email });
    return { error };
  };

  // 1. Worker Sign In
  const signInAsWorker = (params: WorkerLoginParams) => {
    const isAnon = params.isAnonymous || !params.badgeId;
    const workerUser: CustomUser = {
      id: `worker-${Date.now()}`,
      email: isAnon ? undefined : `worker-${params.badgeId?.toLowerCase()}@oilindia.in`,
      role: "worker",
      user_metadata: {
        full_name: isAnon ? "Anonymous Field Worker" : params.workerName || `Worker #${params.badgeId}`,
        badge_number: params.badgeId || "ANONYMOUS",
        site: params.site || "Tank Farm A",
        is_anonymous: isAnon,
      },
    };
    setUser(workerUser);
    try {
      localStorage.setItem("sifense_active_session", JSON.stringify(workerUser));
    } catch (e) {
      console.error("Failed to save worker session:", e);
    }
  };

  // 2. HSE Officer Sign In (Demo fallback)
  const signInAsDemoOfficer = (roleType: "hse_officer" | "site_admin" = "hse_officer") => {
    const officerUser: CustomUser = {
      id: "demo-hse-officer-01",
      email: roleType === "site_admin" ? "admin@oilindia.in" : "supervisor@oilindia.in",
      role: roleType,
      user_metadata: {
        full_name: roleType === "site_admin" ? "Rajesh Sharma (Site Admin)" : "Kalyan Barua (Senior HSE Officer)",
        badge_number: "OIL-HSE-4029",
        site: "Duliajan HQ / Rig 3",
      },
    };
    setUser(officerUser);
    try {
      localStorage.setItem("sifense_active_session", JSON.stringify(officerUser));
    } catch (e) {
      console.error("Failed to save officer session:", e);
    }
  };

  const signOut = async () => {
    if (configured) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    try {
      localStorage.removeItem("sifense_active_session");
    } catch (e) {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        loading,
        isConfigured: configured,
        signInWithPassword,
        signUpWithPassword,
        signInWithMagicLink,
        signInAsDemoOfficer,
        signInAsWorker,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
