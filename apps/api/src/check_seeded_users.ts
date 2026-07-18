import { db } from "./db/connection.ts";
import { users } from "./db/schema.ts";

async function run() {
  try {
    const data = await db.select().from(users);
    console.log("Users in database:", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
run();
