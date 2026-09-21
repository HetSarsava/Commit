import './globals.css';
import { AuthProvider } from '../lib/auth-context';

export const metadata = {
  title: 'Commit — Amit Uniform',
  description: 'Lead to order business operating system',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><AuthProvider>{children}</AuthProvider></body></html>;
}
