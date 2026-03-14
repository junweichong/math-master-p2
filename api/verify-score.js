const admin = require("firebase-admin");

if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
    }

    try {
        const { name, playerClass, mode, gameType, gameLog } = req.body;

        if (!name || !gameLog || !Array.isArray(gameLog)) {
            return res.status(400).send("Invalid request data");
        }

        let verifiedScore = 0;
        let lastTimestamp = 0;
        const MIN_TIME_BETWEEN_ANSWERS = 300; // ms

        for (let i = 0; i < gameLog.length; i++) {
            const entry = gameLog[i];
            
            if (lastTimestamp > 0) {
                const timeDiff = entry.timestamp - lastTimestamp;
                if (timeDiff < MIN_TIME_BETWEEN_ANSWERS) {
                    console.warn(`[Suspicious] Too fast: ${timeDiff}ms between answers`);
                }
            }
            lastTimestamp = entry.timestamp;

            let isMathCorrect = false;
            // Mode-specific math verification
            if (entry.operator === '+') {
                isMathCorrect = (entry.num1 + entry.num2 === entry.answer);
            } else if (entry.operator === '-') {
                isMathCorrect = (entry.num1 - entry.num2 === entry.answer);
            } else if (entry.mode === 'subitizing') {
                isMathCorrect = (entry.num1 === entry.answer);
            } else {
                // For complex modes, check against the logged correct answer
                isMathCorrect = (entry.answer === entry.correctAnswer);
            }

            if (isMathCorrect && entry.correct) {
                verifiedScore++;
            }
        }

        const today = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
        const scoreEntry = {
            name,
            class: playerClass,
            score: verifiedScore,
            mode,
            type: gameType,
            date: today,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        };

        // Save to main scores collection
        await db.collection("scores").add(scoreEntry);

        // Update Leaderboard
        const leaderboardId = `${mode}_${gameType}`;
        const leaderboardRef = db.collection("leaderboards").doc(leaderboardId);
        
        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(leaderboardRef);
            let topScores = [];
            if (doc.exists) {
                topScores = doc.data().topScores || [];
            }

            topScores.push({ name, score: verifiedScore });
            topScores.sort((a, b) => b.score - a.score);
            topScores = topScores.slice(0, 5);

            transaction.set(leaderboardRef, { topScores });
        });

        return res.status(200).json({ success: true, verifiedScore });

    } catch (error) {
        console.error("Verification error:", error);
        return res.status(500).json({ error: error.message });
    }
};
