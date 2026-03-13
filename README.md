# 🗼 Tower of Hanoi

**An Interactive Logic Puzzle Game — CurieuX Event Edition**

[![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=flat-square)](https://nodejs.org)
[![Express.js](https://img.shields.io/badge/Express.js-4.18+-blue?style=flat-square)](https://expressjs.com)
[![License](https://img.shields.io/badge/License-Internal-gray?style=flat-square)](LICENSE)

---

## 📋 Overview

Tower of Hanoi is a competitive, multi-level logic puzzle game developed for **CurieuX** (The Computer Science Society) at **Sri Guru Tegh Bahadur Khalsa College, University of Delhi**. 

Players compete to solve the classic Tower of Hanoi problem across increasingly challenging levels, with real-time performance tracking and a live leaderboard system. The game is designed for event participation with secure score persistence and admin management capabilities.

### ✨ Key Features

- **4 Progressive Levels**: Escalating difficulty from 3 to 6 disks with adaptive time limits and move constraints
- **Real-Time Scoring**: Live performance tracking across moves, time, and level completion
- **Persistent Leaderboard**: Ranked scoring with multiple filter options and medal recognitions
- **Admin Dashboard**: Secure entry management with password-protected controls
- **Responsive UI**: Works seamlessly on desktop, tablet, and mobile devices
- **Offline Support**: Graceful localStorage fallback when server is unavailable
- **Smart Quit Handling**: Cached progress ensures only completed levels are saved

---

## 🎮 Gameplay Mechanics

### The Challenge

Move all disks from **Tower A** to **Tower C** following one simple rule:
- **A larger disk can never be placed on top of a smaller disk**

### Level Structure

| Level | Disks | Time Limit | Max Moves | Difficulty |
|-------|-------|-----------|-----------|-----------|
| 1     | 3     | 60s       | 15        | Easy      |
| 2     | 4     | 90s       | 25        | Medium    |
| 3     | 5     | 120s      | 50        | Hard      |
| 4     | 6     | 180s      | 90        | Expert    |

### Losing Conditions

- Time limit expires → Game Over
- Move count exceeds maximum → Game Over
- Invalid move (larger on smaller) → Move rejected (no penalty)

### Progress System

The game caches only **completed levels** when you quit:

| Scenario | Result |
|----------|--------|
| Quit after completing Level 2 | Save Level 2 with moves/time |
| Quit mid-Level 3 | Save only Level 2 (Level 3 discarded) |
| Quit without completing any level | Save as Level -1 (no progress) |
| Time expires → Then quit | Save cached cleared levels only |

---

## 🏆 Leaderboard System

### Ranking Algorithm

Players are ranked by:
1. **Highest level completed** (descending)
2. **Fewest moves** at same level (ascending)
3. **Least time taken** at same moves (ascending)

### Filter Options

- **All Players**: Complete leaderboard
- **Level 1+**: Players who cleared at least Level 1
- **Level 2+**: Players who cleared at least Level 2
- **Level 3+**: Players who cleared at least Level 3
- **Champions** 🏆: Players who completed Level 4 (all levels)

---

## 🛠️ Technology Stack

| Component | Technology |
|-----------|-----------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **Backend** | Node.js + Express.js |
| **Storage** | CSV (data/scores.csv) with localStorage fallback |
| **Server** | Express (Port 3000) |

---

## 📁 Project Structure

```
Tower-Of-Hanoi/
├── index.html              # Main application UI
├── server.js               # Express.js server & API
├── package.json            # Dependencies
├── README.md               # This file
│
├── css/
│   └── style.css           # Responsive styling
│
├── js/
│   ├── game.js             # Core game logic & rules
│   ├── ui.js               # UI rendering & events
│   └── storage.js          # API & data layer
│
├── data/
│   └── scores.csv          # Leaderboard database
│
└── Assets/                 # Logos & branding images
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 16+ (recommended 18 LTS)
- **npm** 7+

### Installation

```bash
# Clone the repository
cd "Tower Of Hanoi"

# Install dependencies
npm install
```

### Running the Application

**Production Mode:**
```bash
npm start
```

**Development Mode (auto-kill port conflicts):**
```bash
npm run dev
```

### Access Points

```
🖥️  Local:        http://localhost:3000
🌐 Network:      http://<YOUR-IP>:3000
```

The server will display connection details on startup.

---

## 📊 CSV Data Format

### Header
```
Timestamp,Name,Course,College,LevelReached,TotalMoves,TotalTimeSecs
```

### Example Entry
```
2026-03-13T16:48:45.878Z,Rahul Keshri,B.Sc. Computer Science,Sri Guru Tegh Bahadur Khalsa College,2,28,95
```

### Fields
- **Timestamp**: ISO 8601 format (auto-generated)
- **Name**: Player name (max 50 chars)
- **Course**: Player's course/program (max 100 chars)
- **College**: Institution name (max 150 chars)
- **LevelReached**: Highest completed level (or -1 if none)
- **TotalMoves**: Cumulative moves across all levels
- **TotalTimeSecs**: Cumulative time in seconds

---

## 🔌 API Reference

### Public Endpoints

#### Get Leaderboard
```
GET /api/leaderboard?filter=all|1|2|3|4
```
Returns sorted leaderboard entries (max 200).

#### Save Score
```
POST /api/save
Content-Type: application/json

{
  "name": "Player Name",
  "course": "B.Sc. CS",
  "college": "SGTBKC",
  "level": 2,
  "totalMoves": 28,
  "totalTime": 95
}
```

### Admin Endpoints

#### Admin Login
```
POST /api/admin/login
Content-Type: application/json

{ "password": "Curieux@2026" }
```

#### Get All Entries
```
GET /api/admin/entries
Headers: x-admin-password: Curieux@2026
```

#### Update Entry
```
PUT /api/admin/entries/:id
Headers: x-admin-password: Curieux@2026
Content-Type: application/json

{
  "name": "Updated Name",
  "course": "Updated Course",
  "college": "Updated College"
}
```

#### Clear Leaderboard
```
DELETE /api/clear
Content-Type: application/json

{ "password": "Curieux@2026" }
```

---

## 🔐 Admin & Security

### Password Configuration

Admin password is defined in `server.js`:
```javascript
const DELETE_PASSWORD = 'Curieux@2026';
```

⚠️ **Change this password before any public event!**

### Admin Capabilities

- View all participant entries
- Edit name, course, and college information
- Clear entire leaderboard (with password authentication)

---

## 🌐 Offline Fallback

If the server is unavailable, the application automatically switches to **localStorage mode**:
- Score data is stored locally in the browser
- Leaderboard functionality remains operational
- Data persists across browser sessions
- Useful for testing and offline scenarios

---

## 📋 Event Operation Checklist

- [ ] Change admin password in `server.js`
- [ ] Test on network devices before event
- [ ] Backup `data/scores.csv` before and after event
- [ ] Keep server running during entire event
- [ ] Monitor console for errors
- [ ] Share network URL with participants (if needed)
- [ ] Verify leaderboard displays correctly throughout

---

## 🐛 Troubleshooting

### Port Already in Use
```
Error: EADDRINUSE: address already in use :::3000
```
**Solution:**
```bash
# Find and kill process using port 3000
lsof -n -P -iTCP:3000 -sTCP:LISTEN
kill <PID>

# Or use dev mode (auto-handles this)
npm run dev
```

### Cannot Connect from Network
- Verify server is running on port 3000
- Check firewall settings
- Use the Network URL displayed in console
- Ensure all devices are on same Wi-Fi network

### CSV Permission Error
- Ensure `data/` directory exists and is writable
- Check file permissions: `chmod 644 data/scores.csv`
- Restart server after permission changes

### Leaderboard Not Updating
- Clear browser cache and localStorage
- Restart server
- Check browser console for errors (F12)
- Verify server logs for save endpoint errors

---

## 📝 Notes

- Each player registration requires **Name, Course, and College** (all mandatory)
- Maximum 200 entries displayed on leaderboard
- Level -1 indicates player quit without clearing any level
- Game state is preserved in localStorage during active session

---

## 📄 License

This project is developed and maintained by **CurieuX**, Sri Guru Tegh Bahadur Khalsa College, University of Delhi. Currently intended for internal event use.

---

## 👥 Credits

**Developed for CurieuX Event** by the Computer Science Society  
Sri Guru Tegh Bahadur Khalsa College, University of Delhi

---

<div align="center">

**Made with ❤️ for the CurieuX Community**

For issues or suggestions, contact the event organizers.

</div>