import bcrypt from "bcryptjs";
import { db } from "./db.js";

export function seedAdmin() {
  const exists = db.prepare("SELECT id FROM admins WHERE username=?").get("admin");
  if (exists) return;
  const hash = bcrypt.hashSync("Admin@12345", 10);
  db.prepare("INSERT INTO admins(username,password_hash,created_at) VALUES(?,?,?)")
    .run("admin", hash, new Date().toISOString());
}
