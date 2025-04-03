import {
  type Message,
  createDataStreamResponse,
  smoothStream,
  streamText,
} from 'ai';

import { auth } from '@/app/(auth)/auth';
import { myProvider } from '@/lib/ai/models';
import { systemPrompt } from '@/lib/ai/prompts';
import {
  deleteChatById,
  getChatById,
  saveChat,
  saveMessages,
} from '@/lib/db/queries';
import {
  generateUUID,
  getMostRecentUserMessage,
  sanitizeResponseMessages,
} from '@/lib/utils';

import { generateTitleFromUserMessage } from '../../actions';
import { executeCommand } from '@/lib/ai/tools/execute-command';

export const maxDuration = 60;

export async function POST(request: Request) {
  const {
    id,
    messages,
    selectedChatModel,
  }: { id: string; messages: Array<Message>; selectedChatModel: string } =
    await request.json();

  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userMessage = getMostRecentUserMessage(messages);

  if (!userMessage) {
    return new Response('No user message found', { status: 400 });
  }

  const chat = await getChatById({ id });

  if (!chat) {
    const title = await generateTitleFromUserMessage({ message: userMessage });
    await saveChat({ id, userId: session.user.id, title });
  }

  await saveMessages({
    messages: [{ ...userMessage, createdAt: new Date(), chatId: id }],
  });

  return createDataStreamResponse({
    execute: (dataStream) => {
      // Track command execution state
      let pendingCommands = 0;
      let finishCalled = false;
      
      // Create a promise that resolves when all commands are complete
      const allCommandsComplete = () => {
        return new Promise<void>(resolve => {
          // If no commands are pending, resolve immediately
          if (pendingCommands === 0) {
            resolve();
          } else {
            // Otherwise set up a checker that runs every 100ms
            const checkInterval = setInterval(() => {
              if (pendingCommands === 0) {
                clearInterval(checkInterval);
                resolve();
              }
            }, 100);
          }
        });
      };

      // filter no result messages
      messages.map((message) => {
        if (message.toolInvocations && message.toolInvocations.length >= 1) {
          message.toolInvocations = message.toolInvocations.filter(
            (toolInvocation) => toolInvocation.state === 'result'
          );
        }
      });
      
      const result = streamText({
        model: myProvider.languageModel(selectedChatModel),
        system: systemPrompt({ selectedChatModel }),
        messages,
        maxSteps: 5,
        experimental_activeTools: ['executeCommand'],
        experimental_transform: smoothStream({ chunking: 'word' }),
        experimental_generateMessageId: generateUUID,
        tools: {
          executeCommand: executeCommand({ 
            chatId: id, 
            dataStream,
            onCommandStart: () => {
              pendingCommands++;
              console.log(`Command started. Pending commands: ${pendingCommands}`);
            },
            onCommandComplete: () => {
              pendingCommands--;
              console.log(`Command completed. Pending commands: ${pendingCommands}`);
            }
          }),
        },
        onFinish: async ({ response, reasoning }) => {
          console.log("chat response", response);
          finishCalled = true;
          
          if (session.user?.id) {
            try {
              // Wait for all commands to complete before saving messages
              if (pendingCommands > 0) {
                console.log(`Waiting for ${pendingCommands} commands to complete before saving chat...`);
                await allCommandsComplete();
                console.log("All commands completed, now saving chat");
              }
              
              const sanitizedResponseMessages = sanitizeResponseMessages({
                messages: response.messages,
                reasoning,
              });

              await saveMessages({
                messages: sanitizedResponseMessages.map((message) => {
                  return {
                    id: message.id,
                    chatId: id,
                    role: message.role,
                    content: JSON.stringify(message.content),
                    createdAt: new Date(),
                  };
                }),
              });
            } catch (error) {
              console.error('Failed to save chat');
            }
          }
        },
      });

      result.mergeIntoDataStream(dataStream, {
        sendReasoning: true,
      });
    },
    onError: (error) => {
      console.error('Stream error:', error);
      return 'Oops, an error occurred!';
    },
  });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    await deleteChatById({ id });

    return new Response('Chat deleted', { status: 200 });
  } catch (error) {
    return new Response('An error occurred while processing your request', {
      status: 500,
    });
  }
}
