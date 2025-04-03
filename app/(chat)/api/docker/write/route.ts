export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// app/api/docker/write/route.ts
import { type NextRequest, NextResponse } from 'next/server';

import { getDockerProcess } from '../process';

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const chatId = url.searchParams.get('chatId');
  const { chunk } = await req.json();

  if (!chatId) {
    return NextResponse.json(
      { error: 'No chat ID provided.' },
      { status: 400 },
    );
  }

  const dockerProc = getDockerProcess(chatId);
  if (!dockerProc) {
    return NextResponse.json(
      { error: 'No Docker process running for this chat.' },
      { status: 400 },
    );
  }

  dockerProc.write(chunk);
  return NextResponse.json({ ok: true });
}
