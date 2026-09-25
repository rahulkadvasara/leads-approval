import { NextResponse } from 'next/server';
import { validateSession } from '@/lib/token';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, email, token } = body;

    if (!username || !email || !token) {
      return NextResponse.json(
        { valid: false, error: 'Missing session parameters' },
        { status: 401 }
      );
    }

    const isValid = validateSession(String(username), String(email), String(token));

    if (!isValid) {
      return NextResponse.json(
        { valid: false, error: 'Invalid or expired session token' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      valid: true,
      user: {
        username: String(username).trim(),
        email: String(email).trim().toLowerCase(),
      },
    });
  } catch (error) {
    console.error('Session verify error:', error);
    return NextResponse.json(
      { valid: false, error: 'Internal server error during verification' },
      { status: 500 }
    );
  }
}
