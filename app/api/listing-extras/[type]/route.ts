import { NextRequest, NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import path from 'path';

// Static info/marketing images attached to every product of a given type.
// Drop PNG/JPG/WEBP files into public/listing-extras/<type>/ — they are
// listed here and appended to the listing photo package by the client.

const ALLOWED_TYPES = ['png_graphics', 'printable_wallart', 'presets', 'planners'];
const IMAGE_EXTENSION = /\.(png|jpe?g|webp)$/i;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;
  if (!ALLOWED_TYPES.includes(type)) {
    return NextResponse.json({ files: [] });
  }
  try {
    const dir = path.join(process.cwd(), 'public', 'listing-extras', type);
    const entries = await readdir(dir);
    const files = entries
      .filter(name => IMAGE_EXTENSION.test(name))
      .sort()
      .map(name => `/listing-extras/${type}/${name}`);
    return NextResponse.json({ files });
  } catch {
    // Folder missing or unreadable — no extras for this type
    return NextResponse.json({ files: [] });
  }
}
