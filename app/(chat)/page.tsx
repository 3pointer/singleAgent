import { cookies } from 'next/headers';

import ChatClient from './wrapper';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { generateUUID } from '@/lib/utils';

export default async function Page() {
  const id = generateUUID();

  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get('chat-model');

  const selectedModel = modelIdFromCookie?.value ?? DEFAULT_CHAT_MODEL;

  return (
    <>
      <ChatClient
        id={id}
        initialMessages={[]}
        selectedChatModel={selectedModel}
      />
    </>
  );
}
