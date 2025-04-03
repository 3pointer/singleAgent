// Define the basic controller type for TypeScript
type StreamController = {
  enqueue: (chunk: string) => void;
  close: () => void;
  error: (reason?: any) => void;
};

// Create a mapping to track command status globally across SSE connections
// Map structure: chatId => Set of clients
if (!globalThis.commandStatusClients) {
  globalThis.commandStatusClients = new Map<string, Set<StreamController>>();
}

// Track active commands per chat
if (!globalThis.activeCommands) {
  globalThis.activeCommands = new Map<string, {
    command: string;
    startTime: number;
  }>();
}

// Helper to broadcast command status to all clients for a chat
export function broadcastCommandStatus(
  chatId: string,
  status: { type: 'command-start' | 'command-end'; command?: string; commandId?: string }
) {
  const clients = globalThis.commandStatusClients?.get(chatId);
  if (!clients) return;

  const message = JSON.stringify(status);
  
  // Track command state globally
  if (status.type === 'command-start' && status.command) {
    if (globalThis.activeCommands) {
      globalThis.activeCommands.set(chatId, {
        command: status.command,
        startTime: Date.now(),
      });
    }
  } else if (status.type === 'command-end') {
    globalThis.activeCommands?.delete(chatId);
  }
  
  // Send to all clients
  for (const controller of clients) {
    try {
      controller.enqueue(`data: ${message}\n\n`);
    } catch (error) {
      console.error('Error broadcasting command status:', error);
    }
  }
}

export function getActiveCommand(chatId: string) {
  return globalThis.activeCommands?.get(chatId);
}

export function registerClient(
  chatId: string,
  controller: StreamController
) {
  if (!globalThis.commandStatusClients) {
    globalThis.commandStatusClients = new Map();
  }

  if (!globalThis.commandStatusClients.has(chatId)) {
    globalThis.commandStatusClients.set(chatId, new Set());
  }
  
  globalThis.commandStatusClients.get(chatId)?.add(controller);
  
  return () => {
    const clients = globalThis.commandStatusClients?.get(chatId);
    if (clients) {
      clients.delete(controller);
      if (clients.size === 0 && globalThis.commandStatusClients) {
        globalThis.commandStatusClients.delete(chatId);
      }
    }
  };
}