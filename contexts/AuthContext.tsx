"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  type User,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import type { UserPerfil } from "@/types/tenant";

interface AuthContextValue {
  firebaseUser: User | null;
  perfil:       UserPerfil | null;
  loading:      boolean;
  logout:       () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  perfil:       null,
  loading:      true,
  logout:       async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [perfil, setPerfil]             = useState<UserPerfil | null>(null);
  const [loading, setLoading]           = useState(true);
  const router                          = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (!user) {
        setPerfil(null);
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;
    const ref = doc(db, "users", firebaseUser.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setPerfil(snap.exists() ? (snap.data() as UserPerfil) : null);
        setLoading(false);
      },
      (err) => {
        console.error("[AuthContext]", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [firebaseUser]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
      await signOut(auth);
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("[logout]", err);
    }
  }, [router]);

  return (
    <AuthContext.Provider value={{ firebaseUser, perfil, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
