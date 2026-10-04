import { createContext, useContext } from 'react';
export const CompanyContext = createContext({ name: 'Company' });
export const useCompany = () => useContext(CompanyContext);
