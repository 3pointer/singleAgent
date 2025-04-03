'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

// Custom hook for SSE with auto-reconnect
function useSSE(
  url: string,
  onMessage: (e: MessageEvent) => void,
  reconnectDelay = 3000
) {
  useEffect(() => {
    let shouldReconnect = true;
    let retryTimeout: ReturnType<typeof setTimeout>;

    const connect = (): EventSource => {
      const es = new EventSource(url);
      es.onmessage = onMessage;
      es.onerror = (err) => {
        console.error('SSE error:', err);
        es.close();
        if (shouldReconnect) {
          retryTimeout = setTimeout(() => {
            connect();
          }, reconnectDelay);
        }
      };
      return es;
    };

    const es = connect();

    return () => {
      shouldReconnect = false;
      if (retryTimeout) clearTimeout(retryTimeout);
      es.close();
    };
  }, [url, onMessage, reconnectDelay]);
}

// Add this near the top of the file, after imports
const LoadingOverlay = () => (
  <div
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#1e1f29',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1rem',
      borderRadius: '6px',
      zIndex: 10,
    }}
  >
    <div
      style={{
        width: '32px',
        height: '32px',
        border: '3px solid #2b2d3a',
        borderTop: '3px solid #bd93f9',
        borderRadius: '50%',
        animation: 'terminalSpin 1s linear infinite',
      }}
    />
    <div
      style={{
        color: '#bd93f9',
        fontSize: '1.125rem',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontWeight: 500,
      }}
    >
      Initializing terminal...
    </div>
    <style jsx global>{`
      @keyframes terminalSpin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

export default function DockerTerminal({ chatId }: { chatId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const inputBufferRef = useRef<string>("");
  const welcomeShownRef = useRef(false);
  const initializationPhaseRef = useRef(true);
  const [isTerminalMounted, setIsTerminalMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [term, setTerm] = useState<Terminal | null>(null);
  
  // Function to display colorful welcome banner
  const displayWelcomeBanner = useCallback((terminal: Terminal) => {
    terminal.write('\x1b[2J\x1b[H'); // Clear screen and move cursor to top
    
    // Display ASCII art banner with color
    terminal.write('\x1b[38;5;39m');  // Bright blue
    terminal.writeln('╔══════════════════════════════════════════════════════╗');
    terminal.writeln('║                                                      ║');
    terminal.writeln('║  \x1b[38;5;207m╔═╗╦ ╦╔═╗╔╦╗  ╔═╗╦═╗╔═╗╦ ╦╔╗╔╔╦╗\x1b[38;5;39m                    ║');
    terminal.writeln('║  \x1b[38;5;207m║  ╠═╣╠═╣ ║   ║ ╦╠╦╝║ ║║ ║║║║ ║║\x1b[38;5;39m                    ║');
    terminal.writeln('║  \x1b[38;5;207m╚═╝╩ ╩╩ ╩ ╩   ╚═╝╩╚═╚═╝╚═╝╝╚╝═╩╝\x1b[38;5;39m                    ║');
    terminal.writeln('║                                                      ║');
    terminal.writeln('║  \x1b[38;5;119mInteractive Docker Terminal Environment\x1b[38;5;39m             ║');
    terminal.writeln('║                                                      ║');
    terminal.writeln('╚══════════════════════════════════════════════════════╝');
    terminal.write('\x1b[0m'); // Reset color

    // Display helpful information
    terminal.writeln('');
    terminal.writeln('\x1b[1;33mWelcome to the Interactive Docker Terminal!\x1b[0m');
    terminal.writeln('\x1b[38;5;141mYou are now connected to a Docker container shell.\x1b[0m');
    terminal.writeln('\x1b[38;5;249m----------------------------------------------\x1b[0m');
    terminal.writeln('\x1b[38;5;249mType commands and press Enter to execute them.\x1b[0m');
    terminal.writeln('');
    
    // Simulate Enter key press
    fetch(`/api/docker/write?chatId=${chatId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chunk: '\n' }),
    }).catch(console.error);
  }, [chatId]);

  // Set up a timer to end initialization phase after 1 second
  useEffect(() => {
    if (!isTerminalMounted) return;
    
    // After 1 second, end the initialization phase
    const timer = setTimeout(() => {
      if (term && !welcomeShownRef.current) {
        // If welcome message hasn't been shown yet, show it now
        displayWelcomeBanner(term);
        welcomeShownRef.current = true;
      }
      
      // End initialization phase
      initializationPhaseRef.current = false;
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [displayWelcomeBanner, isTerminalMounted, term]);

  const handleSSEMessage = useCallback((e: MessageEvent) => {
    if (!term) return;
    
    // Get the actual data (remove "data: " prefix from SSE format)
    let output = e.data;

    // Process escaped newlines and carriage returns
    if (output.includes('\\n') || output.includes('\\r')) {
      // Replace escaped newlines and carriage returns with actual characters
      output = output.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
    }

    // During initialization phase, ignore all output
    if (initializationPhaseRef.current) {
      // Just check for shell prompt to detect when shell is ready
      if (output.includes('/ #')) {
        // We found a prompt, but don't do anything yet
        // The timer will show the welcome banner
      }
      return;
    }

    // After initialization phase, show the welcome banner if not shown yet
    if (!welcomeShownRef.current && term) {
      displayWelcomeBanner(term);
      welcomeShownRef.current = true;
    }

    // Write to terminal after initialization is complete
    term?.write(output);
  }, [displayWelcomeBanner, term]);

  // Call the SSE hook at the top level with chatId.
  useSSE(`/api/docker/attach?chatId=${chatId}`, handleSSEMessage);

  // Safe fit function that includes error handling and dimension checks
  const fitTerminal = useCallback(() => {
    if (!fitAddonRef.current || !containerRef.current || !term) return;
    
    try {
      fitAddonRef.current.fit();
    } catch (e) {
      console.error('Error fitting terminal:', e);
    }
  }, [term]);

  useEffect(() => {
    const terminal = new Terminal({
      cursorBlink: true,
      rows: 24,  // Set default dimensions
      cols: 80,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 14,
      theme: {
        background: '#2b2d3a',
        foreground: '#f8f8f2',
        cursor: '#f8f8f2',
        black: '#000000',
        red: '#ff5555',
        green: '#50fa7b',
        yellow: '#f1fa8c',
        blue: '#bd93f9',
        magenta: '#ff79c6',
        cyan: '#8be9fd',
        white: '#bbbbbb',
        brightBlack: '#555555',
        brightRed: '#ff5555',
        brightGreen: '#50fa7b',
        brightYellow: '#f1fa8c',
        brightBlue: '#bd93f9',
        brightMagenta: '#ff79c6',
        brightCyan: '#8be9fd',
        brightWhite: '#ffffff'
      },
      scrollback: 5000,
      convertEol: true  // Convert '\n' to '\r\n' for better cross-platform compatibility
    });
    setTerm(terminal);
    return () => {
      if (terminal) {
        terminal.dispose();
      }
    };
  }, []);

  // When chatId changes, reinitialize terminal
  useEffect(() => {
    if (term) {
      // Reset state when chatId changes
      welcomeShownRef.current = false;
      initializationPhaseRef.current = true;
      setIsLoading(true);
      inputBufferRef.current = "";
    
    
      const fitAddon = new FitAddon();
      if (containerRef.current) {
      try {
        term.open(containerRef.current);
        setTerm(term);
        fitAddonRef.current = fitAddon;
        
        // Load addon AFTER terminal is opened
        term.loadAddon(fitAddon);
        setIsTerminalMounted(true);
      } catch (e) {
        console.error('Error initializing terminal:', e);
      }
    }

    // IMPORTANT: The Docker shell should disable echo.
    // In your Docker process spawning code (outside this file), send:
    // proc.write('stty -echo\r\n');
    // so that echoed input does not come from Docker.

    // Local echo: capture input and display it on screen.
    const disposable = term.onData((data) => {
      if (data === '\r') {  // Enter key
        term.write('\r\n');
        fetch(`/api/docker/write?chatId=${chatId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            chunk: `${inputBufferRef.current}\n`
          }),
        }).catch((err) => {
          console.error('Error sending data:', err);
          term.write('\r\n\x1b[31mCommand failed to send to Docker container\x1b[0m\r\n');
        });
        inputBufferRef.current = "";
      } else if (data === '\x7f') {  // Backspace key
        if (inputBufferRef.current.length > 0) {
          inputBufferRef.current = inputBufferRef.current.slice(0, -1);
          term.write('\b \b');  // Move back, clear character, move back again
        }
      } else {
        term.write(data);
        inputBufferRef.current += data;
      }
    });

    // Handle resize events with improved error handling and debouncing
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        fitTerminal();
      }, 100); // Debounce resize events
    };

    // Initial fit when the component mounts
    window.addEventListener('resize', handleResize);
    
    // Also refit when visibility changes
    document.addEventListener('visibilitychange', fitTerminal);
    
    // Try to fit the terminal on a schedule for the first few seconds
    // This helps with dimension issues when the terminal container is initially hidden
    const fitIntervals = [100, 500, 1000, 2000];
    const scheduledFits = fitIntervals.map(delay => 
      setTimeout(fitTerminal, delay)
    );
    
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', fitTerminal);
      
      // Clear any pending fit timeouts
      scheduledFits.forEach(timeout => clearTimeout(timeout));
      clearTimeout(resizeTimeout);
      
      // Clean up the terminal
      try {
        disposable.dispose();
      } catch (e) {
        console.error('Error disposing terminal:', e);
      }
    };
    }
  }, [term, chatId, fitTerminal]);

  // Observe container size changes and refit terminal when needed
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      // Debounce the fit operation
      setTimeout(() => {
        if (term?.element?.offsetParent) {
          fitTerminal();
        }
      }, 100);
    });

    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, [fitTerminal, term]);

  useEffect(() => {
    // Instead, use the timer to control the loading state
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [chatId]);

  // Add state to track active commands
  const [commandStatus, setCommandStatus] = useState<{
    running: boolean;
    command?: string;
    startTime?: number;
  }>({ running: false });

  // Subscribe to command status updates
  useEffect(() => {
    const eventSource = new EventSource(`/api/docker/command-status?chatId=${chatId}`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'command-start') {
          setCommandStatus({
            running: true,
            command: data.command,
            startTime: Date.now()
          });
        } else if (data.type === 'command-end') {
          setCommandStatus({ running: false });
          setRunTime(0); // Reset runtime counter when command ends
        }
      } catch (err) {
        console.error('Error parsing command status:', err);
      }
    };
    
    eventSource.onerror = (err) => {
      console.error('SSE command status error:', err);
      // Attempt to reconnect after a delay
      setTimeout(() => {
        eventSource.close();
      }, 3000);
    };
    
    return () => {
      eventSource.close();
    };
  }, [chatId]);

  // Calculate runtime for active command
  const [runTime, setRunTime] = useState<number>(0);
  useEffect(() => {
    if (!commandStatus.running || !commandStatus.startTime) return;
    
    const interval = setInterval(() => {
      setRunTime(Math.floor((Date.now() - commandStatus.startTime!) / 1000));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [commandStatus.running, commandStatus.startTime]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#1e1f29',
        borderRadius: '6px',
        padding: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        boxSizing: 'border-box',
        overflow: 'hidden',
        minHeight: '300px',
        position: 'relative', // Add this for absolute positioning of loading overlay
      }}
    >
      {isLoading && <LoadingOverlay />}
      
      {/* Command Status Indicator */}
      {commandStatus.running && (
        <div 
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: '#fff',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            zIndex: 10,
          }}
        >
          <div 
            style={{
              width: '8px',
              height: '8px',
              backgroundColor: '#f97316',
              borderRadius: '50%',
              marginRight: '6px',
              animation: 'pulse 1.5s infinite'
            }}
          />
          <span>
            {commandStatus.command ? 
              (commandStatus.command.length > 15 ? 
                `${commandStatus.command.substring(0, 15)}...` : 
                commandStatus.command) : 
              'Command'} 
            {runTime > 0 && `: ${runTime}s`}
          </span>
          
          {/* Add button to terminate long-running commands */}
          <button
            onClick={() => {
              fetch(`/api/docker/terminate-command?chatId=${chatId}`, {
                method: 'POST',
              });
            }}
            style={{
              marginLeft: '8px',
              backgroundColor: '#ef4444',
              border: 'none',
              color: 'white',
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              fontSize: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Terminate command"
          >
            ✕
          </button>
        </div>
      )}
      
      {/* Add keyframe animation for the pulse effect */}
      <style jsx global>{`
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}