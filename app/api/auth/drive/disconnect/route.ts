// Removes the Drive grant. Server-side, because the grant is.

import { NextResponse } from 'next/server';
import { currentUserId, forgetDriveGrant } from '@/lib/drive-token';

export async function POST() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  await forgetDriveGrant(userId);
  return NextResponse.json({ success: true });
}
