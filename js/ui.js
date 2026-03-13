/**
 * UI Module - Handles all user interface interactions
 * Drag & drop, touch support, screen management, and visual updates
 */

const UI = (function() {
    // DOM Elements
    let elements = {};
    let adminEntries = [];
    
    // Drag state
    let dragState = {
        isDragging: false,
        dragElement: null,
        startX: 0,
        startY: 0,
        offsetX: 0,
        offsetY: 0
    };
    
    /**
     * Initialize UI and cache DOM elements
     */
    function init() {
        cacheElements();
        bindEvents();
        setupGameCallbacks();
        showScreen('welcome-screen');
    }
    
    /**
     * Cache frequently used DOM elements
     */
    function cacheElements() {
        elements = {
            // Screens
            welcomeScreen:     document.getElementById('welcome-screen'),
            gameScreen:        document.getElementById('game-screen'),
            leaderboardScreen: document.getElementById('leaderboard-screen'),
            
            // Welcome / registration screen
            playerNameInput:   document.getElementById('player-name'),
            playerCourseInput: document.getElementById('player-course'),
            playerCollegeInput:document.getElementById('player-college'),
            startBtn:          document.getElementById('start-btn'),
            viewLeaderboardBtn:document.getElementById('view-leaderboard-btn'),
            
            // Game screen
            playerNameDisplay: document.querySelector('.player-name-display'),
            currentLevel:      document.getElementById('current-level'),
            timer:             document.getElementById('timer'),
            timerBox:          document.querySelector('.stat-box.timer'),
            moveCount:         document.getElementById('move-count'),
            maxMoves:          document.getElementById('max-moves'),
            diskCount:         document.getElementById('disk-count'),
            gameArea:          document.getElementById('game-area'),
            towers:            document.querySelectorAll('.tower'),
            resetLevelBtn:     document.getElementById('reset-level-btn'),
            quitGameBtn:       document.getElementById('quit-game-btn'),
            
            // Modals
            levelCompleteModal:document.getElementById('level-complete-modal'),
            gameOverModal:     document.getElementById('game-over-modal'),
            victoryModal:      document.getElementById('victory-modal'),
            adminModal:        document.getElementById('admin-modal'),
            adminPanelModal:   document.getElementById('admin-panel-modal'),
            
            // Level complete modal
            completeTime:  document.getElementById('complete-time'),
            completeMoves: document.getElementById('complete-moves'),
            nextLevelBtn:  document.getElementById('next-level-btn'),
            quitHereBtn:   document.getElementById('quit-here-btn'),
            
            // Game over modal
            gameOverReason: document.getElementById('game-over-reason'),
            retryLevelBtn:  document.getElementById('retry-level-btn'),
            quitSaveBtn:    document.getElementById('quit-save-btn'),
            
            // Victory modal
            totalTime:       document.getElementById('total-time'),
            totalMoves:      document.getElementById('total-moves'),
            victorySaveBtn:  document.getElementById('victory-save-btn'),
            
            // Leaderboard screen
            leaderboardBody: document.getElementById('leaderboard-body'),
            noEntries:       document.getElementById('no-entries'),
            filterBtns:      document.querySelectorAll('.filter-btn'),
            backToHomeBtn:   document.getElementById('back-to-home-btn'),
            adminBtn:        document.getElementById('admin-btn'),

            // Admin modal
            adminPasswordInput: document.getElementById('admin-password'),
            adminError:         document.getElementById('admin-error'),
            adminConfirmBtn:    document.getElementById('admin-confirm-btn'),
            adminCancelBtn:     document.getElementById('admin-cancel-btn'),

            // Admin panel
            adminPanelCloseBtn: document.getElementById('admin-panel-close-btn'),
            adminEntriesBody:   document.getElementById('admin-entries-body'),
            adminNoEntries:     document.getElementById('admin-no-entries')
        };
    }
    
    /**
     * Bind all event listeners
     */
    function bindEvents() {
        // Registration inputs - validate all 3 fields
        [elements.playerNameInput, elements.playerCourseInput, elements.playerCollegeInput]
            .forEach(input => input.addEventListener('input', validateRegistration));

        // Allow Enter on last field to start
        elements.playerCollegeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !elements.startBtn.disabled) handleStartGame();
        });

        elements.startBtn.addEventListener('click', handleStartGame);
        elements.viewLeaderboardBtn.addEventListener('click', () => {
            showScreen('leaderboard-screen');
            renderLeaderboard();
        });
        
        // Game controls
        elements.resetLevelBtn.addEventListener('click', handleResetLevel);
        elements.quitGameBtn.addEventListener('click', handleQuitGame);
        
        // Tower interactions (click/tap)
        elements.towers.forEach(tower => {
            tower.addEventListener('click', handleTowerClick);
            tower.addEventListener('touchend', handleTowerTouch);
        });
        
        // Modal buttons
        elements.nextLevelBtn.addEventListener('click', handleNextLevel);
        elements.quitHereBtn.addEventListener('click', handleQuitAndSave);
        elements.retryLevelBtn.addEventListener('click', handleRetryLevel);
        elements.quitSaveBtn.addEventListener('click', handleQuitAndSave);
        elements.victorySaveBtn.addEventListener('click', handleVictorySave);
        
        // Leaderboard
        elements.filterBtns.forEach(btn => {
            btn.addEventListener('click', handleFilterClick);
        });
        elements.backToHomeBtn.addEventListener('click', () => showScreen('welcome-screen'));
        elements.adminBtn.addEventListener('click', handleAdminOpen);

        // Admin modal
        elements.adminConfirmBtn.addEventListener('click', handleAdminLogin);
        elements.adminCancelBtn.addEventListener('click', handleAdminCancel);
        elements.adminPasswordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleAdminLogin();
        });
        elements.adminPanelCloseBtn.addEventListener('click', handleAdminPanelClose);
        elements.adminEntriesBody.addEventListener('click', handleAdminTableClick);
        
        // Prevent context menu on game area (for touch devices)
        elements.gameArea.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    /**
     * Setup game state callbacks
     */
    function setupGameCallbacks() {
        Game.setCallbacks({
            onTimerUpdate:   updateTimer,
            onMoveUpdate:    updateMoveCount,
            onTowersUpdate:  renderTowers,
            onLevelComplete: showLevelComplete,
            onGameOver:      showGameOver,
            onVictory:       showVictory
        });
    }
    
    // ────────────────────────────────────────
    // Screen / Modal helpers
    // ────────────────────────────────────────
    function showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    }
    
    function showModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }
    
    function hideModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }
    
    function hideAllModals() {
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    }

    // ────────────────────────────────────────
    // Event Handlers
    // ────────────────────────────────────────

    function validateRegistration() {
        const name    = elements.playerNameInput.value.trim();
        const course  = elements.playerCourseInput.value.trim();
        const college = elements.playerCollegeInput.value.trim();
        elements.startBtn.disabled = !(name && course && college);
    }
    
    function handleStartGame() {
        const name    = elements.playerNameInput.value.trim();
        const course  = elements.playerCourseInput.value.trim();
        const college = elements.playerCollegeInput.value.trim();
        if (!name || !course || !college) return;
        
        Game.init(name, course, college);
        elements.playerNameDisplay.textContent = name;
        
        showScreen('game-screen');
        updateLevelDisplay();
        Game.startLevel();
    }
    
    function handleTowerClick(e) {
        if (e.target.classList.contains('disk')) {
            const towerIndex = parseInt(e.currentTarget.dataset.tower);
            processSelection(towerIndex);
            return;
        }
        const towerIndex = parseInt(e.currentTarget.dataset.tower);
        processSelection(towerIndex);
    }
    
    function handleTowerTouch(e) {
        e.preventDefault();
        const towerIndex = parseInt(e.currentTarget.dataset.tower);
        processSelection(towerIndex);
    }
    
    function processSelection(towerIndex) {
        const result = Game.selectTower(towerIndex);
        
        if (result.type === 'select') {
            highlightSelectedDisk(towerIndex);
            highlightValidTowers(result.disk);
        } else if (result.type === 'deselect' || result.type === 'move') {
            clearHighlights();
        } else if (result.type === 'invalid') {
            showInvalidMove(towerIndex);
        }
    }
    
    function handleResetLevel() {
        hideAllModals();
        Game.resetLevel();
        clearHighlights();
    }
    
    function handleQuitGame() {
        if (confirm('Are you sure you want to quit? Your progress will be saved.')) {
            handleQuitAndSave();
        }
    }
    
    function handleNextLevel() {
        hideAllModals();
        Game.nextLevel();
        updateLevelDisplay();
        clearHighlights();
    }
    
    async function handleQuitAndSave() {
        const entry = Game.quitAndSave();
        await Storage.saveEntry(entry);
        hideAllModals();
        showScreen('leaderboard-screen');
        renderLeaderboard();
        resetWelcomeScreen();
    }
    
    function handleRetryLevel() {
        hideAllModals();
        Game.resetLevel();
        clearHighlights();
    }
    
    async function handleVictorySave() {
        const entry = Game.quitAndSave();
        await Storage.saveEntry(entry);
        hideAllModals();
        showScreen('leaderboard-screen');
        renderLeaderboard();
        resetWelcomeScreen();
    }
    
    function handleFilterClick(e) {
        elements.filterBtns.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        renderLeaderboard(e.target.dataset.filter);
    }

    // Admin modal handlers
    function handleAdminOpen() {
        elements.adminPasswordInput.value = '';
        elements.adminError.classList.add('hidden');
        showModal('admin-modal');
        setTimeout(() => elements.adminPasswordInput.focus(), 100);
    }

    async function handleAdminLogin() {
        const password = elements.adminPasswordInput.value;
        elements.adminError.classList.add('hidden');
        elements.adminConfirmBtn.disabled = true;
        elements.adminConfirmBtn.textContent = 'Opening...';

        const result = await Storage.adminLogin(password);

        elements.adminConfirmBtn.disabled = false;
        elements.adminConfirmBtn.textContent = 'Open Admin Panel';

        if (result.success) {
            hideModal('admin-modal');
            elements.adminPasswordInput.value = '';
            await openAdminPanel();
        } else {
            elements.adminError.textContent = '❌ ' + (result.message || 'Incorrect password!');
            elements.adminError.classList.remove('hidden');
            elements.adminPasswordInput.value = '';
            elements.adminPasswordInput.focus();
        }
    }

    function handleAdminCancel() {
        hideModal('admin-modal');
        elements.adminPasswordInput.value = '';
        elements.adminError.classList.add('hidden');
    }

    function handleAdminPanelClose() {
        hideModal('admin-panel-modal');
    }

    async function openAdminPanel() {
        showModal('admin-panel-modal');
        await renderAdminPanel();
    }

    async function renderAdminPanel() {
        elements.adminEntriesBody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted)">Loading admin data...</td></tr>';
        elements.adminNoEntries.classList.add('hidden');

        const result = await Storage.getAdminEntries();
        if (!result.success) {
            elements.adminEntriesBody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--danger-color)">${escapeHtml(result.message || 'Unable to load admin data')}</td></tr>`;
            return;
        }

        adminEntries = result.entries || [];

        if (adminEntries.length === 0) {
            elements.adminEntriesBody.innerHTML = '';
            elements.adminNoEntries.classList.remove('hidden');
            return;
        }

        elements.adminEntriesBody.innerHTML = adminEntries.map((entry) => `
            <tr data-entry-id="${entry.id}">
                <td><input class="admin-edit-input" data-field="name" value="${escapeHtml(entry.name)}"></td>
                <td><input class="admin-edit-input" data-field="course" value="${escapeHtml(entry.course || '')}"></td>
                <td><input class="admin-edit-input" data-field="college" value="${escapeHtml(entry.college || '')}"></td>
                <td>Level ${entry.level}</td>
                <td>${entry.totalMoves}</td>
                <td>${Storage.formatTime(entry.totalTime)}</td>
                <td>
                    <button class="btn btn-primary admin-save-btn" data-action="save">Save</button>
                    <span class="admin-row-status" aria-live="polite"></span>
                </td>
            </tr>
        `).join('');
    }

    async function handleAdminTableClick(event) {
        const button = event.target.closest('[data-action="save"]');
        if (!button) {
            return;
        }

        const row = button.closest('tr[data-entry-id]');
        if (!row) {
            return;
        }

        const entryId = parseInt(row.dataset.entryId);
        const name = row.querySelector('[data-field="name"]').value.trim();
        const course = row.querySelector('[data-field="course"]').value.trim();
        const college = row.querySelector('[data-field="college"]').value.trim();
        const status = row.querySelector('.admin-row-status');

        button.disabled = true;
        button.textContent = 'Saving...';
        status.textContent = '';

        const result = await Storage.updateAdminEntry({
            id: entryId,
            name,
            course,
            college
        });

        button.disabled = false;
        button.textContent = 'Save';

        if (!result.success) {
            status.textContent = result.message || 'Save failed';
            status.classList.add('error-msg');
            return;
        }

        status.textContent = 'Saved';
        status.classList.remove('error-msg');
        await renderLeaderboard(document.querySelector('.filter-btn.active')?.dataset.filter || 'all');
    }
    
    // ────────────────────────────────────────
    // UI Update Functions
    // ────────────────────────────────────────
    
    function updateTimer(timeRemaining, timeLimit) {
        elements.timer.textContent = Storage.formatTime(timeRemaining);
        const pct = (timeRemaining / timeLimit) * 100;
        elements.timerBox.classList.remove('warning', 'danger');
        if (pct <= 15)      elements.timerBox.classList.add('danger');
        else if (pct <= 30) elements.timerBox.classList.add('warning');
    }
    
    function updateMoveCount(moves, maxMoves) {
        elements.moveCount.innerHTML = `${moves} / <span id="max-moves">${maxMoves}</span>`;
    }
    
    function updateLevelDisplay() {
        const state  = Game.getState();
        const config = state.levelConfig;
        elements.currentLevel.textContent = state.currentLevel;
        elements.diskCount.textContent    = config.disks;
        elements.maxMoves.textContent     = config.maxMoves;
    }
    
    function renderTowers(towers, diskCount) {
        elements.towers.forEach((towerEl, index) => {
            const disksContainer = towerEl.querySelector('.disks-container');
            disksContainer.innerHTML = '';
            
            towers[index].forEach((diskSize, stackIndex) => {
                const disk = createDiskElement(diskSize);
                disksContainer.appendChild(disk);
                if (stackIndex === towers[index].length - 1) {
                    setupDragForDisk(disk, index);
                }
            });
        });
    }
    
    function createDiskElement(size) {
        const disk = document.createElement('div');
        disk.className    = 'disk';
        disk.dataset.size = size;
        disk.textContent  = size;
        return disk;
    }
    
    function setupDragForDisk(disk, towerIndex) {
        disk.addEventListener('mousedown', (e) => startDrag(e, disk, towerIndex));
        disk.addEventListener('touchstart', (e) => startDrag(e, disk, towerIndex), { passive: false });
    }
    
    // ────────────────────────────────────────
    // Drag & Drop
    // ────────────────────────────────────────
    
    function startDrag(e, disk, towerIndex) {
        e.preventDefault();
        e.stopPropagation();
        
        const state = Game.getState();
        if (!state.isPlaying) return;
        
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        const rect    = disk.getBoundingClientRect();
        
        dragState = {
            isDragging:  true,
            dragElement: disk,
            sourceTower: towerIndex,
            startX:      clientX,
            startY:      clientY,
            offsetX:     clientX - rect.left - rect.width  / 2,
            offsetY:     clientY - rect.top  - rect.height / 2
        };
        
        Game.selectTower(towerIndex);
        
        disk.classList.add('dragging');
        disk.style.position = 'fixed';
        disk.style.left     = `${clientX - rect.width  / 2}px`;
        disk.style.top      = `${clientY - rect.height / 2}px`;
        disk.style.width    = `${rect.width}px`;
        disk.style.zIndex   = '1000';
        document.body.appendChild(disk);
        
        highlightValidTowers(parseInt(disk.dataset.size));
        
        if (e.type.includes('touch')) {
            document.addEventListener('touchmove', onDrag, { passive: false });
            document.addEventListener('touchend',  endDrag);
        } else {
            document.addEventListener('mousemove', onDrag);
            document.addEventListener('mouseup',   endDrag);
        }
    }
    
    function onDrag(e) {
        if (!dragState.isDragging) return;
        e.preventDefault();
        
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        const disk    = dragState.dragElement;
        const rect    = disk.getBoundingClientRect();
        
        disk.style.left = `${clientX - rect.width  / 2}px`;
        disk.style.top  = `${clientY - rect.height / 2}px`;
        
        updateTowerHighlight(clientX, clientY);
    }
    
    function endDrag(e) {
        if (!dragState.isDragging) return;
        
        const clientX = e.type.includes('touch')
            ? (e.changedTouches ? e.changedTouches[0].clientX : dragState.startX)
            : e.clientX;
        const clientY = e.type.includes('touch')
            ? (e.changedTouches ? e.changedTouches[0].clientY : dragState.startY)
            : e.clientY;
        
        const targetTower = getTowerAtPosition(clientX, clientY);
        
        if (targetTower !== null && targetTower !== dragState.sourceTower) {
            const result = Game.selectTower(targetTower);
            if (!result.success && result.type === 'invalid') {
                showInvalidMove(targetTower);
            }
        } else {
            Game.selectTower(dragState.sourceTower);
        }
        
        const disk = dragState.dragElement;
        if (disk && disk.parentNode === document.body) document.body.removeChild(disk);
        disk.classList.remove('dragging');
        disk.style.position = '';
        disk.style.left     = '';
        disk.style.top      = '';
        disk.style.width    = '';
        disk.style.zIndex   = '';
        
        dragState.isDragging  = false;
        dragState.dragElement = null;
        clearHighlights();
        
        const state = Game.getState();
        renderTowers(state.towers, state.levelConfig.disks);
        
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup',   endDrag);
        document.removeEventListener('touchmove', onDrag);
        document.removeEventListener('touchend',  endDrag);
    }
    
    function getTowerAtPosition(x, y) {
        for (let i = 0; i < elements.towers.length; i++) {
            const rect = elements.towers[i].getBoundingClientRect();
            if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return i;
        }
        return null;
    }
    
    function updateTowerHighlight(x, y) {
        const towerIndex = getTowerAtPosition(x, y);
        elements.towers.forEach((tower, index) => {
            tower.classList.remove('highlight');
            if (index === towerIndex && index !== dragState.sourceTower) {
                tower.classList.add('highlight');
            }
        });
    }
    
    // ────────────────────────────────────────
    // Visual Feedback
    // ────────────────────────────────────────
    
    function highlightSelectedDisk(towerIndex) {
        const tower = elements.towers[towerIndex];
        const disks = tower.querySelectorAll('.disk');
        if (disks.length > 0) disks[disks.length - 1].classList.add('selected');
    }
    
    function highlightValidTowers(diskSize) {
        const state = Game.getState();
        elements.towers.forEach((towerEl, index) => {
            if (index === state.selectedTower) return;
            const topDisk = state.towers[index].length > 0
                ? state.towers[index][state.towers[index].length - 1]
                : null;
            if (topDisk === null || diskSize < topDisk) towerEl.classList.add('valid-drop');
            else towerEl.classList.add('invalid-drop');
        });
    }
    
    function clearHighlights() {
        elements.towers.forEach(tower => {
            tower.classList.remove('highlight', 'valid-drop', 'invalid-drop');
        });
        document.querySelectorAll('.disk.selected').forEach(d => d.classList.remove('selected'));
    }
    
    function showInvalidMove(towerIndex) {
        const tower   = elements.towers[towerIndex];
        const topDisk = tower.querySelector('.disk:last-child');
        if (topDisk) {
            topDisk.classList.add('invalid-move');
            setTimeout(() => topDisk.classList.remove('invalid-move'), 300);
        }
        tower.classList.add('invalid-drop');
        setTimeout(() => tower.classList.remove('invalid-drop'), 300);
    }
    
    // ────────────────────────────────────────
    // Modals
    // ────────────────────────────────────────
    
    function showLevelComplete(data) {
        elements.completeTime.textContent  = Storage.formatTime(data.time);
        elements.completeMoves.textContent = data.moves;
        showModal('level-complete-modal');
    }
    
    function showGameOver(data) {
        elements.gameOverReason.textContent = data.reason;
        showModal('game-over-modal');
    }
    
    function showVictory(data) {
        elements.totalTime.textContent  = Storage.formatTime(data.totalTime);
        elements.totalMoves.textContent = data.totalMoves;
        showModal('victory-modal');
    }
    
    // ────────────────────────────────────────
    // Leaderboard
    // ────────────────────────────────────────
    
    async function renderLeaderboard(filter = 'all') {
        elements.leaderboardBody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted)">Loading...</td></tr>';
        elements.noEntries.classList.add('hidden');

        const entries = await Storage.getFilteredLeaderboard(filter);
        
        if (entries.length === 0) {
            elements.leaderboardBody.innerHTML = '';
            elements.noEntries.classList.remove('hidden');
            return;
        }
        
        elements.leaderboardBody.innerHTML = entries.map((entry, index) => `
            <tr>
                <td>${getRankDisplay(index + 1)}</td>
                <td>${escapeHtml(entry.name)}</td>
                <td>${escapeHtml(entry.course  || '—')}</td>
                <td>${escapeHtml(entry.college || '—')}</td>
                <td>Level ${entry.level}</td>
                <td>${entry.totalMoves}</td>
                <td>${Storage.formatTime(entry.totalTime)}</td>
            </tr>
        `).join('');
    }

    function getRankDisplay(rank) {
        if (rank === 1) return '🥇 1';
        if (rank === 2) return '🥈 2';
        if (rank === 3) return '🥉 3';
        return rank;
    }
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    function resetWelcomeScreen() {
        elements.playerNameInput.value    = '';
        elements.playerCourseInput.value  = '';
        // Keep college pre-filled with default
        elements.playerCollegeInput.value = 'Sri Guru Tegh Bahadur Khalsa College';
        elements.startBtn.disabled = true;
    }
    
    document.addEventListener('DOMContentLoaded', init);
    
    return { showScreen, renderLeaderboard };
})();

window.UI = UI;
