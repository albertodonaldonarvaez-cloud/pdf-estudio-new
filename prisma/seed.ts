import { db } from "@/lib/db";
import { createHash } from "crypto";

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

async function main() {
  console.log("🌱 Iniciando seed...");

  try {
    // Try to clean existing data (ignore errors if tables don't exist)
    try {
      await db.$executeRaw`DELETE FROM sessions`;
      await db.$executeRaw`DELETE FROM documents`;
      await db.$executeRaw`DELETE FROM users`;
    } catch {
      console.log("📋 Tablas vacías o inexistentes, continuando...");
    }

    // Create admin user
    const adminId = `user_admin_${Date.now()}`;
    const adminPassword = hashPassword("admin123");
    const now = new Date();

    await db.$executeRaw`
      INSERT INTO users (id, email, name, password, role, storageLimit, storageUsed, isActive, createdAt, updatedAt)
      VALUES (${adminId}, ${"admin@pdfstudio.com"}, ${"Administrador"}, ${adminPassword}, ${"ADMIN"}, ${1000}, ${0}, ${1}, ${now}, ${now})
    `;

    console.log("✅ Usuario administrador creado:");
    console.log("   Email: admin@pdfstudio.com");
    console.log("   Password: admin123");

    // Create demo user
    const demoId = `user_demo_${Date.now()}`;
    const demoPassword = hashPassword("demo123");

    await db.$executeRaw`
      INSERT INTO users (id, email, name, password, role, storageLimit, storageUsed, isActive, createdAt, updatedAt)
      VALUES (${demoId}, ${"demo@pdfstudio.com"}, ${"Usuario Demo"}, ${demoPassword}, ${"USER"}, ${50}, ${0}, ${1}, ${now}, ${now})
    `;

    console.log("✅ Usuario demo creado:");
    console.log("   Email: demo@pdfstudio.com");
    console.log("   Password: demo123");

    console.log("✅ Seed completado exitosamente");
  } catch (error) {
    console.error("❌ Seed error:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
