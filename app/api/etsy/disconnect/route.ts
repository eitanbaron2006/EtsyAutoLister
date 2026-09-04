import { NextResponse } from 'next/server';

import { currentUserId, forgetEtsyToken } from '@/lib/etsy-token';

/** Forget the stored Etsy token. The profile flag is cleared by the page. */
export async function POST() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  await forgetEtsyToken(userId);
  return NextResponse.json({ success: true });
}
