// State
let currentChat = null;
let isGenerating = false;
let selectedMode = null; // 'freeflow' or 'guided'
let conversationState = null; // For guided mode state

// DOM Elements
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const messagesContainer = document.getElementById('messagesContainer');
const historyList = document.getElementById('historyList');
const historyToggle = document.getElementById('historyToggle');
const chevronIcon = document.getElementById('chevronIcon');
const newChatBtn = document.getElementById('newChatBtn');
const modeSelect = document.getElementById('modeSelect');
const llmCountSelect = document.getElementById('llmCountSelect');

// API Base URL
const API_BASE = window.location.origin;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadChatHistory();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    // Send button
    sendBtn.addEventListener('click', handleSend);

    // Enter to send (Shift+Enter for new line)
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });

    // Auto-resize textarea
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = userInput.scrollHeight + 'px';
        updateSendButton();
    });

    // Toggle chat history
    historyToggle.addEventListener('click', toggleHistory);

    // New chat button
    newChatBtn.addEventListener('click', startNewChat);
}

// Update send button state
function updateSendButton() {
    const hasText = userInput.value.trim().length > 0;
    sendBtn.disabled = !hasText || isGenerating;
}

// Handle send message
async function handleSend() {
    const idea = userInput.value.trim();
    if (!idea || isGenerating) return;

    // Get settings from dropdowns
    const mode = modeSelect.value;
    const llmCount = parseInt(llmCountSelect.value);

    // Set selectedMode for state management
    selectedMode = mode;

    // Initialize conversation state for guided mode if not already set
    if (mode === 'guided' && !conversationState) {
        conversationState = { step: 'initial' };
    }

    // Route to appropriate handler based on mode
    if (mode === 'guided') {
        await handleGuidedModeInput(idea);
    } else {
        await handleFreeFlowMode(idea, llmCount);
    }
}

// Handle Free Flow mode
async function handleFreeFlowMode(idea, llmCount) {
    // Clear input
    userInput.value = '';
    userInput.style.height = 'auto';
    updateSendButton();

    // Remove welcome message if present
    const welcomeMsg = messagesContainer.querySelector('.welcome-message');
    if (welcomeMsg) {
        welcomeMsg.remove();
    }

    // Add user message
    addMessage('user', idea);

    // Show loading
    const loadingId = showLoading();
    isGenerating = true;
    updateSendButton();

    try {
        // Call API
        const response = await fetch(`${API_BASE}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ idea, llmCount }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to generate plan');
        }

        const data = await response.json();
        console.log('API response:', data);

        // Remove loading
        removeLoading(loadingId);

        // Validate response has content
        if (!data.content) {
            console.error('API returned no content:', data);
            addMessage('assistant', 'Error: No content received from server');
            return;
        }

        // Add assistant message with the content
        addMessage('assistant', data.content);

        // Only update chat history and current chat for full product plans
        if (!data.isSimpleResponse) {
            // Update current chat
            currentChat = {
                filename: data.filename,
                idea: idea,
                content: data.content,
            };

            // Reload chat history
            await loadChatHistory();
        } else {
            console.log('Simple response - not saving to history');
        }

    } catch (error) {
        removeLoading(loadingId);
        addMessage('assistant', `Error: ${error.message}`);
        console.error('Error:', error);
    } finally {
        isGenerating = false;
        updateSendButton();
    }
}

// Handle Guided mode
async function handleGuidedMode(input) {
    // Clear input
    userInput.value = '';
    userInput.style.height = 'auto';
    updateSendButton();

    // Add user message
    addMessage('user', input);

    // Show loading
    const loadingId = showLoading();
    isGenerating = true;
    updateSendButton();

    try {
        if (conversationState.step === 'initial') {
            // Start guided session
            const response = await fetch(`${API_BASE}/api/guided/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idea: input }),
            });

            if (!response.ok) throw new Error('Failed to start guided session');

            const data = await response.json();

            // Store state
            conversationState = {
                step: 'select_stack',
                idea: input,
                expandedIdea: data.expandedIdea,
                techStacks: data.techStacks,
            };

            // Remove loading
            removeLoading(loadingId);

            // Show tech stack options
            showTechStackOptions(data.techStacks);

        } else if (conversationState.step === 'answer_questions') {
            // Store answer
            const currentQ = conversationState.currentQuestionIndex;
            conversationState.answers = conversationState.answers || [];
            conversationState.answers[currentQ] = input;

            // Check if more questions
            if (currentQ + 1 < conversationState.questions.length) {
                conversationState.currentQuestionIndex++;
                removeLoading(loadingId);
                askNextQuestion();
            } else {
                // All questions answered, generate final plan
                const questionsAndAnswers = conversationState.questions.map((q, i) => ({
                    question: q,
                    answer: conversationState.answers[i] || 'No answer provided',
                }));

                const response = await fetch(`${API_BASE}/api/guided/complete`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        idea: conversationState.idea,
                        expandedIdea: conversationState.expandedIdea,
                        selectedStack: conversationState.selectedStack,
                        questionsAndAnswers,
                    }),
                });

                if (!response.ok) throw new Error('Failed to complete session');

                const data = await response.json();

                removeLoading(loadingId);
                addMessage('assistant', data.content);

                // Save to history
                currentChat = {
                    filename: data.filename,
                    content: data.content,
                };
                await loadChatHistory();

                // Reset state
                conversationState = null;
                selectedMode = null;
            }
        }

    } catch (error) {
        removeLoading(loadingId);
        addMessage('assistant', `Error: ${error.message}`);
        console.error('Error:', error);
    } finally {
        isGenerating = false;
        updateSendButton();
    }
}

// Add message to chat
function addMessage(role, content) {
    // Validate content
    if (content === undefined || content === null) {
        console.error('addMessage received invalid content:', content);
        content = 'Error: No content received';
    }

    // Convert to string if it's an object
    if (typeof content === 'object') {
        console.warn('addMessage received object instead of string:', content);
        content = JSON.stringify(content, null, 2);
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;

    const header = document.createElement('div');
    header.className = 'message-header';

    const label = document.createElement('div');
    label.className = 'message-label';
    label.textContent = role === 'user' ? 'You' : 'PM Assist';

    header.appendChild(label);

    // Add copy button for assistant messages
    if (role === 'assistant') {
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 4V12C4 12.5523 4.44772 13 5 13H11C11.5523 13 12 12.5523 12 12V4M4 4H3C2.44772 4 2 3.55228 2 3C2 2.44772 2.44772 2 3 2H6M4 4H12M12 4H13C13.5523 4 14 3.55228 14 3C14 2.44772 13.5523 2 13 2H10M6 2V3M10 2V3M6 2C6 1.44772 6.44772 1 7 1H9C9.55228 1 10 1.44772 10 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
        copyBtn.title = 'Copy to clipboard';
        copyBtn.onclick = () => copyToClipboard(content, copyBtn);
        header.appendChild(copyBtn);
    }

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    // Render content with basic markdown support
    contentDiv.innerHTML = renderMarkdown(content);

    messageDiv.appendChild(header);
    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Basic markdown rendering
function renderMarkdown(text) {
    // Handle undefined, null, or non-string inputs
    if (!text || typeof text !== 'string') {
        console.error('renderMarkdown received invalid input:', text);
        return 'Error: Invalid content';
    }

    // Remove appendix section (keep in file, but don't show in UI)
    let html = text.replace(/---\s*\n+## Appendix:[\s\S]*$/m, '');
    html = html.trim();

    // Escape HTML first
    html = html.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;');

    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Code blocks
    html = html.replace(/```([\s\S]+?)```/g, '<pre><code>$1</code></pre>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>');

    // Wrap consecutive list items
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // Paragraphs (line breaks)
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';

    // Single line breaks
    html = html.replace(/\n/g, '<br>');

    return html;
}

// Copy to clipboard
async function copyToClipboard(text, button) {
    try {
        await navigator.clipboard.writeText(text);

        // Visual feedback
        const originalHTML = button.innerHTML;
        button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M13 4L6 11L3 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
        button.style.color = '#10a37f';

        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.style.color = '';
        }, 2000);
    } catch (error) {
        console.error('Failed to copy:', error);
    }
}

// Show loading indicator
function showLoading() {
    const loadingDiv = document.createElement('div');
    const loadingId = 'loading-' + Date.now();
    loadingDiv.id = loadingId;
    loadingDiv.className = 'message assistant';

    const header = document.createElement('div');
    header.className = 'message-header';

    const label = document.createElement('div');
    label.className = 'message-label';
    label.textContent = 'PM Assist';

    header.appendChild(label);

    const loadingDots = document.createElement('div');
    loadingDots.className = 'loading';
    loadingDots.innerHTML = '<div class="loading-dot"></div><div class="loading-dot"></div><div class="loading-dot"></div>';

    loadingDiv.appendChild(header);
    loadingDiv.appendChild(loadingDots);
    messagesContainer.appendChild(loadingDiv);

    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    return loadingId;
}

// Remove loading indicator
function removeLoading(loadingId) {
    const loadingDiv = document.getElementById(loadingId);
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

// Load chat history
async function loadChatHistory() {
    try {
        const response = await fetch(`${API_BASE}/api/files`);
        const data = await response.json();

        historyList.innerHTML = '';

        if (data.files.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'history-item';
            emptyMsg.style.opacity = '0.5';
            emptyMsg.style.cursor = 'default';
            emptyMsg.textContent = 'No chats yet';
            historyList.appendChild(emptyMsg);
            return;
        }

        data.files.forEach((filename) => {
            const itemWrapper = document.createElement('div');
            itemWrapper.className = 'history-item-wrapper';

            const item = document.createElement('button');
            item.className = 'history-item';
            item.textContent = formatFilename(filename);
            item.onclick = (e) => {
                e.stopPropagation();
                loadChat(filename, itemWrapper.querySelector('.history-item'));
            };

            if (currentChat && currentChat.filename === filename) {
                item.classList.add('active');
            }

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M1 3.5H13M5.5 1H8.5M5.5 6V10.5M8.5 6V10.5M2 3.5H12V12C12 12.5523 11.5523 13 11 13H3C2.44772 13 2 12.5523 2 12V3.5Z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
            deleteBtn.title = 'Delete conversation';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                deleteChat(filename);
            };

            itemWrapper.appendChild(item);
            itemWrapper.appendChild(deleteBtn);
            historyList.appendChild(itemWrapper);
        });
    } catch (error) {
        console.error('Error loading chat history:', error);
    }
}

// Load a specific chat
async function loadChat(filename, targetElement) {
    try {
        const response = await fetch(`${API_BASE}/api/files/${filename}`);

        if (!response.ok) {
            throw new Error(`Failed to load file: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Loaded chat data:', data);

        // Validate data
        if (!data.content) {
            throw new Error('No content in response');
        }

        // Clear messages
        messagesContainer.innerHTML = '';

        // Extract original idea from the markdown content
        const originalIdea = extractOriginalIdea(data.content);

        // Add user's original message if found
        if (originalIdea) {
            addMessage('user', originalIdea);
        }

        // Add the full content as assistant message
        addMessage('assistant', data.content);

        // Update current chat
        currentChat = { filename, content: data.content };

        // Update active state
        document.querySelectorAll('.history-item').forEach((item) => {
            item.classList.remove('active');
        });

        if (targetElement) {
            targetElement.classList.add('active');
        }

    } catch (error) {
        console.error('Error loading chat:', error);
        messagesContainer.innerHTML = '';
        addMessage('assistant', `Error loading chat: ${error.message}`);
    }
}

// Extract original idea from markdown content
function extractOriginalIdea(markdown) {
    // Look for "### Original Idea" section in the appendix
    const match = markdown.match(/### Original Idea\s*\n(.+?)(?=\n###|$)/s);
    if (match && match[1]) {
        return match[1].trim();
    }
    return null;
}

// Start new chat
function startNewChat() {
    currentChat = null;
    selectedMode = null;
    conversationState = null;

    messagesContainer.innerHTML = `
        <div class="welcome-message">
            <h1>Welcome to PM Assist</h1>
            <p>Transform your rough product ideas into comprehensive product plans.</p>
            <p>Choose your mode and LLM count below, then describe your product idea to get started.</p>
        </div>
    `;

    // Clear active state
    document.querySelectorAll('.history-item').forEach((item) => {
        item.classList.remove('active');
    });

    userInput.focus();
}

// Toggle chat history
function toggleHistory() {
    historyList.classList.toggle('collapsed');
    chevronIcon.classList.toggle('collapsed');
}

// Delete a chat
async function deleteChat(filename) {
    if (!confirm('Are you sure you want to delete this conversation?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/files/${filename}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error('Failed to delete file');
        }

        // If we're viewing the deleted chat, clear the view
        if (currentChat && currentChat.filename === filename) {
            startNewChat();
        }

        // Reload chat history
        await loadChatHistory();

    } catch (error) {
        console.error('Error deleting chat:', error);
        alert('Failed to delete conversation. Please try again.');
    }
}

// Show tech stack options
function showTechStackOptions(techStacks) {
    let message = "Great! Based on your idea, here are some technology stack options:\n\n";

    techStacks.forEach((stack, index) => {
        message += `**${index + 1}. ${stack.name}**\n`;
        message += `${stack.description}\n\n`;
        message += `**Technologies:** ${stack.technologies.join(', ')}\n\n`;
        message += `**Pros:**\n`;
        stack.pros.forEach(pro => message += `- ${pro}\n`);
        message += `\n**Cons:**\n`;
        stack.cons.forEach(con => message += `- ${con}\n`);
        message += `\n---\n\n`;
    });

    message += `\nType the number (1-${techStacks.length}) to select a stack, or type "auto" to let me choose the best fit for you.`;

    addMessage('assistant', message);

    // Update state to wait for selection
    conversationState.step = 'awaiting_stack_selection';
}

// Handle tech stack selection
async function selectTechStack(selection) {
    const stacks = conversationState.techStacks;

    let selectedStack;

    if (selection.toLowerCase() === 'auto') {
        // Auto-select the first one (or could use LLM to decide)
        selectedStack = stacks[0];
        addMessage('assistant', `I've selected **${selectedStack.name}** as the best fit for your project. Let's continue!`);
    } else {
        const index = parseInt(selection) - 1;
        if (index >= 0 && index < stacks.length) {
            selectedStack = stacks[index];
            addMessage('assistant', `Great choice! We'll use **${selectedStack.name}**. Moving to the next step...`);
        } else {
            addMessage('assistant', `Please enter a valid number (1-${stacks.length}) or "auto".`);
            return false;
        }
    }

    // Show loading
    const loadingId = showLoading();
    isGenerating = true;
    updateSendButton();

    try {
        // Get questions
        const response = await fetch(`${API_BASE}/api/guided/select-stack`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                idea: conversationState.idea,
                expandedIdea: conversationState.expandedIdea,
                selectedStack,
            }),
        });

        if (!response.ok) throw new Error('Failed to get questions');

        const data = await response.json();

        conversationState.selectedStack = selectedStack;
        conversationState.questions = data.questions;
        conversationState.answers = [];
        conversationState.currentQuestionIndex = 0;
        conversationState.step = 'answer_questions';

        removeLoading(loadingId);
        askNextQuestion();

    } catch (error) {
        removeLoading(loadingId);
        addMessage('assistant', `Error: ${error.message}`);
    } finally {
        isGenerating = false;
        updateSendButton();
    }

    return true;
}

// Ask next question
function askNextQuestion() {
    const q = conversationState.questions[conversationState.currentQuestionIndex];
    const total = conversationState.questions.length;
    const current = conversationState.currentQuestionIndex + 1;

    addMessage('assistant', `**Question ${current}/${total}:**\n\n${q}`);
}

// Update handleGuidedMode to handle stack selection
async function handleGuidedModeInput(input) {
    if (conversationState.step === 'awaiting_stack_selection') {
        // User is selecting tech stack
        userInput.value = '';
        userInput.style.height = 'auto';
        updateSendButton();

        addMessage('user', input);
        await selectTechStack(input);
    } else {
        // Normal flow
        await handleGuidedMode(input);
    }
}

// Format filename for display
function formatFilename(filename) {
    // Extract date/time from filename like "product-plan-2025-12-12-12-57-36.md"
    const match = filename.match(/product-plan-(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})\.md/);
    if (match) {
        const [, year, month, day, hour, minute, second] = match;
        const date = new Date(year, month - 1, day, hour, minute, second);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }
    return filename;
}
