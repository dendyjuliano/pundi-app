import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

const projectRoot = path.resolve(import.meta.dirname, "..");
const envContent = fs.readFileSync(
  path.join(projectRoot, ".env.local"),
  "utf8"
);
for (const line of envContent.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}

const [, , name, email, password, role] = process.argv;

if (!name || !email || !password) {
  console.error(
    "Usage: tsx scripts/create-user.mts <name> <email> <password> [admin|member]"
  );
  process.exit(1);
}

const { connectToDatabase } = await import(
  path.join(projectRoot, "lib/mongodb.ts")
);
const User = (await import(path.join(projectRoot, "models/User.ts")))
  .default;

await connectToDatabase();

const existing = await User.findOne({ email: email.toLowerCase() });
if (existing) {
  console.error(`User with email ${email} already exists`);
  process.exit(1);
}

const passwordHash = await bcrypt.hash(password, 10);
const user = await User.create({
  name,
  email: email.toLowerCase(),
  passwordHash,
  role: role === "admin" ? "admin" : "member",
});

console.log(`Created user: ${user.email} (${user.role})`);
process.exit(0);
