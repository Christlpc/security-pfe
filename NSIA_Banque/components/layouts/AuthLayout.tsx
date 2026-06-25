"use client";

import { ReactNode } from "react";
import Image from "next/image";

interface AuthLayoutProps {
  readonly children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white px-4 sm:px-6 lg:px-8 py-12">
        <div className="w-full max-w-md">
          {/* Logo Section - More spacing from top */}
          <div className="text-center mb-10">
            <div className="flex justify-center mb-8">
              <div className="relative group">
                {/* Glow effect on hover */}
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative w-28 h-28 bg-blue-600 rounded-2xl shadow-2xl flex items-center justify-center border border-blue-500">
                  <Image
                    src="/logoNsiavie.png"
                    alt="NSIA Vie Assurances"
                    width={100}
                    height={100}
                    className="object-contain" // User requested original colors
                    priority
                  />
                </div>
              </div>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
              NSIA Vie Assurances
            </h1>
            <p className="text-gray-500 text-base font-medium">
            </p>
          </div>

          {/* Login Card - Premium Design */}
          <div className="relative">
            {/* Card Glow */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-3xl blur opacity-10"></div>
            <div className="relative bg-white rounded-2xl shadow-xl border border-gray-100/50 backdrop-blur-xl p-8 sm:p-10">
              {children}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-10 text-center space-y-2">
            <p className="text-sm text-gray-400">
              © {new Date().getFullYear()} NSIA Vie Assurances
            </p>
            <p className="text-xs text-gray-300">
              Tous droits réservés
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Decorative Hero */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800"></div>

        {/* Animated background shapes */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10"></div>
        </div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>

        {/* Content overlay */}
        <div className="relative z-10 flex flex-col justify-center items-center h-full px-16 text-white">
          <div className="max-w-lg">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 text-sm font-medium mb-8">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Plateforme sécurisée
            </div>

            <h2 className="text-5xl font-bold mb-6 leading-tight">
              Bienvenue sur la<br />
              <span className="text-blue-200">plateforme NSIA</span>
            </h2>
            <p className="text-xl text-blue-100/90 mb-12 leading-relaxed">
              Gérez vos simulations d'assurance et souscriptions en toute simplicité pour vos clients.
            </p>

            {/* Feature cards */}
            <div className="grid gap-4">
              <div className="flex items-center gap-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/15 transition-colors">
                <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Gestion simplifiée</h3>
                  <p className="text-blue-100/80 text-sm">Créez et gérez vos simulations en quelques clics</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/15 transition-colors">
                <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Sécurité renforcée</h3>
                  <p className="text-blue-100/80 text-sm">Vos données sont protégées avec les meilleurs standards</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/15 transition-colors">
                <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Performance optimale</h3>
                  <p className="text-blue-100/80 text-sm">Interface rapide et réactive pour une expérience fluide</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

