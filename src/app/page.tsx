"use client";

import { useState, useEffect } from "react";
import { User } from "@/lib/types";
import { getCurrentUser, saveUser, logout } from "@/lib/utils";
import LoginForm from "@/components/LoginForm";
import Dashboard from "@/components/Dashboard";

export default function Page() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const u = getCurrentUser();
    if (u) setUser(u);
  }, []);

  return user ? (
    <Dashboard user={user} onLogout={() => { logout(); setUser(null); }} />
  ) : (
    <LoginForm
      onLogin={(u) => {
        saveUser(u);
        setUser(u);
      }}
    />
  );
}