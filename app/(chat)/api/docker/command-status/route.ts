import { getDockerProcess } from '../process';
import { registerClient, getActiveCommand } from './utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');

  if (!chatId) {
    return new Response('Missing chatId parameter', { status: 400 });
  }

  // Check if Docker process exists
  const dockerProc = getDockerProcess(chatId);
  if (!dockerProc) {
    return new Response('No Docker process found for this chat', { status: 404 });
  }

  const encoder = new TextEncoder();
  // Import the StreamController type 
  let controllerRef: any = null;
  let cleanupFunction: (() => void) | null = null;
  
  const stream = new ReadableStream({
    start(controller) {
      // Save controller reference
      controllerRef = controller;
      
      // Register this client for the chat
      const unregister = registerClient(chatId, controller);
      
      // Send initial status if a command is active
      const activeCommand = getActiveCommand(chatId);
      if (activeCommand) {
        const message = JSON.stringify({
          type: 'command-start',
          command: activeCommand.command,
          startTime: activeCommand.startTime,
        });
        controller.enqueue(`data: ${message}\n\n`);
      }
      
      // Keep-alive interval to prevent connection timeout
      const keepAliveInterval = setInterval(() => {
        controller.enqueue(": ping\n\n");
      }, 30000);
      
      // Create cleanup function
      cleanupFunction = () => {
        clearInterval(keepAliveInterval);
        unregister();
      };
    },
    cancel() {
      if (cleanupFunction) {
        cleanupFunction();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}