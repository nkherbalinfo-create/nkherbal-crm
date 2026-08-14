// NK Herbal CRM — Full Database Backup
// Exports every MongoDB collection to JSON files
// Run: node scripts/backup.js

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.join(
  'C:/Users/HP/Downloads',
  'nkherbal-backup-' + new Date().toISOString().slice(0, 10)
);

async function run() {
  console.log('\n  NK Herbal CRM — Database Backup\n  ' + '─'.repeat(36));
  console.log('  Date    :', new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }));
  console.log('  Folder  :', BACKUP_DIR, '\n');

  // Connect
  await mongoose.connect(process.env.MONGO_URI);
  console.log('  ✓ Connected to MongoDB Atlas');

  // Create backup folder
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  // Get all collection names in the database
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  if (collections.length === 0) {
    console.log('  ✗ No collections found.');
    await mongoose.disconnect();
    return;
  }

  console.log(`  Found ${collections.length} collection(s):\n`);

  let grandTotal = 0;

  for (const col of collections) {
    const name = col.name;
    const docs = await db.collection(name).find({}).toArray();
    const filePath = path.join(BACKUP_DIR, name + '.json');
    fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf8');
    grandTotal += docs.length;
    console.log(`  ✓  ${name.padEnd(20)} ${String(docs.length).padStart(4)} records  →  ${name}.json`);
  }

  // Write a backup summary file
  const summary = {
    business: 'NK Herbal',
    backupDate: new Date().toISOString(),
    mongoUri: process.env.MONGO_URI?.replace(/:([^@]+)@/, ':***@'), // hide password
    collections: collections.map(c => c.name),
    totalRecords: grandTotal,
    note: 'Full export of all MongoDB collections. Import with mongoimport or manually.',
  };
  fs.writeFileSync(path.join(BACKUP_DIR, '_backup-info.json'), JSON.stringify(summary, null, 2));

  console.log('\n  ' + '─'.repeat(36));
  console.log(`  Total records backed up: ${grandTotal}`);
  console.log('\n  Backup complete. Folder:');
  console.log('  ' + BACKUP_DIR + '\n');

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('\n  ✗ Backup failed:', err.message);
  process.exit(1);
});
