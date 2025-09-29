const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3001';

// Metro trainset naming convention:
// KM01, KM02, etc. (more compact metro-style)
// or KMRL-MC-001 (Metro Car 001)
const METRO_NAMING = 'MC'; // Metro Car prefix

const updateTrainsetNaming = async () => {
  try {
    console.log('🚇 Updating KMRL Metro Trainset Naming Convention...\n');
    
    // Get current trainsets
    const response = await axios.get(`${BASE_URL}/api/trainsets`);
    const trainsets = response.data.data;
    
    console.log(`Found ${trainsets.length} trainsets to update`);
    
    for (let i = 0; i < trainsets.length; i++) {
      const trainset = trainsets[i];
      const oldNumber = trainset.trainsetNumber;
      
      // Generate new metro-style number
      const newNumber = `KMRL-${METRO_NAMING}-${(i + 1).toString().padStart(3, '0')}`;
      
      try {
        // Update the trainset
        await axios.put(`${BASE_URL}/api/trainsets/${trainset.id}`, {
          trainsetNumber: newNumber,
          manufacturer: trainset.manufacturer === 'Alstom' ? 'Alstom Transport' : 'BEML Limited',
          model: trainset.model === 'Metropolis' ? 'Metropolis Metro Car' : 'Standard Metro Coach',
          depot: 'Muttom Metro Depot',
          location: trainset.location ? `Metro ${trainset.location}` : 'Metro Platform',
        });
        
        console.log(`✅ ${oldNumber} → ${newNumber}`);
      } catch (error) {
        console.log(`❌ Failed to update ${oldNumber}: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Metro naming convention update complete!');
    console.log('\n📋 New Naming Convention:');
    console.log('   KMRL-MC-001 = Kochi Metro Rail - Metro Car 001');
    console.log('   KMRL-MC-002 = Kochi Metro Rail - Metro Car 002');
    console.log('   ... and so on');
    
  } catch (error) {
    console.error('❌ Error updating trainset naming:', error.message);
  }
};

updateTrainsetNaming();