import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

// Get all users (admin only)
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        storageLimit: true,
        storageUsed: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: { documents: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// Create new user (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { email, password, name, storageLimit, role } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email y contraseña son requeridos" }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "El email ya está registrado" }, { status: 400 });
    }

    const hashedPassword = hashPassword(password);

    const newUser = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
        storageLimit: storageLimit || 50,
        role: role || "USER",
      },
    });

    return NextResponse.json({ 
      success: true, 
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        storageLimit: newUser.storageLimit,
      }
    });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
