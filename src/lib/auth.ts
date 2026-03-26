import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { randomBytes, createHash } from "crypto";

export interface User {
  id: string;
  email: string;
  name: string | null;
  password?: string;
  role: "ADMIN" | "USER";
  storageLimit: number;
  storageUsed: number;
  isActive: boolean;
}

// Hash password with SHA256
export function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

// Generate session token
export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

// Validate login credentials - returns user without password or null
export async function validateLogin(email: string, password: string): Promise<User | null> {
  try {
    const hashedPassword = hashPassword(password);

    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user || user.password !== hashedPassword) {
      return null;
    }

    if (!user.isActive) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as "ADMIN" | "USER",
      storageLimit: user.storageLimit,
      storageUsed: user.storageUsed,
      isActive: user.isActive,
    };
  } catch (error) {
    console.error("Validate login error:", error);
    return null;
  }
}

// Create session and return session token
export async function createSession(userId: string): Promise<string> {
  const sessionToken = generateSessionToken();
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await db.session.create({
    data: {
      sessionToken,
      userId,
      expires,
    },
  });

  return sessionToken;
}

// Get current user from session
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;

    if (!sessionToken) return null;

    const session = await db.session.findUnique({
      where: { sessionToken },
      include: { user: true },
    });

    if (!session || session.expires < new Date()) {
      // Clean up expired session
      if (session) {
        await db.session.delete({ where: { id: session.id } });
      }
      return null;
    }

    if (!session.user.isActive) {
      return null;
    }

    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role as "ADMIN" | "USER",
      storageLimit: session.user.storageLimit,
      storageUsed: session.user.storageUsed,
      isActive: session.user.isActive,
    };
  } catch (error) {
    console.error("Get current user error:", error);
    return null;
  }
}

// Logout - delete session
export async function logout(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;

    if (sessionToken) {
      await db.session.deleteMany({ where: { sessionToken } });
    }
  } catch (error) {
    console.error("Logout error:", error);
  }
}

// Check storage limit
export async function canUploadDocument(userId: string, fileSizeMB: number): Promise<boolean> {
  try {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return false;
    
    return user.storageUsed + fileSizeMB <= user.storageLimit;
  } catch {
    return false;
  }
}

// Update storage used
export async function updateStorageUsed(userId: string, deltaMB: number): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: {
      storageUsed: { increment: deltaMB },
    },
  });
}
