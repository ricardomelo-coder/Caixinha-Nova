'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { Mail, Lock, ShieldAlert, ArrowRight, Eye, EyeOff, Loader2, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (user && !loading) {
      window.location.replace('/');
    }
  }, [user, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validation
    if (!email.trim()) {
      setErrorMsg('Debe informar o endereço de e-mail.');
      return;
    }
    if (!password) {
      setErrorMsg('Debe informar a senha de acesso.');
      return;
    }
    if (password.length < 4) {
      setErrorMsg('A senha padrão para teste é "123456".');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await login(email, password);
      if (response.success) {
        window.location.replace('/');
      } else {
        setErrorMsg(response.error || 'Credenciais inválidas.');
      }
    } catch (err) {
      setErrorMsg('Ocorreu um erro ao processar o login. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F3] font-sans flex flex-col justify-center items-center p-4 sm:p-6 md:p-8 antialiased selection:bg-neutral-950 selection:text-white">
      
      {/* Upper Brand Badge */}
      <div className="mb-8 flex flex-col items-center gap-1 text-center">
        <div className="px-3.5 py-1.5 bg-neutral-950 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-xs flex items-center gap-1.5 animate-bounce">
          <Sparkles className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
          Módulo de Autenticação
        </div>
        <h1 className="text-3xl font-black text-neutral-950 tracking-tighter mt-2">
          Caixinha<span className="text-emerald-600 font-extrabold text-2xl relative -top-1 ml-0.5">Pro</span>
        </h1>
        <p className="text-xs font-medium text-gray-500 max-w-xs leading-relaxed mt-1">
          Controle financeiro de caixinhas operacionais e fluxo de auditoria em conformidade legal.
        </p>
      </div>

      {/* Auth Card Container */}
      <div className="w-full max-w-md bg-white border border-gray-100 rounded-3xl shadow-xl hover:shadow-2xl transition duration-500 overflow-hidden">
        
        {/* Banner header inside card */}
        <div className="bg-neutral-950 p-6 text-white text-center sm:text-left flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-sm font-black tracking-wide uppercase text-gray-200">Acesso Restrito</h2>
            <p className="text-xs text-gray-400 mt-1">Insira suas credenciais cadastradas abaixo.</p>
          </div>
          <div className="hidden sm:block p-2.5 bg-white/10 rounded-2xl border border-white/15">
            <Lock className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Display Error Message */}
            {errorMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-start gap-2.5 text-xs font-semibold animate-shake">
                <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5 animate-pulse" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-xs font-extrabold text-neutral-950 uppercase tracking-wider block">
                E-mail Corporativo
              </label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400 group-focus-within:text-neutral-950 transition">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="exemplo@browne.com.br"
                  value={email}
                  disabled={isSubmitting}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 hover:bg-gray-100/70 focus:bg-white border border-gray-200 focus:border-neutral-950 rounded-xl text-sm font-medium text-neutral-950 outline-hidden transition cursor-text placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-extrabold text-neutral-950 uppercase tracking-wider">
                <label htmlFor="login-password">Senha de Segurança</label>
                <span className="text-[10px] text-gray-400 font-normal normal-case">Senha Padrão: 123456</span>
              </div>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400 group-focus-within:text-neutral-950 transition">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="········"
                  value={password}
                  disabled={isSubmitting}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-gray-50 hover:bg-gray-100/70 focus:bg-white border border-gray-200 focus:border-neutral-950 rounded-xl text-sm font-medium text-neutral-950 outline-hidden transition cursor-text placeholder:text-gray-400 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-450 hover:text-neutral-950 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 bg-neutral-950 text-white font-bold rounded-xl text-sm hover:bg-neutral-800 focus:ring-2 focus:ring-offset-2 focus:ring-neutral-950 transition shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verificando Credenciais...
                </>
              ) : (
                <>
                  Entrar no Sistema
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Soft branding disclaimer */}
      <footer className="mt-12 text-center space-y-1">
        <p className="text-[10px] text-gray-400">
          Caixinha Pro Corp © {new Date().getFullYear()} • Versão 3.5.0 Premium
        </p>
        <p className="text-[9px] text-gray-400/80">
          Arquitetura e desenvolvimento orientados por políticas de conformidade contábil e LGPD.
        </p>
      </footer>
      
    </div>
  );
}
