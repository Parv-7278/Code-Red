import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, getUserProfile, signInWithEmail, signOutUser } from '../services/supabaseClient';

export const DEMO_OPERATORS = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'india.operator@polaris.gov.in',
    full_name: 'Dr. Rajesh Sharma',
    role: 'india_operator',
    clearance: 'Level 5 (Alpha - National Command)',
    station_id: null,
    title: 'HQ National Polar Mission Director',
    department: 'Ministry of Earth Sciences / NCPOR Goa HQ',
    locationBadge: 'New Delhi / NCPOR Goa HQ',
    avatar: 'RS',
    description: 'Complete cross-station command, satellite uplink management & crisis authority for both Maitri and Bharati.'
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'maitri.operator@polaris.gov.in',
    full_name: 'Cmdr. Vikram Nair',
    role: 'station_operator',
    clearance: 'Level 4 (Bravo - Station Lead)',
    station_id: 'station-maitri',
    title: 'Maitri Station Lead Commander',
    department: 'Indian Antarctic Expedition - 44th ISEA',
    locationBadge: 'Schirmacher Oasis (70°45′S)',
    avatar: 'VN',
    description: 'Local life-support, diesel generator grid, Priyadarshini water systems, and Schirmacher weather operations.'
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    email: 'bharati.operator@polaris.gov.in',
    full_name: 'Dr. Sunita Deshmukh',
    role: 'station_operator',
    clearance: 'Level 4 (Bravo - Station Lead)',
    station_id: 'station-bharati',
    title: 'Bharati Station Lead Commander',
    department: 'Indian Antarctic Expedition - 44th ISEA',
    locationBadge: 'Larsemann Hills (69°24′S)',
    avatar: 'SD',
    description: 'Local coastal radar, ISRO ground station, Combined Heat & Power (CHP) plant, and RO desalination.'
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    email: 'science.lead@polaris.gov.in',
    full_name: 'Dr. Ananya Roy',
    role: 'science_lead',
    clearance: 'Level 3 (Charlie - Polar Research)',
    station_id: null,
    title: 'Chief Glaciology & Climate Lead',
    department: 'Atmospheric & Cryospheric Sciences Lab',
    locationBadge: 'Inter-Station Field Laboratories',
    avatar: 'AR',
    description: 'Ice core paleoclimate drilling telemetry, ozone spectrophotometer logs, and geomagnetic surveys.'
  },
  {
    id: '00000000-0000-0000-0000-000000000005',
    email: 'power.lead@polaris.gov.in',
    full_name: 'Eng. Arjun Mehta',
    role: 'engineer_lead',
    clearance: 'Level 3 (Charlie - Systems & Grid)',
    station_id: 'station-bharati',
    title: 'Chief Power & Life-Support Engineer',
    department: 'Station Infrastructure & Microgrid Team',
    locationBadge: 'Larsemann Hills (Bharati Microgrid)',
    avatar: 'AM',
    description: 'CHP cogeneration efficiency, smart microgrid load-balancing, and permafrost foundation monitoring.'
  }
];

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Always start on the Government of India Login Portal as the main initial page
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sync profile changes to storage for reference
  useEffect(() => {
    if (profile) {
      sessionStorage.setItem('polaris_auth_profile', JSON.stringify(profile));
    } else {
      sessionStorage.removeItem('polaris_auth_profile');
      localStorage.removeItem('polaris_auth_profile');
    }
  }, [profile]);

  // Handle Supabase Auth state changes if Supabase is configured
  useEffect(() => {
    if (!supabase) return;

    // Check active session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        const userProf = await getUserProfile(session.user.id);
        if (userProf) setProfile(userProf);
        else {
          setUser(null);
          setProfile(null);
          setError('Your account is authenticated but has no authorized POLARIS operator profile. Contact an administrator.');
          await signOutUser();
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        const userProf = await getUserProfile(session.user.id);
        if (userProf) setProfile(userProf);
        else {
          setUser(null);
          setProfile(null);
          setError('Your account is authenticated but has no authorized POLARIS operator profile. Contact an administrator.');
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        // Do not force wipe if demo profile is active
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loginWithDemoRole = useCallback((roleOrOperatorId) => {
    setError(null);
    let matched = DEMO_OPERATORS.find(op => op.id === roleOrOperatorId || op.role === roleOrOperatorId || op.station_id === roleOrOperatorId);
    if (!matched) {
      matched = DEMO_OPERATORS[0];
    }
    setProfile(matched);
    setUser({
      id: matched.id,
      email: matched.email,
      user_metadata: {
        full_name: matched.full_name,
        role: matched.role,
        station_id: matched.station_id,
      }
    });
    return matched;
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      if (supabase) {
        const data = await signInWithEmail(email, password);
        setUser(data.user);
        const prof = await getUserProfile(data.user.id);
        if (!prof) {
          await signOutUser();
          setUser(null);
          setProfile(null);
          throw new Error('This account has no authorized POLARIS operator profile.');
        }
        setProfile(prof);
        return prof;
      } else {
        // Find matching demo user by email
        const matched = DEMO_OPERATORS.find(op => op.email.toLowerCase() === email.toLowerCase()) || DEMO_OPERATORS[0];
        setProfile(matched);
        return matched;
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    if (supabase) {
      await signOutUser();
    }
    setUser(null);
    setProfile(null);
    localStorage.removeItem('polaris_auth_profile');
  }, []);

  const isIndiaOperator = profile?.role === 'india_operator';
  const isStationOperator = profile?.role === 'station_operator';
  const assignedStation = profile?.station_id || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: profile?.role || null,
        station_id: profile?.station_id || null,
        isIndiaOperator,
        isStationOperator,
        assignedStation,
        loading,
        error,
        login,
        loginWithDemoRole,
        logout,
        demoOperators: DEMO_OPERATORS,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
