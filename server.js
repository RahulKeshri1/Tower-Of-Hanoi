/**
 * Tower of Hanoi — CurieuX Event Server
 * Saves all scores to data/scores.csv
 *
 * HOW TO RUN:
 *   1. npm install
 *   2. node server.js
 *   3. Open http://localhost:3000 in browser
 *
 * For other devices on the same Wi-Fi, share the Network URL shown in console.
 */

const express = require('express');
const fs      = require('fs');
const path    = require('path');
const os      = require('os');

const app  = express();
const PORT = 3000;

// ── Admin password to clear data — CHANGE THIS BEFORE THE EVENT ──
const DELETE_PASSWORD = 'Curieux@2026';

const DATA_DIR = path.join(__dirname, 'data');
const CSV_FILE = path.join(DATA_DIR, 'scores.csv');
const CSV_HEADER = 'Timestamp,Name,Course,College,LevelReached,TotalMoves,TotalTimeSecs\n';

// ── Middleware ─────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(__dirname)); // serves index.html, css/, js/, Assets/

// ── CSV helpers ────────────────────────────────────────────────────
function ensureCSV() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(CSV_FILE)) {
        fs.writeFileSync(CSV_FILE, CSV_HEADER, 'utf8');
        console.log('  Created scores file:', CSV_FILE);
    }
}

function csvEscape(value) {
    const str = String(value == null ? '' : value);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

function parseCSVLine(line) {
    const result = [];
    let current  = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
            else inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
            result.push(current); current = '';
        } else {
            current += ch;
        }
    }
    result.push(current);
    return result;
}

function parseCSV() {
    try {
        const lines = fs.readFileSync(CSV_FILE, 'utf8')
            .split('\n')
            .filter(l => l.trim() !== '');
        if (lines.length <= 1) return [];
        return lines.slice(1).map((line, index) => {
            const p = parseCSVLine(line);
            return {
                id:         index + 1,
                timestamp:  p[0] || '',
                name:       p[1] || '',
                course:     p[2] || '',
                college:    p[3] || '',
                level:      parseInt(p[4]) || 0,
                totalMoves: parseInt(p[5]) || 0,
                totalTime:  parseInt(p[6]) || 0
            };
        }).filter(e => e.name !== '');
    } catch (err) {
        console.error('CSV parse error:', err.message);
        return [];
    }
}

function writeCSV(entries) {
    const rows = entries.map(entry => [
        csvEscape(entry.timestamp || new Date().toISOString()),
        csvEscape(String(entry.name || '').slice(0, 50).trim()),
        csvEscape(String(entry.course || '').slice(0, 100).trim()),
        csvEscape(String(entry.college || '').slice(0, 150).trim()),
        csvEscape(Math.max(0, parseInt(entry.level) || 0)),
        csvEscape(Math.max(0, parseInt(entry.totalMoves) || 0)),
        csvEscape(Math.max(0, parseInt(entry.totalTime) || 0))
    ].join(','));

    const content = CSV_HEADER + (rows.length > 0 ? rows.join('\n') + '\n' : '');
    fs.writeFileSync(CSV_FILE, content, 'utf8');
}

function isAdminRequest(req) {
    const headerPassword = req.headers['x-admin-password'];
    const bodyPassword = req.body && req.body.password;
    return headerPassword === DELETE_PASSWORD || bodyPassword === DELETE_PASSWORD;
}

ensureCSV();

// ── API Routes ─────────────────────────────────────────────────────

// GET /api/leaderboard  — returns all entries as JSON
app.get('/api/leaderboard', (req, res) => {
    try {
        const filter = req.query.filter || 'all';
        let entries  = parseCSV();

        entries.sort((a, b) => {
            if (b.level      !== a.level)      return b.level      - a.level;
            if (a.totalMoves !== b.totalMoves) return a.totalMoves - b.totalMoves;
            return a.totalTime - b.totalTime;
        });

        if (filter !== 'all') {
            const lvl = parseInt(filter);
            if (!isNaN(lvl)) entries = entries.filter(e => e.level >= lvl);
        }

        res.json({ success: true, entries: entries.slice(0, 200) });
    } catch (err) {
        console.error('GET /api/leaderboard error:', err.message);
        res.status(500).json({ success: false, message: 'Error reading data' });
    }
});

// POST /api/save  — append one score row to CSV
app.post('/api/save', (req, res) => {
    try {
        const { name, course, college, level, totalMoves, totalTime, timestamp } = req.body;

        if (!name || typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({ success: false, message: 'Name is required' });
        }

        const row = [
            csvEscape(timestamp || new Date().toISOString()),
            csvEscape(String(name).slice(0, 50).trim()),
            csvEscape(String(course   || '').slice(0, 100).trim()),
            csvEscape(String(college  || '').slice(0, 150).trim()),
            csvEscape(Math.max(0, parseInt(level)      || 0)),
            csvEscape(Math.max(0, parseInt(totalMoves) || 0)),
            csvEscape(Math.max(0, parseInt(totalTime)  || 0))
        ].join(',');

        fs.appendFileSync(CSV_FILE, row + '\n', 'utf8');
        console.log(`  ✅  Saved: ${name.trim()} | Level ${level} | ${totalMoves} moves`);

        res.json({ success: true });
    } catch (err) {
        console.error('POST /api/save error:', err.message);
        res.status(500).json({ success: false, message: 'Error saving data' });
    }
});

app.post('/api/admin/login', (req, res) => {
    if (!isAdminRequest(req)) {
        return res.status(403).json({ success: false, message: 'Incorrect password' });
    }

    res.json({ success: true });
});

app.get('/api/admin/entries', (req, res) => {
    if (!isAdminRequest(req)) {
        return res.status(403).json({ success: false, message: 'Incorrect password' });
    }

    try {
        const entries = parseCSV();
        res.json({ success: true, entries });
    } catch (err) {
        console.error('GET /api/admin/entries error:', err.message);
        res.status(500).json({ success: false, message: 'Error loading admin data' });
    }
});

app.put('/api/admin/entries/:id', (req, res) => {
    if (!isAdminRequest(req)) {
        return res.status(403).json({ success: false, message: 'Incorrect password' });
    }

    const entryId = parseInt(req.params.id);
    const { name, course, college } = req.body || {};

    if (!entryId) {
        return res.status(400).json({ success: false, message: 'Invalid entry id' });
    }

    if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ success: false, message: 'Name is required' });
    }

    try {
        const entries = parseCSV();
        const index = entries.findIndex(entry => entry.id === entryId);

        if (index === -1) {
            return res.status(404).json({ success: false, message: 'Entry not found' });
        }

        entries[index] = {
            ...entries[index],
            name: String(name).trim(),
            course: String(course || '').trim(),
            college: String(college || '').trim()
        };

        writeCSV(entries);
        res.json({ success: true, entry: entries[index] });
    } catch (err) {
        console.error('PUT /api/admin/entries/:id error:', err.message);
        res.status(500).json({ success: false, message: 'Error updating entry' });
    }
});

// DELETE /api/clear  — clear all scores (password required)
app.delete('/api/clear', (req, res) => {
    if (!isAdminRequest(req)) {
        console.warn('  ⚠️  Failed admin attempt (wrong password)');
        return res.status(403).json({ success: false, message: 'Incorrect password' });
    }

    try {
        fs.writeFileSync(CSV_FILE, CSV_HEADER, 'utf8');
        console.log('  🗑️  Leaderboard cleared by admin');
        res.json({ success: true });
    } catch (err) {
        console.error('DELETE /api/clear error:', err.message);
        res.status(500).json({ success: false, message: 'Error clearing data' });
    }
});

// ── Start ──────────────────────────────────────────────────────────
function getLanIP() {
    for (const ifaces of Object.values(os.networkInterfaces())) {
        for (const iface of ifaces) {
            if (iface.family === 'IPv4' && !iface.internal) return iface.address;
        }
    }
    return 'N/A';
}

const server = app.listen(PORT, '0.0.0.0', () => {
    const ip = getLanIP();
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║       🗼  Tower of Hanoi — CurieuX Event                 ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║  Local:    http://localhost:${PORT}                         ║`);
    console.log(`║  Network:  http://${ip}:${PORT}  (share on Wi-Fi)   ║`);
    console.log(`║  CSV:      data/scores.csv                               ║`);
    // console.log(`║  Admin PW: ${DELETE_PASSWORD}                      ║`);
    console.log('╚══════════════════════════════════════════════════════════╝\n');
});

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`\nPort ${PORT} is already in use.`);
        console.error('Another server instance is already running.');
        console.error(`Open http://localhost:${PORT} in the browser, or stop the old process first.`);
        console.error(`To stop it: lsof -n -P -iTCP:${PORT} -sTCP:LISTEN`);
        console.error('Then: kill <PID>\n');
        process.exit(1);
    }

    console.error('Server failed to start:', error.message);
    process.exit(1);
});
