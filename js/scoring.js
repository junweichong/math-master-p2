import { db, collection, serverTimestamp, addDoc, getDoc, setDoc, doc } from "./firebase.js";
import { state } from "./state.js";
import { dom } from "./dom.js";
import { CONFIG } from "./config.js";

const CACHE_KEY_PREFIX = "math_master_scores_";
const CACHE_EXPIRY = 60 * 60 * 1000; // 1 hour
const pendingFetches = new Map(); // Prevent duplicate concurrent requests
export async function loadAggregatedScores() {
    const leaderboardId = `${state.scoreDisplayMode}_${state.scoreDisplayType}`;
    
    try {
        const docRef = doc(db, "leaderboards", leaderboardId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            console.log(`[Firestore] Loaded leaderboard for ${leaderboardId}:`, docSnap.data().topScores);
            return docSnap.data().topScores || [];
        } else {
            console.warn(`[Firestore] No leaderboard found for ${leaderboardId}`);
            return [];
        }
    } catch (e) {
        console.error(`[Firestore] Load Error:`, e);
        throw e;
    }
}

export async function saveScore() {
    console.log("[Scoring] Submitting score for verification...");
    
    const payload = {
        name: state.playerName,
        playerClass: state.playerClass,
        mode: state.mode,
        gameType: state.gameType,
        gameLog: state.gameLog
    };

    try {
        // Replace with your actual Vercel deployment URL after you deploy!
        // Example: https://math-master-p2.vercel.app/api/verify-score
        const functionUrl = `/api/verify-score`; 

        const response = await fetch(functionUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Server responded with ${response.status}`);
        }

        const result = await response.json();
        console.log(`[Firestore] Score verified and saved! Verified Score: ${result.verifiedScore} for Leaderboard: ${result.leaderboardId}`);
        
        // Update local state with the server-verified score just in case they differ
        state.score = result.verifiedScore;
        
    } catch (e) {
        console.error(`[Scoring] Verification Error:`, e);
        // Fallback or error UI could go here
    }
}

export function rotateScoreDisplay(dir) {
    const modes = ['subitizing', 'placerace', 'patterns', 'addition10', 'subtraction10', 'addition', 'subtraction', 'mixed'];
    let idx = modes.indexOf(state.scoreDisplayMode);

    if (idx === -1) idx = 0;

    idx = (idx + dir + modes.length) % modes.length;
    state.scoreDisplayMode = modes[idx];
}
