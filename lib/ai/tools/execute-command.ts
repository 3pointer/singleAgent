import { type DataStreamWriter, tool } from 'ai';
import { z } from 'zod';
import {
  getDockerProcess,
  createDockerProcess
} from '@/app/(chat)/api/docker/process';
import type { IPty } from 'node-pty';

interface ExecuteCommandProps {
  chatId: string;
  dataStream: DataStreamWriter;
  onCommandStart?: () => void;
  onCommandComplete?: () => void;
}


export const executeCommand = ({ chatId, dataStream, onCommandStart, onCommandComplete }: ExecuteCommandProps) =>
  tool({
    description:
      'Execute a command based on user requirements in the terminal and return the result',
    parameters: z.object({
      command: z
        .string()
        .describe('The command to execute in the Docker container'),
      timeout: z
        .number()
        .optional()
        .default(30000)
        .describe('Timeout in milliseconds (default: 30000)'),
    }),
    execute: async ({ command, timeout = 30000 }) => {
      try {
        // Notify that command execution is starting
        if (onCommandStart) {
          console.log("running command:", command);
          onCommandStart();
        }
        
        // Get or create the Docker process for this chat
        let dockerProc = getDockerProcess(chatId);
        const dockerContainer = process.env.DOCKER_CONTAINER;

        if (!dockerProc && dockerContainer) {
          dockerProc = createDockerProcess(dockerContainer, chatId);
        }

        if (!dockerProc) {
          // Command failed - notify completion
          if (onCommandComplete) {
            onCommandComplete();
          }
          
          // Important: Always return an object that can be serialized properly
          return {
            success: false,
            error: 'No Docker process running and no container specified.',
            command,
          };
        }

        // We need to store command data for proper state handling
        dataStream.writeData({
          type: 'command',
          content: command,
        });

        const result = await executeCommandInDocker(
          dockerProc,
          command,
          timeout
        );
        
        // Notify that command execution is complete
        if (onCommandComplete) {
          onCommandComplete();
        }
        
        console.log("command result:", result);
        return result;
      } catch (error) {
        // Notify that command execution is complete, even on error
        if (onCommandComplete) {
          onCommandComplete();
        }
        
        // Ensure we always return a serializable result
        return {
          success: false,
          error:
            error instanceof Error ? error.message : 'Unknown error occurred',
          command,
        };
      }
    },
  });

/**
 * Execute a command in the Docker container with proper handling of events and cleanup
 */
async function executeCommandInDocker(
  dockerProc: IPty,
  command: string,
  timeout: number,
): Promise<{
  success: boolean;
  output?: string;
  error?: string;
  command: string;
}> {
  return new Promise<{
    success: boolean;
    output?: string;
    error?: string;
    command: string;
  }>((resolve) => {
    // Reset output at the start of each command
    let output = '';

    // Clear terminal buffer before executing new command
    dockerProc.clear();

    const MAX_OUTPUT_SIZE = 1000; // Maximum number of characters to return for large outputs
    const MAX_LINES = 30; // Maximum number of lines to return

    // Set up to track the command

    // Set a completion flag to ensure we always resolve the promise
    let hasResolved = false;

    // Store the event disposables
    let dataDisposable: { dispose: () => void };
    let exitDisposable: { dispose: () => void };

    const dataListener = (data: string) => {
      try {
        output += data;
        console.log('Command output:', data);

        // Process output to remove command echo and trailing prompt
        // Check if the line contains our custom prompt pattern
        if (data.includes(process.env.DOCKER_CONTAINER_NAME || 'docker-terminal')) {
          if (hasResolved) return; // Prevent double resolution
          hasResolved = true;
          cleanup();

          const outputLines = output.split('\n');
          // Remove the first line if it contains the command
          if (outputLines.length > 1 && outputLines[0]?.endsWith(command)) {
            outputLines.shift();
          }

          // Remove the last line if it contains our prompt
          const lastLine = outputLines[outputLines.length - 1];
          if (outputLines.length > 1 && lastLine?.endsWith(process.env.DOCKER_CONTAINER_NAME || 'docker-terminal')) {
            outputLines.pop();
          }

          // Detect if this is a large output based on line count or total length
          const isLargeOutput =
            outputLines.length > MAX_LINES ||
            outputLines.join('\n').length > MAX_OUTPUT_SIZE;

          if (isLargeOutput) {
            // If it's large output, truncate it and add a note
            let truncatedOutput: string;

            if (outputLines.length > MAX_LINES) {
              // Keep first and last few lines
              const keepLines = Math.floor(MAX_LINES / 2);
              const firstHalf = outputLines.slice(0, keepLines);
              const secondHalf = outputLines.slice(-keepLines);
              
              truncatedOutput = [
                ...firstHalf,
                `\n[... ${outputLines.length - MAX_LINES} more lines hidden ...]\n`,
                ...secondHalf
              ].join('\n');
            } else {
              // If it's too long by characters but not lines,
              // still try to show beginning and end
              const content = outputLines.join('\n');
              const halfSize = Math.floor(MAX_OUTPUT_SIZE / 2);
              
              truncatedOutput = 
                `${content.substring(0, halfSize)}\n[... content truncated ...]\n${content.substring(content.length - halfSize)}`;
            }

            resolve({
              success: true,
              output: truncatedOutput.trim(),
              command,
            });
          } else {
            // Regular sized output - return as is
            resolve({
              success: true,
              output:
                outputLines.join('\n').trim() ||
                'Command executed successfully.',
              command,
            });
          }
        }
      } catch (err) {
        // Handle any errors in data processing
        console.error('Error processing command output:', err);
        if (!hasResolved) {
          hasResolved = true;
          cleanup();
          resolve({
            success: true,
            output:
              'Command executed, but output processing failed. See terminal for results.',
            command,
          });
        }
      }
    };

    const exitListener = (e: { exitCode: number; signal?: number }) => {
      if (hasResolved) return; // Prevent double resolution
      hasResolved = true;
      cleanup();

      if (e.exitCode !== 0) {
        resolve({
          success: false,
          error: `Command exited with code ${e.exitCode}`,
          command,
        });
      } else {
        // Make sure we return at least some output
        resolve({
          success: true,
          output: output.trim() || 'Command executed successfully.',
          command,
        });
      }
    };

    // Double safeguard: guarantee the promise will resolve after timeout
    const timeoutId = setTimeout(() => {
      if (hasResolved) return; // Prevent double resolution
      hasResolved = true;
      cleanup();

      // If we get here, command is still running but we've timed out waiting for a result
      // We don't mark the command as complete so it can still be tracked in the UI
      resolve({
        success: true, // Mark as success to prevent AI confusion
        output: `Command "${command}" is still running in the terminal. Check the command status indicator to monitor or terminate it.`,
        command,
      });
    }, timeout);

    // Function to clean up listeners
    const cleanup = () => {
      clearTimeout(timeoutId);
      // Properly dispose of the event handlers
      if (dataDisposable) dataDisposable.dispose();
      if (exitDisposable) exitDisposable.dispose();
    };

    // Attach listeners only once
    dataDisposable = dockerProc.onData(dataListener);
    exitDisposable = dockerProc.onExit(exitListener);

    // Send a special message that will be captured and echoed by the terminal
    // This is a more direct approach that works in the server context
    dockerProc.write(`${command}\n`);
  });
}
