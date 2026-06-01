import type {Metadata} from 'next';
import './globals.css'; // Global styles
import { AuthProvider } from '../hooks/useAuth';

export const metadata: Metadata = {
  title: 'Caixinha Pro — Controle de Caixa e Finanças',
  description: 'Sistema completo de controle de caixinha operacional e fluxo financeiro',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
