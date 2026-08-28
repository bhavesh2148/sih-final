"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "./supabase/client";

export interface DemoUser {
  id: string;
  email: string;
  role: "hse_officer" | "site_admin";
  user_metadata: {
    full_name: string;
    badge_number: string;
    site: string;
  };
}

interface AuthContextType {
  user: User | DemoUser | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: any }>;
  signUpWithPassword: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signInWithMagicLink: (email: string) => Promise<{ error: any }>;
  signInAsDemo: (role?: "hse_officer" | "site_admin") => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | DemoUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    const isConfig = isSupabaseConfigured();
    setConfigured(isConfig);

    if (isConfig) {
      const supabase = createClient();

      // Check current session
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      });

      // Listen for auth state changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      });

      return () => subscription.unsubscribe();
    } else {
      // Check for cached demo session in localStorage
      try {
        const cachedDemo = localStorage.getItem("sifense_demo_session");
        if (cachedDemo) {
          const parsed = JSON.parse(cachedDemo);
          setUser(parsed);
        }
      } catch (e) {
        console.error("Error reading demo session:", e);
      }
      setLoading(false);
    }
  }, []);

  const signInWithPassword = async (email: string, password: string) => {
    if (!configured) {
      // Fallback demo sign in if no supabase credentials
      signInAsDemo("hse_officer");
      return { error: null };
    }
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUpWithPassword = async (email: string, password: string, fullName?: string) => {
    if (!configured) {
      signInAsDemo("hse_officer");
      return { error: null };
    }
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || "HSE Officer",
        },
      },
    });
    return { error };
  };

  const signInWithMagicLink = async (email: string) => {
    if (!configured) {
      signInAsDemo("hse_officer");
      return { error: null };
    }
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({ email });
    return { error };
  };

  const signInAsDemo = (role: "hse_officer" | "site_admin" = "hse_officer") => {
    const demoUser: DemoUser = {
      id: "demo-hse-supervisor-01",
      email: role === "site_admin" ? "admin@oilindia.in" : "supervisor@oilindia.in",
      role,
      user_metadata: {
        full_name: role === "site_admin" ? "Rajesh Sharma (Site Admin)" : "Kalyan Barua (Senior HSE Officer)",
        badge_number: "OIL-HSE-4029",
        site: "Duliajan HQ / Rig 3",
      },
    };
    setUser(demoUser);
    try {
      localStorage.setItem("sifense_demo_session", JSON.stringify(demoUser));
    } catch (e) {
      console.error("Failed to save demo session:", e);
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
      localStorage.removeItem("sifense_demo_session");
    } catch (e) {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isConfigured: configured,
        signInWithPassword,
        signUpWithPassword,
        signInWithMagicLink,
        signInAsDemo,
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
