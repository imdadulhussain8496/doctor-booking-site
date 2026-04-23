// Migration script
require('dotenv').config();
const mongoose = require('mongoose');

async function migrateLocalToAtlas() {
  console.log('\n🔄 Starting migration: LOCAL → ATLAS\n');

  // Connect to Local DB
  console.log('📡 Connecting to LOCAL database...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to LOCAL\n');

  // Get all collections
  const collections = await mongoose.connection.db.collections();
  const backup = {};

  console.log('📦 Backing up data...');
  for (const collection of collections) {
    const data = await collection.find({}).toArray();
    backup[collection.collectionName] = data;
    console.log(`   ✅ ${collection.collectionName}: ${data.length} records`);
  }

  await mongoose.disconnect();
  console.log('\n🔌 Disconnected from LOCAL\n');

  // Connect to Atlas
  console.log('☁️ Connecting to ATLAS...');
  await mongoose.connect(process.env.MONGODB_ATLAS_URI);
  console.log('✅ Connected to ATLAS\n');

  // Upload to Atlas
  console.log('📤 Uploading data to ATLAS...');
  for (const [name, data] of Object.entries(backup)) {
    if (data.length > 0) {
      await mongoose.connection.collection(name).deleteMany({});
      await mongoose.connection.collection(name).insertMany(data);
      console.log(`   ✅ ${name}: ${data.length} records migrated`);
    }
  }

  console.log('\n🎉 MIGRATION COMPLETE!');
  process.exit(0);
}

migrateLocalToAtlas().catch(error => {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
});