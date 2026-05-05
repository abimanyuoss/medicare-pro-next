"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Heart, Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react";
import { login } from "@/app/actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="login-submit-btn"
      id="login-submit"
      disabled={pending}
    >
      {pending ? (
        <div className="login-spinner" />
      ) : (
        <>
          Masuk
          <ArrowRight size={18} />
        </>
      )}
    </button>
  );
}

export default function LoginForm({
  hasError,
}: {
  hasError: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="login-page">
      {/* Animated background */}
      <div className="login-bg">
        <div className="login-bg-orb login-bg-orb-1" />
        <div className="login-bg-orb login-bg-orb-2" />
        <div className="login-bg-orb login-bg-orb-3" />
        <div className="login-bg-grid" />
      </div>

      <div className="login-container">
        {/* Left branding panel */}
        <div className="login-branding">
          <div className="login-branding-content">
            <div className="login-logo-badge">
              <Heart className="login-logo-icon" size={32} strokeWidth={2.5} />
            </div>

            <h1 className="login-branding-title">
              MediCare<span>Pro</span>
            </h1>

            <p className="login-branding-subtitle">
              Sistem Manajemen Klinik &amp; Rumah Sakit Modern
            </p>

            <div className="login-features">
              <div className="login-feature-item">
                <div className="login-feature-dot" />
                <span>Dashboard Real-time</span>
              </div>
              <div className="login-feature-item">
                <div className="login-feature-dot" />
                <span>Manajemen Pasien</span>
              </div>
              <div className="login-feature-item">
                <div className="login-feature-dot" />
                <span>Laporan Keuangan</span>
              </div>
              <div className="login-feature-item">
                <div className="login-feature-dot" />
                <span>Rekam Medis Digital</span>
              </div>
            </div>

            <div className="login-branding-footer">
              <ShieldCheck size={16} />
              <span>Dilindungi enkripsi end-to-end</span>
            </div>
          </div>

          {/* Decorative elements */}
          <div className="login-branding-decor-1" />
          <div className="login-branding-decor-2" />
        </div>

        {/* Right form panel */}
        <div className="login-form-panel">
          <div className="login-form-wrapper">
            {/* Mobile logo */}
            <div className="login-mobile-logo">
              <Heart size={24} strokeWidth={2.5} />
              <span>MediCare<strong>Pro</strong></span>
            </div>

            <div className="login-form-header">
              <h2>Selamat Datang</h2>
              <p>Masuk ke akun Anda untuk melanjutkan</p>
            </div>

            <form action={login} className="login-form" id="login-form">
              {hasError && (
                <div className="login-error" id="login-error">
                  <div className="login-error-icon">!</div>
                  <span>Username atau password salah!</span>
                </div>
              )}

              <div className="login-field">
                <label htmlFor="username">Username</label>
                <div className="login-input-wrapper">
                  <User size={18} className="login-input-icon" />
                  <input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="Masukkan username"
                    required
                    autoFocus
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="login-field">
                <label htmlFor="password">Password</label>
                <div className="login-input-wrapper">
                  <Lock size={18} className="login-input-icon" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Masukkan password"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="login-eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <SubmitButton />
            </form>

            <div className="login-footer">
              <p>&copy; 2026 MediCare Pro. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
