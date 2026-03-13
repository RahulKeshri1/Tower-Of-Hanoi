/**
 * Game Module - Core game logic for Tower of Hanoi
 * Handles game state, levels, timer, and win/lose conditions
 */

const Game = (function() {
    // Level configurations - Designed to be challenging!
    const LEVELS = {
        1: {
            disks: 3,
            timeLimit: 60,      // 60 seconds
            maxMoves: 15,       // Minimum is 7, giving only 8 extra moves
            minMoves: 7         // 2^n - 1
        },
        2: {
            disks: 4,
            timeLimit: 90,      // 90 seconds
            maxMoves: 25,       // Minimum is 15, giving only 10 extra moves
            minMoves: 15
        },
        3: {
            disks: 5,
            timeLimit: 120,     // 2 minutes
            maxMoves: 50,       // Minimum is 31, giving only 19 extra moves
            minMoves: 31
        },
        4: {
            disks: 6,
            timeLimit: 180,     // 3 minutes
            maxMoves: 90,       // Minimum is 63, giving only 27 extra moves
            minMoves: 63
        }
    };
    
    // Game state
    let state = {
        playerName: '',
        course: '',             // NEW
        college: '',            // NEW
        currentLevel: 1,
        towers: [[], [], []],   // Array of arrays representing each tower
        moveCount: 0,
        timeRemaining: 0,
        timerInterval: null,
        isPlaying: false,
        selectedDisk: null,
        selectedTower: null,
        completedLevels: 0,     // Count of fully cleared levels
        totalMoves: 0,          // Across all levels
        totalTime: 0,           // Across all levels
        levelStartTime: 0       // For calculating level time
    };
    
    // Callbacks for UI updates
    let callbacks = {
        onTimerUpdate: null,
        onMoveUpdate: null,
        onGameOver: null,
        onLevelComplete: null,
        onVictory: null,
        onTowersUpdate: null
    };
    
    /**
     * Initialize the game with player details
     * @param {string} name    - Player's name
     * @param {string} course  - Player's course
     * @param {string} college - Player's college
     */
    function init(name, course, college) {
        state.playerName  = name.trim();
        state.course      = (course  || '').trim();
        state.college     = (college || '').trim();
        state.currentLevel = 1;
        state.completedLevels = 0;
        state.totalMoves   = 0;
        state.totalTime    = 0;
        
        Storage.saveCurrentPlayer({
            name:    state.playerName,
            currentLevel: 1,
            completedLevels: 0,
            totalMoves:   0,
            totalTime:    0
        });
    }
    
    /**
     * Set callback functions for UI updates
     * @param {Object} cbs - Object containing callback functions
     */
    function setCallbacks(cbs) {
        callbacks = { ...callbacks, ...cbs };
    }
    
    /**
     * Start or restart the current level
     */
    function startLevel() {
        const levelConfig = LEVELS[state.currentLevel];
        
        // Reset level state
        state.towers = [[], [], []];
        state.moveCount = 0;
        state.timeRemaining = levelConfig.timeLimit;
        state.selectedDisk = null;
        state.selectedTower = null;
        state.levelStartTime = Date.now();
        
        // Initialize disks on first tower (largest at bottom)
        for (let i = levelConfig.disks; i >= 1; i--) {
            state.towers[0].push(i);
        }
        
        state.isPlaying = true;
        
        // Update UI
        if (callbacks.onTowersUpdate) {
            callbacks.onTowersUpdate(state.towers, levelConfig.disks);
        }
        if (callbacks.onMoveUpdate) {
            callbacks.onMoveUpdate(state.moveCount, levelConfig.maxMoves);
        }
        if (callbacks.onTimerUpdate) {
            callbacks.onTimerUpdate(state.timeRemaining, levelConfig.timeLimit);
        }
        
        // Start timer
        startTimer();
    }
    
    /**
     * Start the countdown timer
     */
    function startTimer() {
        // Clear any existing timer
        if (state.timerInterval) {
            clearInterval(state.timerInterval);
        }
        
        const levelConfig = LEVELS[state.currentLevel];
        
        state.timerInterval = setInterval(() => {
            if (!state.isPlaying) return;
            
            state.timeRemaining--;
            
            if (callbacks.onTimerUpdate) {
                callbacks.onTimerUpdate(state.timeRemaining, levelConfig.timeLimit);
            }
            
            // Check for time out
            if (state.timeRemaining <= 0) {
                gameOver('Time\'s up! You ran out of time.');
            }
        }, 1000);
    }
    
    /**
     * Pause the timer
     */
    function pauseTimer() {
        if (state.timerInterval) {
            clearInterval(state.timerInterval);
            state.timerInterval = null;
        }
    }
    
    /**
     * Resume the timer
     */
    function resumeTimer() {
        if (!state.timerInterval && state.isPlaying) {
            startTimer();
        }
    }
    
    /**
     * Attempt to select/move a disk
     * @param {number} towerIndex - Index of the tower (0, 1, or 2)
     * @returns {Object} Result of the action
     */
    function selectTower(towerIndex) {
        if (!state.isPlaying) {
            return { success: false, message: 'Game not in progress' };
        }
        
        const tower = state.towers[towerIndex];
        
        // If no disk is selected, try to select one
        if (state.selectedDisk === null) {
            if (tower.length === 0) {
                return { success: false, message: 'No disk to select', type: 'empty' };
            }
            
            // Select the top disk
            state.selectedDisk = tower[tower.length - 1];
            state.selectedTower = towerIndex;
            
            return { 
                success: true, 
                message: 'Disk selected',
                type: 'select',
                disk: state.selectedDisk,
                tower: towerIndex
            };
        }
        
        // If clicking the same tower, deselect
        if (towerIndex === state.selectedTower) {
            const disk = state.selectedDisk;
            state.selectedDisk = null;
            state.selectedTower = null;
            
            return { 
                success: true, 
                message: 'Disk deselected',
                type: 'deselect',
                disk: disk,
                tower: towerIndex
            };
        }
        
        // Try to move the disk
        return moveDisk(towerIndex);
    }
    
    /**
     * Move the selected disk to a target tower
     * @param {number} targetTower - Index of the target tower
     * @returns {Object} Result of the move
     */
    function moveDisk(targetTower) {
        const targetStack = state.towers[targetTower];
        const topDiskOnTarget = targetStack.length > 0 ? targetStack[targetStack.length - 1] : null;
        
        // Check if move is valid (can't place larger on smaller)
        if (topDiskOnTarget !== null && state.selectedDisk > topDiskOnTarget) {
            // Invalid move - don't increment move count
            const result = {
                success: false,
                message: 'Invalid move! Cannot place larger disk on smaller one.',
                type: 'invalid',
                disk: state.selectedDisk,
                fromTower: state.selectedTower,
                toTower: targetTower
            };
            
            // Deselect
            state.selectedDisk = null;
            state.selectedTower = null;
            
            return result;
        }
        
        // Valid move - execute it
        const disk = state.towers[state.selectedTower].pop();
        state.towers[targetTower].push(disk);
        state.moveCount++;
        
        const fromTower = state.selectedTower;
        state.selectedDisk = null;
        state.selectedTower = null;
        
        // Update UI
        const levelConfig = LEVELS[state.currentLevel];
        if (callbacks.onMoveUpdate) {
            callbacks.onMoveUpdate(state.moveCount, levelConfig.maxMoves);
        }
        if (callbacks.onTowersUpdate) {
            callbacks.onTowersUpdate(state.towers, levelConfig.disks);
        }
        
        // Check for move limit exceeded
        if (state.moveCount >= levelConfig.maxMoves) {
            // Check if won first
            if (checkWin()) {
                levelComplete();
            } else {
                gameOver('Move limit exceeded! You used too many moves.');
            }
            return { success: true, type: 'move', gameEnded: true };
        }
        
        // Check for win
        if (checkWin()) {
            levelComplete();
            return { success: true, type: 'move', gameEnded: true };
        }
        
        return {
            success: true,
            message: 'Move successful',
            type: 'move',
            disk: disk,
            fromTower: fromTower,
            toTower: targetTower
        };
    }
    
    /**
     * Check if the player has won the level
     * All disks must be on the third tower (index 2)
     * @returns {boolean}
     */
    function checkWin() {
        const levelConfig = LEVELS[state.currentLevel];
        return state.towers[2].length === levelConfig.disks;
    }
    
    /**
     * Handle level completion
     */
    function levelComplete() {
        state.isPlaying = false;
        pauseTimer();
        
        const levelConfig = LEVELS[state.currentLevel];
        const levelTime = levelConfig.timeLimit - state.timeRemaining;
        
        state.totalMoves += state.moveCount;
        state.totalTime += levelTime;
        state.completedLevels = Math.max(state.completedLevels, state.currentLevel);
        
        // Save progress
        Storage.saveCurrentPlayer({
            name: state.playerName,
            currentLevel: state.currentLevel,
            completedLevels: state.completedLevels,
            totalMoves: state.totalMoves,
            totalTime: state.totalTime
        });
        
        // Check if this was the last level
        if (state.currentLevel >= 4) {
            if (callbacks.onVictory) {
                callbacks.onVictory({
                    totalMoves: state.totalMoves,
                    totalTime: state.totalTime
                });
            }
        } else {
            if (callbacks.onLevelComplete) {
                callbacks.onLevelComplete({
                    level: state.currentLevel,
                    moves: state.moveCount,
                    time: levelTime,
                    totalMoves: state.totalMoves,
                    totalTime: state.totalTime
                });
            }
        }
    }
    
    /**
     * Advance to the next level
     */
    function nextLevel() {
        if (state.currentLevel < 4) {
            state.currentLevel++;
            startLevel();
        }
    }
    
    /**
     * Handle game over (timeout or move limit)
     * @param {string} reason - Reason for game over
     */
    function gameOver(reason) {
        state.isPlaying = false;
        pauseTimer();
        
        if (callbacks.onGameOver) {
            callbacks.onGameOver({
                reason: reason,
                level: state.currentLevel,
                moves: state.moveCount,
                totalMoves: state.totalMoves,
                totalTime: state.totalTime
            });
        }
    }
    
    /**
     * Save score and quit — returns the entry object.
     * Actual async saving to CSV/localStorage is handled by the UI layer.
     * @returns {Object} Final score entry
     */
    function quitAndSave() {
        state.isPlaying = false;
        pauseTimer();
        
        // Persist only cached cleared-level progress when quitting.
        // This prevents writing a partially played, unfinished level to CSV.
        const cached = Storage.getCurrentPlayer() || {};
        const completedLevels = Math.max(
            0,
            parseInt(cached.completedLevels, 10) || 0,
            state.completedLevels || 0
        );
        const cachedTotalMoves = Math.max(
            0,
            parseInt(cached.totalMoves, 10) || 0,
            state.totalMoves || 0
        );
        const cachedTotalTime = Math.max(
            0,
            parseInt(cached.totalTime, 10) || 0,
            state.totalTime || 0
        );
        
        const entry = {
            name:       state.playerName,
            course:     state.course,
            college:    state.college,
            level:      completedLevels === 0 ? -1 : completedLevels,
            totalMoves: cachedTotalMoves,
            totalTime:  cachedTotalTime,
            timestamp:  new Date().toISOString()
        };
        
        Storage.clearCurrentPlayer();
        return entry;
    }
    
    /**
     * Reset the current level
     */
    function resetLevel() {
        pauseTimer();
        startLevel();
    }
    
    /**
     * Get current game state
     * @returns {Object} Current state
     */
    function getState() {
        return {
            playerName: state.playerName,
            currentLevel: state.currentLevel,
            towers: state.towers,
            moveCount: state.moveCount,
            timeRemaining: state.timeRemaining,
            isPlaying: state.isPlaying,
            selectedDisk: state.selectedDisk,
            selectedTower: state.selectedTower,
            completedLevels: state.completedLevels,
            totalMoves: state.totalMoves,
            totalTime: state.totalTime,
            levelConfig: LEVELS[state.currentLevel]
        };
    }
    
    /**
     * Get level configuration
     * @param {number} level - Level number
     * @returns {Object} Level config
     */
    function getLevelConfig(level) {
        return LEVELS[level] || null;
    }
    
    /**
     * Cleanup function
     */
    function cleanup() {
        pauseTimer();
        state.isPlaying = false;
    }
    
    // Public API
    return {
        init,
        setCallbacks,
        startLevel,
        selectTower,
        nextLevel,
        resetLevel,
        quitAndSave,
        getState,
        getLevelConfig,
        pauseTimer,
        resumeTimer,
        cleanup,
        LEVELS
    };
})();

// Make available globally
window.Game = Game;
