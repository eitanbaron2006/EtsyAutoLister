import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const config = require('./firebase-applet-config.json');

const app = getApps().length > 0 ? getApp() : initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function checkData() {
  const usersSnap = await getDocs(collection(db, 'users'));
  console.log('=== USERS COLLECTION ===');
  console.log('Total users:', usersSnap.size);
  
  for (const userDoc of usersSnap.docs) {
    console.log('\n--- User:', userDoc.id, '---');
    const data = userDoc.data();
    console.log('Data:', JSON.stringify(data, null, 2));
    
    const listingsSnap = await getDocs(collection(db, 'users', userDoc.id, 'listings'));
    console.log('Listings count:', listingsSnap.size);
    
    if (listingsSnap.size > 0) {
      for (const listingDoc of listingsSnap.docs) {
        console.log('  Listing ID:', listingDoc.id);
        console.log('  Data:', JSON.stringify(listingDoc.data(), null, 2));
      }
    } else {
      console.log('  No listings subcollection found for this user.');
    }
  }
  
  if (usersSnap.size === 0) {
    console.log('No users found in database.');
    console.log('The listings subcollection only appears AFTER a user creates a listing through the app.');
  }
  
  process.exit(0);
}

checkData().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});

