import React, { useState } from 'react';
import { ArrowRight, Building2, Mountain, Radio, Eye, EyeOff, AlertCircle, Compass, Activity, ChartNoAxesCombined, SlidersHorizontal, Database, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../services/supabaseClient';
import './PortalNavigation.css';

const workspaces = [
  { id: 'india_operator', name: 'India Control Centre', subtitle: 'Compare and coordinate both stations', location: 'Cross-station workspace', icon: Building2 },
  { id: 'station-maitri', name: 'Maitri Station', subtitle: 'Local systems, forecasts and operations', location: 'Schirmacher Oasis · Antarctica', icon: Mountain },
  { id: 'station-bharati', name: 'Bharati Station', subtitle: 'Local systems, forecasts and operations', location: 'Larsemann Hills · Antarctica', icon: Radio },
];

export default function LandingPage() {
  const { loginWithDemoRole, login, loading } = useAuth();
  const [accessMode, setAccessMode] = useState('demo');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const configured = isSupabaseConfigured();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    if (!configured) {
      setErrorMessage('Operator sign-in is not configured. Use a demonstration workspace to explore POLARIS.');
      return;
    }
    try {
      await login(email.trim(), password);
    } catch (error) {
      setErrorMessage(error.message || 'Could not sign in. Check your credentials and try again.');
    }
  };

  return (
    <div className="pl-portal">
      <header className="pl-portal-masthead">
        <a className="pl-portal-wordmark" href="#portal-main" aria-label="POLARIS home">
          <span className="pl-portal-brand-icon"><Compass size={26} aria-hidden="true" /></span>
          <span><strong>POLARIS</strong><small>Polar operations workspace</small></span>
        </a>
        <span className="pl-portal-prototype">Research &amp; demonstration prototype</span>
      </header>

      <main className="pl-portal-main" id="portal-main">
        <section className="pl-portal-intro" aria-labelledby="portal-title">
          <img className="pl-portal-hero-image" src="/antarctic_hero_bg.jpg" alt="Indian Antarctic research station surrounded by snow-covered mountains" />
          <div className="pl-portal-hero-overlay" aria-hidden="true" />
          <div className="pl-portal-hero-content">
            <p className="pl-portal-eyebrow">ANTARCTIC STATION OPERATIONS</p>
            <h1 id="portal-title">Mission operations for a resilient Antarctic presence.</h1>
            <p className="pl-portal-lead">A shared workspace for station telemetry, predictive risk analysis and operational planning across Maitri and Bharati.</p>
            <div className="pl-portal-capabilities" aria-label="Workspace capabilities">
              <span><Building2 size={15} aria-hidden="true" /><strong>2</strong> station workspaces</span>
              <span><ChartNoAxesCombined size={15} aria-hidden="true" /><strong>4</strong> forecast horizons</span>
              <span><Database size={15} aria-hidden="true" /> simulation-ready telemetry</span>
            </div>
            <div className="pl-portal-station-register" aria-label="Station coverage">
              <div><span className="pl-portal-station-index">01</span><span><strong>Maitri</strong><small>Schirmacher Oasis</small></span><span className="pl-portal-station-type">Inland station</span></div>
              <div><span className="pl-portal-station-index">02</span><span><strong>Bharati</strong><small>Larsemann Hills</small></span><span className="pl-portal-station-type">Coastal station</span></div>
            </div>
            <p className="pl-portal-disclosure"><ShieldCheck size={17} aria-hidden="true" /><span><strong>Transparent by design.</strong> Demonstration workspaces use sample and simulated telemetry. Forecasts support scenario exploration and are not validated for field operations.</span></p>
          </div>
        </section>

        <section className="pl-portal-access" aria-labelledby="access-title">
          <div className="pl-portal-access-heading"><p className="pl-portal-eyebrow">WORKSPACE ACCESS</p><h2 id="access-title">Choose your workspace</h2><p>Explore a station or view both from India.</p></div>
          <div className="pl-portal-mode-switch" role="group" aria-label="Access method">
            <button type="button" aria-pressed={accessMode === 'demo'} className={accessMode === 'demo' ? 'is-active' : ''} onClick={() => { setAccessMode('demo'); setErrorMessage(''); }}>Demo access</button>
            <button type="button" aria-pressed={accessMode === 'account'} className={accessMode === 'account' ? 'is-active' : ''} onClick={() => { setAccessMode('account'); setErrorMessage(''); }}>Operator sign-in</button>
          </div>
          {errorMessage && <p className="pl-portal-error" role="alert"><AlertCircle size={18} aria-hidden="true" />{errorMessage}</p>}
          {accessMode === 'demo' ? (
            <div className="pl-portal-workspaces">
              {workspaces.map(({ id, name, subtitle, location, icon: Icon }) => (
                <button type="button" key={id} className="pl-portal-workspace" onClick={() => loginWithDemoRole(id)} disabled={loading}>
                  <span className="pl-portal-workspace-icon"><Icon size={23} aria-hidden="true" /></span>
                  <span className="pl-portal-workspace-copy"><strong>{name}</strong><span>{subtitle}</span><small>{location}</small></span>
                  <ArrowRight size={19} aria-hidden="true" />
                </button>
              ))}
              <p className="pl-portal-access-note">No account required. Each station opens with its assigned demonstration role.</p>
            </div>
          ) : (
            <form className="pl-portal-form" onSubmit={handleSubmit}>
              {!configured && <p className="pl-portal-config-note">Operator sign-in is unavailable in this installation. You can use Demo access to explore all three workspaces.</p>}
              <label htmlFor="polaris-email">Operator email</label>
              <input id="polaris-email" type="email" name="email" autoComplete="username" placeholder="name@organisation.org" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={!configured || loading} />
              <label htmlFor="polaris-password">Password</label>
              <div className="pl-portal-password-wrap">
                <input id="polaris-password" type={showPassword ? 'text' : 'password'} name="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={!configured || loading} />
                <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword((shown) => !shown)} disabled={!configured}><span>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</span></button>
              </div>
              <button className="pl-portal-submit" type="submit" disabled={!configured || loading}>{loading ? 'Signing in…' : 'Sign in'}<ArrowRight size={17} aria-hidden="true" /></button>
              <p className="pl-portal-access-note">Use an account provisioned for your organisation. Demo access is available separately.</p>
            </form>
          )}
        </section>

        <section className="pl-portal-workflow" aria-label="How the workspace supports decisions">
          <article><Activity size={22} aria-hidden="true" /><div><h2>Monitor conditions</h2><p>Review energy, environment and infrastructure in a station-specific view.</p></div></article>
          <article><ChartNoAxesCombined size={22} aria-hidden="true" /><div><h2>Explore forecasts</h2><p>Inspect trajectories, thresholds and the factors behind predicted risk.</p></div></article>
          <article><SlidersHorizontal size={22} aria-hidden="true" /><div><h2>Compare interventions</h2><p>Change scenario inputs and compare the expected outcome of an action.</p></div></article>
        </section>
      </main>
      <footer className="pl-portal-footer"><span>POLARIS · Polar Operations &amp; Logistics</span><span>Academic prototype · Not an official government service</span></footer>
    </div>
  );
}
