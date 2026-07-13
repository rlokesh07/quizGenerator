"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase-client";

type AuthContextValue =
  | { status: "loading" }
  | { status: "signed-out"; signIn: () => Promise<void> }
  | { status: "signed-in"; user: User; signOut: () => Promise<void> };

const AuthContext = createContext<AuthContextValue>({ status: "loading" });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  const value: AuthContextValue =
    user === undefined
      ? { status: "loading" }
      : user === null
        ? { status: "signed-out", signIn: () => signInWithPopup(auth, googleProvider).then(() => undefined) }
        : { status: "signed-in", user, signOut: () => signOut(auth) };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
