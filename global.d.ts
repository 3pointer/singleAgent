// global.d.ts
import type { IPty } from 'node-pty';

// Define a type for the controller used in SSE connections
type StreamController = {
  enqueue: (chunk: string) => void;
  close: () => void;
  error: (reason?: any) => void;
};

declare global {
  // Declare our global variables on globalThis
  var dockerProcs: Map<string, IPty> | null;
  var commandStatusClients: Map<string, Set<StreamController>> | null;
  var activeCommands: Map<string, {
    command: string;
    startTime: number;
  }> | null;
}
