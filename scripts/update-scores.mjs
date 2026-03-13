import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Initialize Firebase Admin
// In GitHub Actions, we'll pass the service account via environment variable
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function updateScores() {
    const modes = ['subitizing', 'placerace', 'patterns', 'addition10', 'subtraction10', 'addition', 'subtraction', 'mixed'];
    const types = ['practice', 'challenge'];
    const allResults = {};

    console.log("Fetching scores from Firestore...");

    for (const mode of modes) {
        allResults[mode] = {};
        for (const type of types) {
            console.log(`Querying: ${mode} (${type})`);
            const snapshot = await db.collection('scores')
                .where('mode', '==', mode)
                .where('type', '==', type)
                .orderBy('score', 'desc')
                .limit(5)
                .get();

            const scores = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                // We don't need the Firestore timestamp object in the JSON
                const cleanData = { ...data };
                if (cleanData.timestamp) delete cleanData.timestamp;
                scores.push(cleanData);
            });

            allResults[mode][type] = scores;
        }
    }

    const outputPath = join(__dirname, '../js/scores.json');
    writeFileSync(outputPath, JSON.stringify(allResults, null, 2));
    console.log(`Scores successfully written to ${outputPath}`);
}

updateScores().catch(err => {
    console.error("Failed to update scores:", err);
    process.exit(1);
});
