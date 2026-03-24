import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createHash, randomBytes } from "crypto";

// Helper to hash password
function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

// Helper to generate session token
function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    console.log("Login attempt:", { email });

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña son requeridos" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = hashPassword(password);

    // Find user using raw query to avoid model mapping issues
    const users = await db.$queryRaw<any[]>`
      SELECT * FROM users WHERE email = ${email} LIMIT 1
    `;

    const user = users[0];

    console.log("User found:", user ? { id: user.id, email: user.email, role: user.role } : null);

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 401 }
      );
    }

    // Verify password
    if (user.password !== hashedPassword) {
      console.log("Password mismatch");
      return NextResponse.json(
        { error: "Contraseña incorrecta" },
        { status: 401 }
      );
    }

    // Check if active
    if (!user.isActive) {
      return NextResponse.json(
        { error: "Usuario inactivo" },
        { status: 403 }
      );
    }

    // Create session using raw query
    const sessionToken = generateToken();
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.$executeRaw`
      INSERT INTO sessions (id, sessionToken, userId, expires, createdAt)
      VALUES (${sessionId}, ${sessionToken}, ${user.id}, ${expires}, ${new Date()})
    `;

    console.log("Session created:", sessionToken);

    const response = NextResponse.json({ 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        storageLimit: user.storageLimit,
        storageUsed: user.storageUsed,
      }
    });

    response.cookies.set("session", sessionToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor", details: String(error) },
      { status: 500 }
    );
  }
}
