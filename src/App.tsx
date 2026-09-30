import React from 'react';
import { AuthProvider } from './context/AuthContext.tsx';
import { TicketProvider } from './context/TicketContext.tsx';
import { ChatProvider } from './context/ChatContext.tsx';
import { AppShell } from './components/layout/AppShell.tsx';

export default function App() {
  return (
    <AuthProvider>
      <TicketProvider>
        <ChatProvider>
          <AppShell />
        </ChatProvider>
      </TicketProvider>
    </AuthProvider>
  );
}
