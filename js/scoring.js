import { db, collection, serverTimestamp, addDoc, getDoc, setDoc, doc } from "./firebase.js";
import { state } from "./state.js";
import { dom } from "./dom.js";
import { CONFIG } from "./config.js";

const CACHE_KEY_PREFIX = "math_master_scores_";
const CACHE_EXPIRY = 60 * 60 * 1000; // 1 hour
const pendingFetches = new Map(); // Prevent duplicate concurrent requests
export async function loadAggregatedScores() {
    const leaderboardId = `${state.scoreDisplayMode}_${state.scoreDisplayType}`;
    console.group(`[Firestore] Loading Leaderboard: ${leaderboardId}`);
    
    try {
        if (!state.scoreDisplayMode || !state.scoreDisplayType) {
            console.warn("[Firestore] Missing state for loading scores:", { mode: state.scoreDisplayMode, type: state.scoreDisplayType });
        }

        const docRef = doc(db, "leaderboards", leaderboardId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            console.log(`[Firestore] Data found! Count: ${data.topScores?.length || 0}`);
            console.groupEnd();
            return data.topScores || [];
        } else {
            console.log("[Firestore] No document exists yet for this mode.");
            console.groupEnd();
            return [];
        }
    } catch (e) {
        console.error(`[Firestore] LOAD ERROR:`, e);
        console.groupEnd();
        // Don't alert on load error unless it's persistent, to avoid spam
        throw e;
    }
}

export async function saveScore() {
    const today = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
    const newScoreEntry = {
        name: state.playerName,
        class: state.playerClass,
        score: state.score,
        mode: state.mode,
        type: state.gameType,
        date: today,
        timestamp: Date.now() // Use local time for immediate cache update
    };

    try {
        console.group(`[Firestore] Saving Score: ${state.playerName}`);
        console.log("Entry Data:", newScoreEntry);

        // 1. Save FULL record for history (costs 1 write)
        await addDoc(collection(db, "scores"), {
            ...newScoreEntry,
            timestamp: serverTimestamp()
        });
        console.log("[Firestore] Step 1/2: Full record saved successfully.");
        
        // 2. Update Aggregated Leaderboard (Top 5)
        const leaderboardId = `${state.mode}_${state.gameType}`;
        const docRef = doc(db, "leaderboards", leaderboardId);
        
        console.log(`[Firestore] Step 2/2: Updating leaderboard ${leaderboardId}...`);
        const docSnap = await getDoc(docRef);
        let currentTopScores = [];
        
        if (docSnap.exists()) {
            currentTopScores = docSnap.data().topScores || [];
        }
        
        // Add new score if it qualifies
        currentTopScores.push({
            name: newScoreEntry.name,
            score: newScoreEntry.score
        });
        
        // Sort and slice to Top 5
        currentTopScores.sort((a, b) => b.score - a.score);
        currentTopScores = currentTopScores.slice(0, 5);
        
        // Save back to Firestore (costs 1 write)
        await setDoc(docRef, { topScores: currentTopScores });
        console.log("[Firestore] Leaderboard updated successfully.");
        console.groupEnd();

        // Update local cache
        const cacheKey = `${CACHE_KEY_PREFIX}${state.mode}_${state.gameType}`;
        localStorage.setItem(cacheKey, JSON.stringify({ 
            scores: currentTopScores, 
            timestamp: Date.now() 
        }));
        
    } catch (e) {
        console.error(`[Firestore] SAVE ERROR:`, e);
        console.groupEnd();
        alert(`Failed to save score! Please check your internet or contact admin.\n\nError: ${e.message}`);
    }
}

export function rotateScoreDisplay(dir) {
    const modes = ['subitizing', 'placerace', 'patterns', 'addition10', 'subtraction10', 'addition', 'subtraction', 'mixed'];
    let idx = modes.indexOf(state.scoreDisplayMode);

    if (idx === -1) idx = 0;

    idx = (idx + dir + modes.length) % modes.length;
    state.scoreDisplayMode = modes[idx];
}
