import { NextResponse } from 'next/server';
import { createDockerProcess, cleanupDockerProcess } from '../process';

export async function GET(request: Request) {
  // Get the chat ID from the query string
  const url = new URL(request.url);
  const chatId = url.searchParams.get('chatId');

  console.log("enter");

  if (!chatId) {
    return new Response('No chat ID provided', { status: 400 });
  }

  // If no process yet, spawn one, e.g. `docker exec -it <container> sh`
  const dockerContainer = process.env.DOCKER_CONTAINER;
  if (!dockerContainer) {
    return new Response('No container specified', { status: 400 });
  }

  const dockerProc = createDockerProcess(dockerContainer, chatId);
  // Typically you'd store references in a more robust way

  const stream = new ReadableStream({
    start(controller) {
      let buffer = '';

      dockerProc.onData((chunk: string) => {
        buffer += chunk;

        // Process and send data in chunks, preserving all control characters
        if (buffer.length > 0) {
          // Escape newlines for SSE format but preserve them for terminal
          const escapedBuffer = buffer
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r');
          controller.enqueue(`data: ${escapedBuffer}\n\n`);
          buffer = '';
        }
      });

      dockerProc.onExit(() => {
        if (buffer) {
          const escapedBuffer = buffer
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r');
          controller.enqueue(`data: ${escapedBuffer}\n\n`);
        }
        // Clean up the docker process
        if (chatId) {
          cleanupDockerProcess(chatId);
        }
        console.log('Docker process exited');
        controller.close();
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
