/**
 * Storage Module — async by design
 * Primary:  HTTP API  →  data/scores.csv  (when Node server is running)
 * Fallback: localStorage               (when opened as a plain file://)
 */

const Storage = (function() {
    const LS_KEY        = 'toh_leaderboard';
    const LS_PLAYER_KEY = 'toh_current_player';
    let adminPassword   = null;

    // null = not tested yet, true = server up, false = use localStorage
    let serverMode = null;

    async function checkServer() {
        if (serverMode !== null) return serverMode;
        try {
            const ctrl = new AbortController();
            const tid  = setTimeout(() => ctrl.abort(), 2000);
            const res  = await fetch('/api/leaderboard', { signal: ctrl.signal });
            clearTimeout(tid);
            serverMode = res.ok;
        } catch {
            serverMode = false;
        }
        if (!serverMode) {
            console.info('Storage: server not found — using localStorage fallback');
        }
        return serverMode;
    }

    // ── Save Entry ─────────────────────────────────────────────────
    async function saveEntry(entry) {
        const useServer = await checkServer();
        if (useServer) {
            try {
                const res  = await fetch('/api/save', {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify(entry)
                });
                const data = await res.json();
                if (data.success) return true;
                throw new Error(data.message);
            } catch (err) {
                console.warn('Server save failed, fallback to localStorage:', err.message);
            }
        }
        return saveEntryLocal(entry);
    }

    function saveEntryLocal(entry) {
        try {
            const list = getLeaderboardLocal();
            list.push({
                timestamp:  entry.timestamp || new Date().toISOString(),
                name:       entry.name,
                course:     entry.course   || '',
                college:    entry.college  || '',
                level:      entry.level,
                totalMoves: entry.totalMoves,
                totalTime:  entry.totalTime
            });
            list.sort((a, b) => {
                if (b.level !== a.level)           return b.level      - a.level;
                if (a.totalMoves !== b.totalMoves) return a.totalMoves - b.totalMoves;
                return a.totalTime - b.totalTime;
            });
            localStorage.setItem(LS_KEY, JSON.stringify(list.slice(0, 200)));
            return true;
        } catch (e) {
            console.error('localStorage save failed:', e);
            return false;
        }
    }

    // ── Get Leaderboard ────────────────────────────────────────────
    async function getFilteredLeaderboard(filter = 'all') {
        const useServer = await checkServer();
        if (useServer) {
            try {
                const res  = await fetch(`/api/leaderboard?filter=${encodeURIComponent(filter)}`);
                const data = await res.json();
                if (data.success) return data.entries;
                throw new Error(data.message);
            } catch (err) {
                console.warn('Server fetch failed, fallback to localStorage:', err.message);
            }
        }
        let entries = getLeaderboardLocal();
        if (filter !== 'all') {
            const lvl = parseInt(filter);
            entries   = entries.filter(e => e.level >= lvl);
        }
        return entries;
    }

    function getLeaderboardLocal() {
        try {
            const d = localStorage.getItem(LS_KEY);
            return d ? JSON.parse(d) : [];
        } catch { return []; }
    }

    // ── Clear Leaderboard (password required) ──────────────────────
    async function clearLeaderboard(password) {
        const useServer = await checkServer();
        if (useServer) {
            try {
                const res  = await fetch('/api/clear', {
                    method:  'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({ password })
                });
                const data = await res.json();
                if (data.success) return { success: true };
                return { success: false, message: data.message || 'Incorrect password' };
            } catch (err) {
                return { success: false, message: 'Server error' };
            }
        }
        // localStorage fallback — same password
        if (password === 'Curieux@2026') {
            localStorage.removeItem(LS_KEY);
            return { success: true };
        }
        return { success: false, message: 'Incorrect password' };
    }

    async function adminLogin(password) {
        const useServer = await checkServer();
        if (!useServer) {
            return { success: false, message: 'Admin panel requires the server to be running' };
        }

        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            const data = await res.json();
            if (!data.success) {
                return { success: false, message: data.message || 'Incorrect password' };
            }
            adminPassword = password;
            return { success: true };
        } catch (err) {
            return { success: false, message: 'Unable to reach admin service' };
        }
    }

    async function getAdminEntries() {
        const useServer = await checkServer();
        if (!useServer || !adminPassword) {
            return { success: false, message: 'Admin session not available', entries: [] };
        }

        try {
            const res = await fetch('/api/admin/entries', {
                headers: { 'x-admin-password': adminPassword }
            });
            const data = await res.json();
            if (!data.success) {
                return { success: false, message: data.message || 'Unable to load admin entries', entries: [] };
            }
            return { success: true, entries: data.entries || [] };
        } catch (err) {
            return { success: false, message: 'Unable to load admin entries', entries: [] };
        }
    }

    async function updateAdminEntry(entry) {
        const useServer = await checkServer();
        if (!useServer || !adminPassword) {
            return { success: false, message: 'Admin session not available' };
        }

        try {
            const res = await fetch(`/api/admin/entries/${encodeURIComponent(entry.id)}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': adminPassword
                },
                body: JSON.stringify({
                    name: entry.name,
                    course: entry.course,
                    college: entry.college
                })
            });
            const data = await res.json();
            if (!data.success) {
                return { success: false, message: data.message || 'Update failed' };
            }
            return { success: true, entry: data.entry };
        } catch (err) {
            return { success: false, message: 'Unable to update entry' };
        }
    }

    // ── Session Player (localStorage only, transient) ──────────────
    function saveCurrentPlayer(player) {
        try { localStorage.setItem(LS_PLAYER_KEY, JSON.stringify(player)); } catch {}
    }

    function getCurrentPlayer() {
        try {
            const d = localStorage.getItem(LS_PLAYER_KEY);
            return d ? JSON.parse(d) : null;
        } catch { return null; }
    }

    function clearCurrentPlayer() {
        try { localStorage.removeItem(LS_PLAYER_KEY); } catch {}
    }

    // ── Utility ────────────────────────────────────────────────────
    function formatTime(seconds) {
        const s = Math.max(0, Math.floor(seconds));
        const m = Math.floor(s / 60);
        return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    }

    return {
        saveEntry,
        getFilteredLeaderboard,
        clearLeaderboard,
        adminLogin,
        getAdminEntries,
        updateAdminEntry,
        saveCurrentPlayer,
        getCurrentPlayer,
        clearCurrentPlayer,
        formatTime
    };
})();

window.Storage = Storage;
