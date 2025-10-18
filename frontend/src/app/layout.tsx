import './globals.css';
import React from 'react';

export const metadata = {
  title: 'AI Chatbot',
  description: 'Modern AI chatbot with memory and RAG',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="dark min-h-screen antialiased bg-background text-foreground relative overflow-x-hidden transition-colors duration-200">
        {/* animated background grid */}
        <div className="pointer-events-none fixed inset-0 bg-grid [background-size:20px_20px] opacity-20" />
        {/* radial fade accent */}
        <div className="pointer-events-none fixed inset-0 bg-radial-fade" />
        {children}
      </body>
    </html>
  );
}

