require('dotenv').config();
const mongoose = require('mongoose');

async function viewAllData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    console.log('🏠 Database:', process.env.MONGODB_URI);
    console.log('');

    // Get database instance
    const db = mongoose.connection.db;
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('📊 Available Collections:');
    console.log('========================');
    
    if (collections.length === 0) {
      console.log('❌ No collections found in database');
    } else {
      for (let i = 0; i < collections.length; i++) {
        const collection = collections[i];
        const count = await db.collection(collection.name).countDocuments();
        console.log(`${i + 1}. ${collection.name} (${count} documents)`);
      }
    }

    console.log('');
    
    // Show detailed data for each collection
    for (const collection of collections) {
      console.log(`🔍 Collection: ${collection.name}`);
      console.log(''.padEnd(50, '='));
      
      const documents = await db.collection(collection.name).find({}).toArray();
      
      if (documents.length === 0) {
        console.log('❌ No documents found');
      } else {
        documents.forEach((doc, index) => {
          console.log(`\n📄 Document ${index + 1}:`);
          
          // Remove password field for security
          if (doc.password) {
            doc.password = '***ENCRYPTED***';
          }
          
          // Format the document nicely
          Object.keys(doc).forEach(key => {
            let value = doc[key];
            
            // Format dates nicely
            if (value instanceof Date) {
              value = value.toISOString();
            }
            
            // Format objects nicely
            if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
              value = JSON.stringify(value, null, 2);
            }
            
            console.log(`   ${key}: ${value}`);
          });
        });
      }
      
      console.log('\n');
    }

    // Database statistics
    const stats = await db.stats();
    console.log('📈 Database Statistics:');
    console.log('======================');
    console.log(`Database Name: ${stats.db}`);
    console.log(`Collections: ${stats.collections}`);
    console.log(`Documents: ${stats.objects}`);
    console.log(`Data Size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Storage Size: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`);
    
    await mongoose.disconnect();
    console.log('\n✅ Database view complete');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

console.log('🔍 KMRL Train Induction System - Database Viewer');
console.log('================================================');
console.log('');

viewAllData();