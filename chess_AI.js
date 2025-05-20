// Chess Game Board Setup
let selectedSquare = null;

let squareToHighlight = null;
let squareClass = 'highlight-square';
let board = null;
let game = new Chess();
let playerColor = 'white';
let computerThinking = false;
let gameActive = false;
let playerTimer = null;
let aiTimer = null;
let gameTime = 10 * 60; // In seconds (10 minutes)
let timeLeft = {
    player: gameTime,
    ai: gameTime
};
let difficulty = 'medium';
let moveHistory = [];
let currentPromotion = null;

// OpenAI API Setup
// Unicode Piece Setup
const unicodePieces = {
    'wK': '♔', // White King
    'wQ': '♕', // White Queen
    'wR': '♖', // White Rook
    'wB': '♗', // White Bishop
    'wN': '♘', // White Knight
    'wP': '♙', // White Pawn
    'bK': '♚', // Black King
    'bQ': '♛', // Black Queen
    'bR': '♜', // Black Rook
    'bB': '♝', // Black Bishop
    'bN': '♞', // Black Knight
    'bP': '♟', // Black Pawn
};

// Custom chess piece render function
function customRenderPiece(piece, isLight) {
    if (piece === null) return '';
    
    const pieceType = piece.charAt(0) === 'w' ? 'w' : 'b';
    const pieceCode = unicodePieces[piece];
    const colorClass = pieceType === 'w' ? 'white-piece' : 'black-piece';
    
    return `<span class="chess-piece ${colorClass}">${pieceCode}</span>`;
}

// Initialize chess board
function initializeBoard() {
    const config = {
        draggable: true,
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd,
        onMouseoverSquare: onMouseoverSquare,
        onMouseoutSquare: onMouseoutSquare,
        pieceTheme: function(piece) {
            return 'https://chessboardjs.com/img/chesspieces/wikipedia/' + piece + '.png';
        }
    };
    
    board = Chessboard('board', config);
    updateStatus();
    
    // Remove any existing click handlers to avoid duplication
    $('#board').off('click', '.square-55d63');
    
    // Add click handlers using event delegation
    $('#board').on('click', '.square-55d63', function() {
        const square = $(this).attr('data-square');
        handleSquareClick(square);
    });
}
function removeAllHighlights() {
    $('#board .square-55d63').removeClass('highlight-square');
}

// Start game
function startGame() {
    gameActive = true;
    document.getElementById('startBtn').disabled = true;
    document.getElementById('hintBtn').disabled = false;
    document.getElementById('undoBtn').disabled = false;
    clearTimers();
    setupTimers();
    startPlayerTimer();
    updateStatus("Game started. Your turn (white)");
    
    // Send start message to chat
    sendMessageToAI("New game started. I'm playing with white stamps. Any tips for getting started?");
}

// Reset game
function newGame() {
    game = new Chess();
    board.position('start');
    gameActive = false;
    computerThinking = false;
    document.getElementById('startBtn').disabled = false;
    document.getElementById('hintBtn').disabled = true;
    document.getElementById('undoBtn').disabled = true;
    clearTimers();
    document.getElementById('playerTimer').textContent = formatTime(gameTime);
    document.getElementById('aiTimer').textContent = formatTime(gameTime);
    timeLeft.player = gameTime;
    timeLeft.ai = gameTime;
    updateStatus("Ready to start");
    clearMoveHistory();
    
    // Reset chat
    addChatMessage("Hi! I'll help you play chess. I can give you advice and analyze the game.", 'bot');
}

// When starting to drag a piece
function onDragStart(source, piece, position, orientation) {
    // Don't allow piece movement if game is over
    if (game.game_over() || !gameActive) return false;
    
    // Don't allow dragging black pieces (computer)
    if (piece.search(/^b/) !== -1) return false;
    
    // Don't allow dragging if it's not your turn
    if ((game.turn() === 'b' && playerColor === 'white') ||
        (game.turn() === 'w' && playerColor === 'black')) {
        return false;
    }
}














function removeHighlights() {
    $('#board .square-55d63').removeClass('highlight-square');
    selectedSquare = null;
}

function onMouseoverSquare(square, piece) {
    // If game is not active or it's not player's turn, return
    if (!gameActive || (game.turn() === 'b' && playerColor === 'white') || 
        (game.turn() === 'w' && playerColor === 'black')) {
        return;
    }
    
    // Don't highlight for black pieces (computer's pieces)
    if (piece && piece.search(/^b/) !== -1 && playerColor === 'white') {
        return;
    }
    
    // Get list of possible moves for this square
    let moves = game.moves({
        square: square,
        verbose: true
    });
    
    // If there are no moves available for this square, return
    if (moves.length === 0) return;
    
    // Highlight the square they moused over
    $('#board .square-' + square).addClass('highlight-square');
    
    // Highlight all possible squares for this piece
    for (let i = 0; i < moves.length; i++) {
        $('#board .square-' + moves[i].to).addClass('highlight-square');
    }
}

function onMouseoutSquare(square, piece) {
    // Only remove highlights if no piece is selected
    if (selectedSquare === null) {
        $('#board .square-55d63').removeClass('highlight-square');
    } else {
        // If a piece is selected, only remove highlights from squares that aren't
        // the selected piece or valid moves
        let validMoves = game.moves({
            square: selectedSquare,
            verbose: true
        });
        
        let isValidMove = false;
        for (let i = 0; i < validMoves.length; i++) {
            if (validMoves[i].to === square) {
                isValidMove = true;
                break;
            }
        }
        
        if (square !== selectedSquare && !isValidMove) {
            $('#board .square-' + square).removeClass('highlight-square');
        }
    }
}
// Modified onDrop function - needs to be replaced in chess_AI.js
function onDrop(source, target) {
    // Check if move is valid
    const move = game.move({
        from: source,
        to: target,
        promotion: 'q' // Always choose queen for pawn promotion
    });
    
    // If move is invalid
    if (move === null) return 'snapback';
    
    // Check if pawn has reached the end for promotion
    if (move.flags.includes('p')) {
        // Pawn promotion - for simplicity, we automatically choose queen
        // You can add more functionality for promotion choices
    }
    
    // Log the move
    logMove(move);
    
    // Get player's move notation for AI analysis
    const playerMoveNotation = getMoveNotation(move);
    
    // Stop player timer and start computer timer
    pausePlayerTimer();
    startAITimer();
    
    // Computer's turn - pass the player move notation to the computer move function
    setTimeout(() => makeComputerMove(playerMoveNotation), 250);
    
    updateStatus();
}

// After dragging ends, pieces are rearranged
function onSnapEnd() {
    board.position(game.fen());
}
// Create computer move
// Create computer move
function makeComputerMove(playerMoveNotation) {
    if (game.game_over() || !gameActive || computerThinking) return;
    
    computerThinking = true;
    
    // Computer move difficulty level
    let depth;
    switch(difficulty) {
        case 'easy': depth = 1; break;
        case 'medium': depth = 2; break;
        case 'hard': depth = 3; break;
        default: depth = 2;
    }
    
    // Computer selects a move
    setTimeout(() => {
        const possibleMoves = game.moves();
        
        // If no moves are available, game is over
        if (possibleMoves.length === 0) {
            computerThinking = false;
            return;
        }
        
        // Find best move
        const computerMove = getBestMove(game, depth);
        
        // Make computer move
        const move = game.move(computerMove);
        
        // Log move
        logMove(move);
        
        // Update chess board
        board.position(game.fen());
        
        // Stop computer timer and start player timer
        pauseAITimer();
        startPlayerTimer();
        
        // Get computer move notation
        const computerMoveNotation = getMoveNotation(move);
        
        // Construct the message for AI analysis
        let boardAnalysisRequest = '';
        
        // Check if player move exists and construct appropriate message
        if (playerMoveNotation) {
            boardAnalysisRequest = `I moved: ${playerMoveNotation}, and the computer responded with: ${computerMoveNotation}. Can you analyze both moves?`;
        } else {
            boardAnalysisRequest = `The computer made a move: ${computerMoveNotation}. Can you analyze this move?`;
        }
        
        // Send the message to AI
        sendMessageToAI(boardAnalysisRequest);
        
        computerThinking = false;
        updateStatus();
    }, 500);
}
// Select best move for computer
function getBestMove(gameState, depth) {
    // Game state evaluation function
    function evaluateBoard(board) {
        let totalEvaluation = 0;
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                totalEvaluation += getPieceValue(board.board()[i][j], i, j);
            }
        }
        return totalEvaluation;
    }
    
    // Value of each piece
    function getPieceValue(piece, x, y) {
        if (piece === null) return 0;
        
        // Base value for each piece
        const pieceValue = {
            'p': 10,   // Pawn
            'n': 30,   // Knight
            'b': 30,   // Bishop
            'r': 50,   // Rook
            'q': 90,   // Queen
            'k': 900   // King
        };
        
        // Value based on piece type
        const absoluteValue = pieceValue[piece.type];
        
        // If piece belongs to computer (black) value is positive, otherwise negative
        return piece.color === 'b' ? absoluteValue : -absoluteValue;
    }
    
    // Minimax algorithm to find best move
    function minimax(gameState, depth, alpha, beta, isMaximizingPlayer) {
        if (depth === 0 || gameState.game_over()) {
            return evaluateBoard(gameState);
        }
        
        const possibleMoves = gameState.moves();
        
        if (isMaximizingPlayer) {
            let maxEval = -Infinity;
            for (let i = 0; i < possibleMoves.length; i++) {
                gameState.move(possibleMoves[i]);
                const evaluation = minimax(gameState, depth - 1, alpha, beta, false);
                gameState.undo();
                maxEval = Math.max(maxEval, evaluation);
                alpha = Math.max(alpha, evaluation);
                if (beta <= alpha) {
                    break;
                }
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (let i = 0; i < possibleMoves.length; i++) {
                gameState.move(possibleMoves[i]);
                const evaluation = minimax(gameState, depth - 1, alpha, beta, true);
                gameState.undo();
                minEval = Math.min(minEval, evaluation);
                beta = Math.min(beta, evaluation);
                if (beta <= alpha) {
                    break;
                }
            }
            return minEval;
        }
    }
    
    // Find best move using minimax algorithm
    const possibleMoves = gameState.moves();
    let bestMove = null;
    let bestEvaluation = -Infinity;
    
    for (let i = 0; i < possibleMoves.length; i++) {
        gameState.move(possibleMoves[i]);
        
        // Evaluate move
        const evaluation = minimax(gameState, depth - 1, -Infinity, Infinity, false);
        
        gameState.undo();
        
        // If move is better than previous
        if (evaluation > bestEvaluation) {
            bestEvaluation = evaluation;
            bestMove = possibleMoves[i];
        }
    }
    
    return bestMove;
}





// Add this to the bottom of your shatranj.js file, right before the final closing brace

// Toggle Game Explanation
// Toggle Game Explanation
document.getElementById('toggleChatBtn').addEventListener('click', () => {
    const chatContainer = document.querySelector('.chat-container');
    const gameContainer = document.querySelector('.game-container');
    
    // Toggle chat container visibility
    if (chatContainer.style.display === 'none') {
        // Show chat container
        chatContainer.style.display = 'flex';
        // Adjust game container width
        gameContainer.style.width = 'calc(65% - 20px)';
        // Enable chat functionality
        window.chatEnabled = true;
    } else {
        // Hide chat container
        chatContainer.style.display = 'none';
        // Expand game container to full width
        gameContainer.style.width = '100%';
        // Disable chat functionality
        window.chatEnabled = false;
    }
    
    // Resize the board to fit the new container size
    if (board) {
        setTimeout(() => {
            board.resize();
        }, 100);
    }
});








// Update game status
function updateStatus(message) {
    const statusElement = document.getElementById('status');
    
    if (message) {
        statusElement.textContent = message;
        return;
    }
    
    let status = '';
    
    if (game.in_checkmate()) {
        status = game.turn() === 'w' ? 'Game over! You lost.' : 'Congratulations! You won!';
        showGameOverModal(status);
        updateScores(game.turn() !== 'w');
        gameActive = false;
        clearTimers();
    } else if (game.in_draw()) {
        status = 'Game finished! Draw.';
        showGameOverModal(status);
        gameActive = false;
        clearTimers();
    } else {
        status = game.turn() === 'w' ? 'Your turn (white)' : 'Computer\'s turn (black)';
        
        if (game.in_check()) {
            status += ' - Check!';
        }
    }
    
    statusElement.textContent = status;
}

// Show game over modal
function showGameOverModal(message) {
    const modal = document.getElementById('gameOverModal');
    const modalText = document.getElementById('modalText');
    
    modalText.textContent = message;
    modal.style.display = 'flex';
}

// Update scores
function updateScores(playerWon) {
    if (playerWon) {
        document.getElementById('playerScore').textContent = 
            parseInt(document.getElementById('playerScore').textContent) + 1;
            
        // Update score based on difficulty level
        const levelScore = document.getElementById(`${difficulty}Score`);
        levelScore.textContent = parseInt(levelScore.textContent) + 1;
    } else {
        document.getElementById('aiScore').textContent = 
            parseInt(document.getElementById('aiScore').textContent) + 1;
    }
}

// Log moves
function logMove(move) {
    const moveNumber = Math.floor((game.history().length - 1) / 2) + 1;
    const isWhiteMove = game.history().length % 2 === 1;
    const formattedMove = getMoveNotation(move);
    
    moveHistory.push({
        number: moveNumber,
        move: formattedMove,
        color: isWhiteMove ? 'white' : 'black'
    });
    
    displayMoveHistory();
}

// Convert move to standard chess notation
function getMoveNotation(move) {
    let notation = '';
    
    // Check if checkmate or check
    if (game.in_checkmate()) {
        notation = move.san + '#';
    } else if (game.in_check()) {
        notation = move.san + '+';
    } else {
        notation = move.san;
    }
    
    return notation;
}

// Display move history
function displayMoveHistory() {
    const historyElement = document.getElementById('moveHistory');
    historyElement.innerHTML = '';
    
    let currentRow = null;
    
    moveHistory.forEach((historyItem, index) => {
        if (index % 2 === 0) {
            // Create new row for each pair of moves (white and black)
            currentRow = document.createElement('li');
            currentRow.className = 'move-row';
            currentRow.innerHTML = `<span class="move-number">${historyItem.number}.</span> <span class="white-move">${historyItem.move}</span>`;
            historyElement.appendChild(currentRow);
        } else {
            // Add black move to current row
            const blackMove = document.createElement('span');
            blackMove.className = 'black-move';
            blackMove.textContent = historyItem.move;
            currentRow.appendChild(blackMove);
        }
    });
    
    // Scroll to end of move history
    historyElement.scrollTop = historyElement.scrollHeight;
}

// Clear move history
function clearMoveHistory() {
    moveHistory = [];
    document.getElementById('moveHistory').innerHTML = '';
}

// Set up timers
function setupTimers() {
    timeLeft.player = gameTime;
    timeLeft.ai = gameTime;
    document.getElementById('playerTimer').textContent = formatTime(timeLeft.player);
    document.getElementById('aiTimer').textContent = formatTime(timeLeft.ai);
}

// Format time
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

// Start player timer
function startPlayerTimer() {
    if (!gameActive) return;
    
    clearInterval(playerTimer);
    playerTimer = setInterval(() => {
        timeLeft.player--;
        document.getElementById('playerTimer').textContent = formatTime(timeLeft.player);
        
        if (timeLeft.player <= 0) {
            clearInterval(playerTimer);
            updateStatus("Time's up! You lost.");
            showGameOverModal("Time's up! You lost.");
            updateScores(false);
            gameActive = false;
        }
    }, 1000);
}

// Pause player timer
function pausePlayerTimer() {
    clearInterval(playerTimer);
}

// Start computer timer
function startAITimer() {
    if (!gameActive) return;
    
    clearInterval(aiTimer);
    aiTimer = setInterval(() => {
        timeLeft.ai--;
        document.getElementById('aiTimer').textContent = formatTime(timeLeft.ai);
        
        if (timeLeft.ai <= 0) {
            clearInterval(aiTimer);
            updateStatus("Time's up! You won.");
            showGameOverModal("Time's up! You won.");
            updateScores(true);
            gameActive = false;
        }
    }, 1000);
}

// Pause computer timer
function pauseAITimer() {
    clearInterval(aiTimer);
}

// Clear all timers
function clearTimers() {
    clearInterval(playerTimer);
    clearInterval(aiTimer);
}

// Show best move hint
function showHint() {
    if (!gameActive) return;
    
    // Find best move for player
    const bestMove = getBestMove(game, 2);
    const hintMove = game.move(bestMove);
    
    // Show move on board
    board.position(game.fen());
    
    // Return to previous state
    setTimeout(() => {
        game.undo();
        board.position(game.fen());
        
        // Send move to chat
        sendMessageToAI(`Best move in this situation: ${getMoveNotation(hintMove)}. Why is this move good?`);
    }, 1000);
}

// Undo move
function undoMove() {
    if (!gameActive || game.history().length < 2) return;
    
    // Go back two moves (player and computer)
    game.undo(); // Undo computer move
    game.undo(); // Undo player move
    
    // Update board
    board.position(game.fen());
    
    // Update move history
    moveHistory.pop();
    moveHistory.pop();
    displayMoveHistory();
    
    // Update game status
    updateStatus();
    
    // Send message to chat
    sendMessageToAI("Last two moves back. What advice do you have in this situation?");
}

// Add message to chat
function addChatMessage(message, sender) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageElement = document.createElement('div');
    messageElement.className = `chat-message ${sender}-message`;
    messageElement.textContent = message;
    messagesContainer.appendChild(messageElement);
    
    // Scroll to end of chat
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Send message to OpenAI API
// Modified sendMessageToAI function - needs to be replaced in chess_AI.js
async function sendMessageToAI(message) {
    // If chat is disabled, don't send messages
    if (window.chatEnabled === false) {
        return;
    }
    
    // Add player message to chat
    addChatMessage(message, 'user');
    
    // Show loader
    document.getElementById('chatLoader').style.display = 'block';
    
    try {
        // This part sends the message to OpenAI API
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    {
                        "role": "system",
                        "content": `You are an expert chess coach who respond in English.
        
First provide analysis in English. Follow these guidelines:

1. Don't just suggest the best move - explain WHY it's strong and the strategic thinking behind it
2. Always provide 2-3 alternative moves with their advantages/disadvantages
3. Analyze the opponent's likely responses and how to counter them
4. Point out any tactical opportunities (forks, pins, discoveries, etc.)
5. Highlight any mistakes in previous moves as learning opportunities
6. Focus on teaching chess principles and improving the player's understanding
7. Keep explanations accessible to intermediate players while introducing advanced concepts
8. Consider the overall game situation including material balance, king safety, and pawn structure`
                    },
                    {
                        "role": "user",
                        "content": message
                    }
                ],
                max_tokens: 150
            })
        });
        
        const data = await response.json();
        
        // Get response from API
        const aiResponse = data.choices[0].message.content;
        
        // Add AI response to chat
        addChatMessage(aiResponse, 'bot');
    } catch (error) {
        console.error('Error connecting to OpenAI API:', error);
        addChatMessage("Sorry, there's an error connecting to the chess analyzer. Please try again later.", 'bot');
    }
    
    // Hide loader
    document.getElementById('chatLoader').style.display = 'none';
}

// Time selection events
document.querySelectorAll('.time-btn').forEach(button => {
    button.addEventListener('click', () => {
        // Remove active from all buttons
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active to selected button
        button.classList.add('active');
        
        // Select time
        const minutes = parseInt(button.getAttribute('data-time'));
        gameTime = minutes * 60;
        
        // Update time display
        document.getElementById('playerTimer').textContent = formatTime(gameTime);
        document.getElementById('aiTimer').textContent = formatTime(gameTime);
        
        // Update time left
        timeLeft.player = gameTime;
        timeLeft.ai = gameTime;
    });
});

// Event for starting new game after closing game over modal
window.addEventListener('click', (e) => {
    const modal = document.getElementById('gameOverModal');
    if (e.target === modal) {
        modal.style.display = 'none';
        newGame();
    }
});

// Pawn promotion event (you can expand this in the future)
function handlePromotion(source, target) {
    // Add pawn promotion code here
    // For now, we simply choose queen
    return 'q'; // q for queen
}

// Start game when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Initially chat is enabled (since chat container is visible by default)
    window.chatEnabled = true;
    
    // Other initialization code...
    initializeBoard();
    newGame();
});
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('newGameBtn').addEventListener('click', newGame);
document.getElementById('hintBtn').addEventListener('click', showHint);
document.getElementById('undoBtn').addEventListener('click', undoMove);
document.getElementById('newGameModalBtn').addEventListener('click', () => {
    document.getElementById('gameOverModal').style.display = 'none';
    newGame();
});

// Event for sending message in chat
document.getElementById('sendBtn').addEventListener('click', () => {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    
    if (message) {
        sendMessageToAI(message);
        chatInput.value = '';
    }
});

// Event for sending message with Enter key
document.getElementById('chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const chatInput = document.getElementById('chatInput');
        const message = chatInput.value.trim();
        
        if (message) {
            sendMessageToAI(message);
            chatInput.value = '';
        }
    }
});

// Difficulty level selection events
document.querySelectorAll('.difficulty-btn').forEach(button => {
    button.addEventListener('click', () => {
        // Remove active from all buttons
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active to selected button
        button.classList.add('active');
        
        // Select difficulty level
        difficulty = button.getAttribute('data-level');
    });
});

// Dark mode management
function toggleDarkMode() {
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = themeToggle.querySelector('i');
    
    // Toggle mode
    body.classList.toggle('dark-mode');
    
    // Change icon
    if (body.classList.contains('dark-mode')) {
        themeIcon.className = 'fas fa-sun';
        localStorage.setItem('theme', 'dark');
    } else {
        themeIcon.className = 'fas fa-moon';
        localStorage.setItem('theme', 'light');
    }
    
    // Update chess board
    if (board) {
        // Save current position
        const currentPosition = board.position();
        
        // Recreate chess board
        board = Chessboard('board', config);
        board.position(currentPosition);
    }
}
// Load saved theme
function loadSavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('themeToggle').querySelector('i').className = 'fas fa-sun';
    }
}

// Events for dark mode
document.addEventListener('DOMContentLoaded', (event) => {
    // Load saved theme
    loadSavedTheme();
    
    // Click event for mode change button
    document.getElementById('themeToggle').addEventListener('click', toggleDarkMode);
});

// Add this code to your chess_AI.js file

// Logout functionality
document.addEventListener('DOMContentLoaded', function() {
    // Get the logout button
    const logoutBtn = document.getElementById('logoutBtn');
    
    // Add click event listener to logout button
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            // Import Firebase auth if it's not already available
            if (typeof firebase === 'undefined' || !firebase.auth) {
                // Load Firebase scripts if not already loaded
                const script1 = document.createElement('script');
                script1.src = 'https://cdnjs.cloudflare.com/ajax/libs/firebase/9.22.0/firebase-app-compat.js';
                document.head.appendChild(script1);
                
                const script2 = document.createElement('script');
                script2.src = 'https://cdnjs.cloudflare.com/ajax/libs/firebase/9.22.0/firebase-auth-compat.js';
                script2.onload = initializeFirebaseAndLogout;
                document.head.appendChild(script2);
            } else {
                // Firebase is already loaded
                performLogout();
            }
        });
    }
    
    // Check if user is logged in
    checkAuthState();
});

function initializeFirebaseAndLogout() {
    // Initialize Firebase with the same config from login.html
    const firebaseConfig = {
        apiKey: "AIzaSyDIoNvW1wHk-5qlTGrnnlfMIGZfEN-ucg8",
        authDomain: "id-kurdm-ai.firebaseapp.com",
        projectId: "id-kurdm-ai",
        storageBucket: "id-kurdm-ai.appspot.com",
        messagingSenderId: "500724816364",
        appId: "1:500724816364:web:0159636245557a07c7c8c9"
    };

    // Initialize Firebase if it's not already initialized
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    
    performLogout();
}

function performLogout() {
    firebase.auth().signOut().then(() => {
        // Sign-out successful
        console.log("User signed out successfully");
        // Redirect to login page
        window.location.href = 'login.html';
    }).catch((error) => {
        // An error happened
        console.error("Error signing out:", error);
    });
}

function checkAuthState() {
    // Add this to check if the user is authenticated
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged(function(user) {
            if (!user) {
                // No user is signed in, redirect to login
                window.location.href = 'login.html';
            } else {
                // User is signed in, update UI
                updateUserInfo(user);
            }
        });
    } else {
        // If Firebase isn't loaded yet, wait and try again
        setTimeout(checkAuthState, 500);
    }
}

function updateUserInfo(user) {
    // Update UI with user info
    const userName = document.getElementById('userName');
    const userInitials = document.getElementById('userInitials');
    
    if (userName && user.displayName) {
        userName.textContent = user.displayName;
    }
    
    if (userInitials && user.displayName) {
        // Get the first letter of each word in the name for initials
        const initials = user.displayName
            .split(' ')
            .map(name => name.charAt(0))
            .join('')
            .toUpperCase();
        userInitials.textContent = initials;
    }
}

// Initialize Firebase when the page loads
if (typeof firebase === 'undefined') {
    // Load Firebase scripts
    const script1 = document.createElement('script');
    script1.src = 'https://cdnjs.cloudflare.com/ajax/libs/firebase/9.22.0/firebase-app-compat.js';
    document.head.appendChild(script1);
    
    const script2 = document.createElement('script');
    script2.src = 'https://cdnjs.cloudflare.com/ajax/libs/firebase/9.22.0/firebase-auth-compat.js';
    script2.onload = function() {
        // Initialize Firebase
        const firebaseConfig = {
            apiKey: "AIzaSyDIoNvW1wHk-5qlTGrnnlfMIGZfEN-ucg8",
            authDomain: "id-kurdm-ai.firebaseapp.com",
            projectId: "id-kurdm-ai",
            storageBucket: "id-kurdm-ai.appspot.com",
            messagingSenderId: "500724816364",
            appId: "1:500724816364:web:0159636245557a07c7c8c9"
        };
        
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        
        // Check authentication state
        checkAuthState();
    };
    document.head.appendChild(script2);
} else {
    // Firebase is already loaded, check auth state
    checkAuthState();
}
  // Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyDIoNvW1wHk-5qlTGrnnlfMIGZfEN-ucg8",
    authDomain: "id-kurdm-ai.firebaseapp.com",
    projectId: "id-kurdm-ai",
    storageBucket: "id-kurdm-ai.appspot.com",
    messagingSenderId: "500724816364",
    appId: "1:500724816364:web:0159636245557a07c7c8c9"
};




// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// DOM Elements
const loginView = document.getElementById('loginView');
const signupView = document.getElementById('signupView');
const forgotPassView = document.getElementById('forgotPassView');
const showSignupLink = document.getElementById('showSignupLink');
const showLoginFromSignup = document.getElementById('showLoginFromSignup');
const showForgotPassLink = document.getElementById('showForgotPassLink');
const showLoginFromForgot = document.getElementById('showLoginFromForgot');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const forgotPassForm = document.getElementById('forgotPassForm');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const alertBox = document.getElementById('alertBox');
const themeToggle = document.getElementById('themeToggle');

// Admin email
const ADMIN_EMAIL = 'hamasuan@gmail.com';

// Show views
function showView(viewToShow) {
    [loginView, signupView, forgotPassView].forEach(view => {
        view.classList.remove('active');
    });
    viewToShow.classList.add('active');
}

// Toggle between views
showSignupLink.addEventListener('click', (e) => {
    e.preventDefault();
    showView(signupView);
});

showLoginFromSignup.addEventListener('click', (e) => {
    e.preventDefault();
    showView(loginView);
});

showForgotPassLink.addEventListener('click', (e) => {
    e.preventDefault();
    showView(forgotPassView);
});

showLoginFromForgot.addEventListener('click', (e) => {
    e.preventDefault();
    showView(loginView);
});

// Display alert messages
function showAlert(message, type) {
    alertBox.textContent = message;
    alertBox.className = `alert alert-${type}`;
    alertBox.style.display = 'block';

    setTimeout(() => {
        alertBox.style.display = 'none';
    }, 5000);
}

// Login Form Handling
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Successfully logged in
            const user = userCredential.user;

            // Redirect based on user email
            if (user.email === ADMIN_EMAIL) {
                window.location.href = 'chess_AI.html';
            } else {
                window.location.href = 'chess_AI.html';
            }
        })
        .catch((error) => {
            // Handle errors
            let errorMessage;
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'ئەم ئیمەیلە بوونی نییە';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'وشەی نهێنی هەڵەیە';
                    break;
                case 'auth/invalid-credential':
                    errorMessage = 'زانیاری هەڵەیە، تکایە دووبارە هەوڵبدەوە';
                    break;
                default:
                    errorMessage = 'هەڵەیەک ڕوویدا: ' + error.message;
            }
            showAlert(errorMessage, 'danger');
        });
});

// Signup Form Handling
signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;

    // Password validation
    if (password !== confirmPassword) {
        showAlert('وشەی نهێنی یەک ناگرێتەوە', 'danger');
        return;
    }

    if (password.length < 6) {
        showAlert('وشەی نهێنی دەبێت لانیکەم ٦ پیت بێت', 'danger');
        return;
    }

    // Create user
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Successfully created user
            const user = userCredential.user;
            
            // Update profile with name
            return user.updateProfile({
                displayName: name
            }).then(() => {
                // Redirect to chess game
                window.location.href = 'chess_AI.html';
            });
        })
        .catch((error) => {
            // Handle errors
            let errorMessage;
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'ئەم ئیمەیلە پێشتر بەکارهاتووە';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'فۆرماتی ئیمەیل هەڵەیە';
                    break;
                default:
                    errorMessage = 'هەڵەیەک ڕوویدا: ' + error.message;
            }
            showAlert(errorMessage, 'danger');
        });
});

// Forgot Password Form Handling
forgotPassForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const email = document.getElementById('forgotPassEmail').value;

    auth.sendPasswordResetEmail(email)
        .then(() => {
            // Email sent
            showAlert('لینکی نوێکردنەوەی وشەی نهێنی نێردرا بۆ ئیمەیلەکەت', 'success');
            showView(loginView);
        })
        .catch((error) => {
            // Handle errors
            let errorMessage;
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'ئەم ئیمەیلە بوونی نییە';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'فۆرماتی ئیمەیل هەڵەیە';
                    break;
                default:
                    errorMessage = 'هەڵەیەک ڕوویدا: ' + error.message;
            }
            showAlert(errorMessage, 'danger');
        });
});

// Google Login
googleLoginBtn.addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    
    auth.signInWithPopup(provider)
        .then((result) => {
            // Successfully logged in with Google
            const user = result.user;

            // Redirect based on user email
            if (user.email === ADMIN_EMAIL) {
                window.location.href = 'chess_admin.html';
            } else {
                window.location.href = 'chess_AI.html';
            }
        })
        .catch((error) => {
            showAlert('هەڵەیەک ڕوویدا لە کاتی چوونە ژوورەوە بە گووگڵ', 'danger');
            console.error('Google sign in error:', error);
        });
});

// Dark mode toggle
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    
    // Update icon
    const icon = themeToggle.querySelector('i');
    if (document.body.classList.contains('dark-mode')) {
        icon.className = 'fas fa-sun';
    } else {
        icon.className = 'fas fa-moon';
    }
    
    // Save preference
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
});

// Check for saved theme preference
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        themeToggle.querySelector('i').className = 'fas fa-sun';
    }
    
    // Check for logged in user
    auth.onAuthStateChanged((user) => {
        if (user) {
            // User is already logged in, redirect
            if (user.email === ADMIN_EMAIL) {
                window.location.href = 'chess_admin.html';
            } else {
                window.location.href = 'chess_AI.html';
            }
        }
    });
});



















