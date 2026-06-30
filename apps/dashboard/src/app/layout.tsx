import './globals.css';
import React from 'react';

export const metadata = {
  title: 'Translation Platform | Admin',
  description: 'Centralized translation management system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
