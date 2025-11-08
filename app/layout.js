import { AuthProvider } from './contexts/AuthContext';
import './globals.css';
import { Dancing_Script } from 'next/font/google';

const dancingScript = Dancing_Script({
  subsets: ['latin'],
  variable: '--font-dancing-script',
  weight: ['400', '700'],
});

export const metadata = {
  title: 'Blink Anonymous chat',
  description: 'Anonymous encrypted chat. No data stored.',
  icons: {
    icon: '/favicon.png', // path relative to the "public" folder
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${dancingScript.variable} font-sans`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}