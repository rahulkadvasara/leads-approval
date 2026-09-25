import { NextResponse } from 'next/server';
import { generateSessionToken } from '@/lib/token';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, email, password } = body;

    if (!username || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Username, email, and password are all required.' },
        { status: 400 }
      );
    }

    const envUsername = (process.env.AUTH_USERNAME || '').trim();
    const envEmail = (process.env.AUTH_EMAIL || '').trim();
    const rawEnvPassword = process.env.AUTH_PASSWORD || '';
    // Strip surrounding quotes if present in .env.local
    const envPassword = rawEnvPassword.trim().replace(/^["']|["']$/g, '');

    const inputUser = String(username).trim();
    const inputEmail = String(email).trim().toLowerCase();
    const inputPassword = String(password);

    // Verify credentials strictly against .env.local
    const isUserValid = inputUser === envUsername;
    const isEmailValid = inputEmail === envEmail.toLowerCase();
    const isPasswordValid = inputPassword === envPassword || inputPassword === rawEnvPassword.trim();

    if (!isUserValid || !isEmailValid || !isPasswordValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid credentials. Please verify your username, email, and password.',
        },
        { status: 401 }
      );
    }

    const token = generateSessionToken(inputUser, inputEmail);

    return NextResponse.json({
      success: true,
      message: 'Authentication successful',
      user: {
        username: inputUser,
        email: inputEmail,
        token,
      },
    });
  } catch (error) {
    console.error('Error during authentication verification:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error during authentication.' },
      { status: 500 }
    );
  }
}
