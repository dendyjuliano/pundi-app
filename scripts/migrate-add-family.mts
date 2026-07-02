import fs from "fs";
import path from "path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const envContent = fs.readFileSync(
  path.join(projectRoot, ".env.local"),
  "utf8"
);
for (const line of envContent.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}

const { connectToDatabase } = await import(
  path.join(projectRoot, "lib/mongodb.ts")
);
const UserModel = (await import(path.join(projectRoot, "models/User.ts")))
  .default;
const FamilyModel = (await import(path.join(projectRoot, "models/Family.ts")))
  .default;

await connectToDatabase();

const usersWithoutFamily = await UserModel.find({
  familyId: { $exists: false },
});

if (usersWithoutFamily.length === 0) {
  console.log("Semua user sudah punya familyId, tidak ada yang perlu dimigrasi.");
  process.exit(0);
}

console.log(
  `Ditemukan ${usersWithoutFamily.length} user tanpa familyId:`,
  usersWithoutFamily.map((u: { email: string }) => u.email)
);

const family = await FamilyModel.create({ name: "Grup (migrasi awal)" });
console.log(`Family baru dibuat: ${family._id}`);

const result = await UserModel.updateMany(
  { familyId: { $exists: false } },
  { $set: { familyId: family._id } }
);
console.log(`${result.modifiedCount} user diupdate dengan familyId ${family._id}`);

process.exit(0);
