import { AuthGate } from '../../lib/auth-context';
import { AppShell } from '../../components/AppShell';

export default function ApplicationLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate><AppShell>{children}</AppShell></AuthGate>;
}
