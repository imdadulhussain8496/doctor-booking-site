// scripts/anonymize.js
const { MongoClient } = require('mongodb');

const PROD_URI = 'mongodb+srv://doctorapp:Doctor123@cluster0.qsupvif.mongodb.net/DoctorOnline';
const STAGING_URI = 'mongodb+srv://doctorapp:Doctor123@cluster0.qsupvif.mongodb.net/DoctorOnline_Staging';

async function anonymizeAndCopy() {
  const prodClient = new MongoClient(PROD_URI);
  const stagingClient = new MongoClient(STAGING_URI);
  
  try {
    await prodClient.connect();
    await stagingClient.connect();
    
    console.log('✅ Connected to both databases');
    
    const prodDB = prodClient.db('DoctorOnline');
    const stagingDB = stagingClient.db('DoctorOnline_Staging');
    
    // Collections to copy
    const collections = ['doctors', 'appointments', 'patients', 'availabilities'];
    
    for (const collName of collections) {
      const data = await prodDB.collection(collName).find({}).toArray();
      console.log(`📊 ${collName}: ${data.length} documents`);
      
      // Anonymize sensitive fields
      const anonymized = data.map(doc => {
        if (doc.email) doc.email = `staging_${doc._id}@test.com`;
        if (doc.phone) doc.phone = '9999999999';
        if (doc.password) doc.password = 'test123';
        if (doc.upiId) doc.upiId = 'test@upi';
        if (doc.patientEmail) doc.patientEmail = `patient_${doc._id}@test.com`;
        if (doc.patientPhone) doc.patientPhone = '9999999999';
        return doc;
      });
      
      if (anonymized.length > 0) {
        await stagingDB.collection(collName).deleteMany({});
        await stagingDB.collection(collName).insertMany(anonymized);
        console.log(`✅ ${collName} copied to staging`);
      } else {
        console.log(`⚠️ ${collName} has no data, skipping`);
      }
    }
    
    console.log('🎉 Staging data sync complete');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prodClient.close();
    await stagingClient.close();
  }
}

anonymizeAndCopy();