/**
 * Reset database script.
 * Drops all collections so the seeder re-creates everything on next API start.
 *
 * Usage: npx ts-node -r tsconfig-paths/register scripts/reset-db.ts
 */
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ethos-stock';

async function main() {
  console.log(`Connecting to ${MONGODB_URI}…`);
  await mongoose.connect(MONGODB_URI);

  const db = mongoose.connection.db;
  if (!db) {
    console.error('No database connection');
    process.exit(1);
  }

  const collections = await db.listCollections().toArray();
  console.log(`Found ${collections.length} collections. Dropping all…`);

  for (const col of collections) {
    await db.dropCollection(col.name);
    console.log(`  Dropped: ${col.name}`);
  }

  console.log('Done. Start the API to re-seed.');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
