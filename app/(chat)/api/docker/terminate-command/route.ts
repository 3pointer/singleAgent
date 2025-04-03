import { NextRequest, NextResponse } from 'next/server';
import { terminateCommand } from '../process';
import { broadcastCommandStatus } from '../command-status/utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');

  if (!chatId) {
    return NextResponse.json(
      { error: 'Missing chat ID' },
      { status: 400 }
    );
  }

  const success = terminateCommand(chatId);
  
  if (success) {
    // Manually broadcast command end event to ensure UI updates
    broadcastCommandStatus(chatId, { type: 'command-end' });
    
    return NextResponse.json({ success: true });
  } else {
    return NextResponse.json(
      { error: 'No active command to terminate' },
      { status: 404 }
    );
  }
}