import { useEffect, useState, useCallback, useRef } from 'react';
import apiClient from '../api/client';
import { useAuth } from './AuthContext';

import { CompanyContext } from './CompanyData';
export const CompanyProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [company, setCompany] = useState({ name: 'Company' });
  const request = useRef(0);
  const refreshCompany = useCallback(async () => {
    const sequence = ++request.current;
    try {
      if (!isAuthenticated) {
        const { data } = await apiClient.get('/settings/branding');
        if (sequence === request.current) setCompany(data);
      } else {
        const { data } = await apiClient.get('/settings/category/COMPANY');
        const profile = {};
        for (const [key, row] of Object.entries(data)) {
          try { profile[key.slice(8)] = JSON.parse(row.value); }
          catch { profile[key.slice(8)] = row.value; }
        }
        if (sequence === request.current) setCompany(profile);
      }
    } catch { /* Preserve last known branding during a connection interruption. */ }
  }, [isAuthenticated]);
  useEffect(() => { Promise.resolve().then(refreshCompany); }, [refreshCompany]);
  const initials = (company.name || 'Company').split(/\s+/).filter(Boolean).slice(0,2).map(word => word[0]).join('').toUpperCase();
  return <CompanyContext.Provider value={{ ...company, initials, refreshCompany }}>{children}</CompanyContext.Provider>;
};
