import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'System Design Simulator',
  description: 'Visual system design playground with live traffic simulation',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, height: '100vh', overflow: 'hidden' }}>
        {children}
      </body>
    </html>
  );
}
