import './globals.css';

export const metadata = {
  title: 'Health Platform',
  description: 'Privacy-First IoT Health Monitoring with Blockchain Anchoring and Zero-Knowledge Proofs',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
