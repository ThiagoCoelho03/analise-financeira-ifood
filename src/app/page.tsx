"use client";

import { useState, useEffect } from "react";
import { User } from "@/lib/types";
import { getCurrentUser, saveUser, logout } from "@/lib/data";
import LoginForm from "@/components/LoginForm";
import Dashboard from "@/components/Dashboard";

export default function Page() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const u = await getCurrentUser();
      if (u) setUser(u);
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (u: User) => {
    await saveUser(u);
    setUser(u);
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return user ? (
    <Dashboard user={user} onLogout={handleLogout} />
  ) : (
    <LoginForm onLogin={handleLogin} />
  );
}
