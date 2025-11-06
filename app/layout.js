import { Providers } from './providers';
import './globals.css';

export const metadata = {
  title: 'Blink Anonymous chat',
  description: 'Anonymous encrypted chat. No data stored. ',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gradient-to-br from-blue-600 to-purple-600 min-h-screen">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
