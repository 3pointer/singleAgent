import { spawn, type IPty } from 'node-pty';
import { broadcastCommandStatus } from './command-status/utils';

// Store Docker processes by chat ID
if (!globalThis.dockerProcs) {
  globalThis.dockerProcs = new Map<string, IPty>();
}

export function getDockerProcess(chatId?: string) {
  if (!chatId) {
    return null;
  }
  return globalThis.dockerProcs?.get(chatId) || null;
}

export function createDockerProcess(container: string, chatId: string) {
  // Add dynamic dimensions instead of hard-coded values
  const defaultDimensions = {
    cols: 100, // increased from 80
    rows: 30, // increased from 24
  };

  const dockerProc = spawn('docker', [
    'exec',
    process.env.DOCKER_EXEC_FLAGS || '-it',
    '-e', `RAG_API_KEY=${process.env.RAG_API_KEY || ''}`,
    '-e', `RAG_API_ADDR=${process.env.RAG_API_ADDR || ''}`,
    container,
    process.env.DOCKER_SHELL || '/bin/bash',
    '-c',
    `stty -icanon && stty -opost && export PS1='\\[\\e[32m\\]${process.env.DOCKER_CONTAINER_NAME || 'docker-terminal'}\\[\\e[0m\\]:\\[\\e[34m\\]\\w\\[\\e[0m\\]$ ' && bash`
  ], {
    name: process.env.DOCKER_TERM || 'xterm-256color',
    cols: defaultDimensions.cols,
    rows: defaultDimensions.rows,
    cwd: process.env.HOME,
    env: {
      TERM: process.env.DOCKER_TERM || 'xterm-256color',
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      SHELL: process.env.DOCKER_SHELL || '/bin/bash',
    },
  });

  // Add resize handler function
  const updateProcDimensions = (cols: number, rows: number) => {
    if (dockerProc?.resize) {
      try {
        dockerProc.resize(cols, rows);
      } catch (e) {
        console.error('Failed to resize docker process:', e);
      }
    }
  };

  globalThis.dockerProcs?.set(chatId, dockerProc);
  // Attach the resize function to the process for external access
  (dockerProc as any).updateDimensions = updateProcDimensions;

  // Set up command tracking
  let commandBuffer = '';
  let inCommand = false;
  
  dockerProc.onData((data) => {
    // Only check for command completion, don't process output
    if (inCommand && data.includes(process.env.DOCKER_CONTAINER_NAME|| 'docker-terminal')) {
      inCommand = false;
      broadcastCommandStatus(chatId, { 
        type: 'command-end'
      });
    }
  });
  
  // When writing to the process, monitor for commands (Enter key)
  const originalWrite = dockerProc.write;
  (dockerProc as any).write = (data: string) => {
    // When input contains the newline character, consider it a command being executed
    if (data.includes('\n')) {
      const command = commandBuffer.trim();
      // Only track non-empty commands
      if (command) {
        inCommand = true;
        broadcastCommandStatus(chatId, {
          type: 'command-start',
          command
        });
        // Reset command buffer after executing
        commandBuffer = '';
      } else {
        // Empty commands just reset the buffer
        commandBuffer = '';
      }
    } else {
      // Accumulate command input
      commandBuffer += data;
    }
    
    return originalWrite.call(dockerProc, data);
  };

  return dockerProc;
}

// Add a new function to handle dimension updates
export function updateDockerProcessDimensions(
  cols: number,
  rows: number,
  chatId?: string,
) {
  const proc = getDockerProcess(chatId);
  if (proc && (proc as any).updateDimensions) {
    (proc as any).updateDimensions(cols, rows);
  }
}

// Clean up a Docker process for a specific chat
export function cleanupDockerProcess(chatId: string) {
  const proc = getDockerProcess(chatId);
  if (proc) {
    try {
      proc.kill();
    } catch (e) {
      console.error('Error killing Docker process:', e);
    }
    globalThis.dockerProcs?.delete(chatId);
    
    // Notify command ended
    broadcastCommandStatus(chatId, { type: 'command-end' });
  }
}

// Terminate a running command in a Docker process
export function terminateCommand(chatId: string) {
  const proc = getDockerProcess(chatId);
  
  try {
    // Send CTRL+C to the process
    if (proc) {
      proc.write('\x03');
      return true;
    }
  } catch (e) {
    console.error('Error terminating command:', e);
  }
  
  return false;
}

