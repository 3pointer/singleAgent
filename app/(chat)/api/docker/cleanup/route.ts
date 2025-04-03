export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from 'next/server';
import { cleanupDockerProcess } from '../process';

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const chatId = url.searchParams.get('chatId');

  if (!chatId) {
    return NextResponse.json({ error: 'No chat ID provided' }, { status: 400 });
  }

  try {
    cleanupDockerProcess(chatId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error cleaning up Docker process:', error);
    return NextResponse.json(
      { error: 'Failed to clean up Docker process' },
      { status: 500 },
    );
  }
}
