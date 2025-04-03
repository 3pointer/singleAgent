'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import { Chat } from '@/components/chat'; // your existing Chat
import { DataStreamHandler } from '@/components/data-stream-handler';

const DockerTerminal = dynamic(() => import('@/components/terminal'), {
  ssr: false,
});

export default function ChatClient({
  id,
  initialMessages,
  selectedChatModel,
}: {
  id: string;
  initialMessages: any[];
  selectedChatModel: string;
}) {
  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Left: Docker terminal */}
      <div style={{ flex: 1, borderRight: '1px solid #ccc' }}>
        <DockerTerminal chatId={id} />
      </div>

      {/* Right: your Chat interface */}
      <div style={{ flex: 1 }}>
        <Chat
          key={id}
          id={id}
          initialMessages={initialMessages}
          selectedChatModel={selectedChatModel}
          selectedVisibilityType="private"
          isReadonly={false}
        />
        <DataStreamHandler id={id} />
      </div>
    </div>
  );
}
