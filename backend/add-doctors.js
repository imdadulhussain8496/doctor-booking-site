require('dotenv').config();
const { MongoClient } = require('mongodb');
const fs = require('fs');

const doctorsData = JSON.parse(fs.readFileSync('../doctors.json'));
let doctors = doctorsData.doctors || doctorsData;
if (!Array.isArray(doctors)) doctors = [];

const client = new MongoClient(process.env.MONGODB_URI);

client.connect()
  .then(async () => {
    const db = client.db();
    await db.collection('doctors').deleteMany({});
    if (doctors.length) await db.collection('doctors').insertMany(doctors);
    console.log('✅', doctors.length, 'real doctors added');
    process.exit();
  })
  .catch(err => console.error(err));
