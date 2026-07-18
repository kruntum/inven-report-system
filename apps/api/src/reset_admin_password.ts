import { db } from "./db/connection.ts";
import { users } from "./db/schema.ts";
import { eq } from "drizzle-orm";

async function run() {
  try {
    const passwordHash = await Bun.password.hash("Qp6&vKd8#mXs2wR1", {
      algorithm: "bcrypt",
      cost: 10,
    });
    
    await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.username, "admin"));
      
    console.log("Admin password reset to default: Qp6&vKd8#mXs2wR1");
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
run();
