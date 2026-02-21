// Get API URL from config (works with localhost and production)
const getApiUrl = () => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:5000';
    }
    if (window.location.hostname.includes('onrender.com')) {
        return 'https://chat-app-backend.onrender.com';
    }
    return 'http://localhost:5000';
};

const API_URL = getApiUrl();
console.log(`🚀 API Server: ${API_URL}`);

const socket1 = io(API_URL);
const socket2 = io(API_URL);

const users = {
    1: { socket: socket1, currentUser: null, token: null, currentConversationId: null, conversations: [] },
    2: { socket: socket2, currentUser: null, token: null, currentConversationId: null, conversations: [] }
};

// --- Auth Functions ---

function togglePasswordVisibility(userNum) {
    const passwordInput = document.getElementById(`password-${userNum}`);
    const toggleBtn = document.querySelectorAll('.password-toggle')[userNum === 1 ? 0 : 1];
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleBtn.textContent = '🙈';
    } else {
        passwordInput.type = 'password';
        toggleBtn.textContent = '👁️';
    }
}

function showAuthMessage(userNum, message, type) {
    const msgEl = document.getElementById(`auth-message-${userNum}`);
    msgEl.textContent = message;
    msgEl.className = `auth-message show ${type}`;
    setTimeout(() => {
        if (type !== 'success') {
            msgEl.classList.remove('show');
        }
    }, 5000);
}

function setButtonLoading(buttonId, isLoading) {
    const btn = document.getElementById(buttonId);
    btn.disabled = isLoading;
    btn.classList.toggle('loading', isLoading);
}

async function login(userNum) {
    const email = document.getElementById(`email-${userNum}`).value.trim();
    const password = document.getElementById(`password-${userNum}`).value.trim();

    if (!email || !password) {
        showAuthMessage(userNum, '❌ Please enter both email and password', 'error');
        return;
    }

    setButtonLoading(`login-btn-${userNum}`, true);
    showAuthMessage(userNum, '🔄 Logging in...', 'loading');

    try {
        const res = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok) {
            users[userNum].token = data.token;
            users[userNum].currentUser = data.user;
            
            showAuthMessage(userNum, `✅ Welcome ${data.user.name}!`, 'success');
            
            setTimeout(() => {
                document.getElementById(`login-screen-${userNum}`).style.display = 'none';
                document.getElementById(`chat-screen-${userNum}`).style.display = 'flex';
                
                document.getElementById(`chat-input-${userNum}`).addEventListener("keypress", function(event) {
                    if (event.key === "Enter") {
                        sendMessage(userNum);
                    }
                });
                fetchUsers(userNum);
            }, 1500);
        } else {
            showAuthMessage(userNum, `❌ ${data.message || 'Login failed'}`, 'error');
        }
    } catch (error) {
        showAuthMessage(userNum, `❌ Connection error: ${error.message}`, 'error');
    } finally {
        setButtonLoading(`login-btn-${userNum}`, false);
    }
}

async function register(userNum) {
    const name = document.getElementById(`username-${userNum}`).value.trim();
    const email = document.getElementById(`email-${userNum}`).value.trim();
    const password = document.getElementById(`password-${userNum}`).value.trim();

    if (!name || !email || !password) {
        showAuthMessage(userNum, '❌ Please fill in all fields', 'error');
        return;
    }

    setButtonLoading(`register-btn-${userNum}`, true);
    showAuthMessage(userNum, '🔄 Creating account...', 'loading');

    try {
        const res = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const data = await res.json();

        if (res.ok) {
            showAuthMessage(userNum, `✅ Registered! You can now login.`, 'success');
        } else {
            showAuthMessage(userNum, `❌ ${data.message || 'Registration failed'}`, 'error');
        }
    } catch (error) {
        showAuthMessage(userNum, `❌ Connection error: ${error.message}`, 'error');
    } finally {
        setButtonLoading(`register-btn-${userNum}`, false);
    }
}

// --- Chat Functions ---

async function fetchUsers(userNum) {
    try {
        const res = await fetch(`${API_URL}/api/users`, {
            headers: { 'Authorization': `Bearer ${users[userNum].token}` }
        });
        
        const userList = await res.json();
        const userListEl = document.getElementById(`user-list-${userNum}`);
        userListEl.innerHTML = '';

        userList.forEach(user => {
            if (user._id === users[userNum].currentUser._id) return;
            
            const div = document.createElement('div');
            div.className = 'user-item';
            div.textContent = `👤 ${user.name}`;
            div.onclick = () => startConversation(userNum, user);
            userListEl.appendChild(div);
        });

        document.getElementById(`current-user-info-${userNum}`).textContent = `Logged in as: ${users[userNum].currentUser.name}`;
        
        // Load conversations list on the Conversations tab
        loadConversations(userNum);
    } catch (error) {
        console.error('Error fetching users:', error);
    }
}

async function startConversation(userNum, user) {
    try {
        const res = await fetch(`${API_URL}/api/conversations`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${users[userNum].token}`
            },
            body: JSON.stringify({ recipientId: user._id })
        });
        
        if (!res.ok) throw new Error('Failed to start conversation');
        
        const conversation = await res.json();
        users[userNum].currentConversationId = conversation._id;
        
        console.log(`User ${userNum} conversation ID set to:`, conversation._id);

        document.getElementById(`chat-header-${userNum}`).innerHTML = `<span>💬 ${user.name}</span>`;
        document.getElementById(`chat-messages-${userNum}`).innerHTML = '';

        // Join Socket.io room
        users[userNum].socket.emit('joinConversation', conversation._id);
        console.log(`User ${userNum} joined conversation room:`, conversation._id);
        
        // Load message history
        loadMessages(userNum, conversation._id);
    } catch (error) {
        console.error('Error starting conversation:', error);
        showAuthMessage(userNum, '❌ Failed to start conversation', 'error');
    }
}

async function loadMessages(userNum, conversationId) {
    try {
        const res = await fetch(`${API_URL}/api/conversations/${conversationId}/messages`, {
            headers: { 'Authorization': `Bearer ${users[userNum].token}` }
        });
        
        const messages = await res.json();
        const chatMessages = document.getElementById(`chat-messages-${userNum}`);
        chatMessages.innerHTML = '';

        messages.forEach(msg => {
            const isRead = msg.readBy && msg.readBy.length > 0;
            const status = isRead ? 'read' : (msg.status || 'sent');
            addMessage(userNum, msg.text, msg.sender.name, msg.sender._id === users[userNum].currentUser._id ? "self" : "other", msg.createdAt, status);
        });
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

function sendMessage(userNum) {
    console.log(`User ${userNum} attempting to send message`);
    console.log(`Current conversation ID:`, users[userNum].currentConversationId);
    console.log(`Current user:`, users[userNum].currentUser);
    
    if (!users[userNum].currentConversationId) {
        showAuthMessage(userNum, '❌ Please select a user first!', 'error');
        return;
    }
    
    if (!users[userNum].currentUser) {
        showAuthMessage(userNum, '❌ You are not logged in!', 'error');
        return;
    }
    
    const input = document.getElementById(`chat-input-${userNum}`);
    const messageText = input.value.trim();
    
    console.log(`Message text:`, messageText);
    
    if (messageText === "") {
        console.log('Message is empty');
        return;
    }

    // Show message immediately on UI
    addMessage(userNum, messageText, users[userNum].currentUser.name, "self", null, "sent");

    // Emit via Socket.io
    console.log('Emitting sendMessage event...', {
        conversationId: users[userNum].currentConversationId,
        senderId: users[userNum].currentUser._id,
        text: messageText
    });

    users[userNum].socket.emit("sendMessage", {
        conversationId: users[userNum].currentConversationId,
        senderId: users[userNum].currentUser._id,
        text: messageText
    });
    
    input.value = '';
    input.focus();
}

function addMessage(userNum, text, senderName, senderType, timestamp, status = 'sent') {
    const chatMessages = document.getElementById(`chat-messages-${userNum}`);
    
    const emptyState = chatMessages.querySelector('.empty-state');
    if (emptyState) emptyState.remove();
    
    const message = document.createElement("div");
    message.classList.add("message", senderType);

    const nameTag = document.createElement("div");
    nameTag.classList.add("username");
    nameTag.textContent = senderName;

    const msgText = document.createElement("div");
    msgText.textContent = text;

    const timeTag = document.createElement("div");
    timeTag.classList.add("timestamp");
    const date = timestamp ? new Date(timestamp) : new Date();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    if (senderType === 'self') {
        const statusIcon = document.createElement("span");
        statusIcon.classList.add("status-icon", status);
        timeTag.innerHTML = `${timeStr} `;
        timeTag.appendChild(statusIcon);
    } else {
        timeTag.textContent = timeStr;
    }

    message.appendChild(nameTag);
    message.appendChild(msgText);
    message.appendChild(timeTag);
    chatMessages.appendChild(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function logout(userNum) {
    users[userNum].token = null;
    users[userNum].currentUser = null;
    users[userNum].currentConversationId = null;
    
    document.getElementById(`login-screen-${userNum}`).style.display = 'flex';
    document.getElementById(`chat-screen-${userNum}`).style.display = 'none';
    document.getElementById(`username-${userNum}`).value = '';
    document.getElementById(`email-${userNum}`).value = '';
    document.getElementById(`password-${userNum}`).value = '';
}

// Handle incoming messages for both users
socket1.on("message", (data) => {
    console.log('User 1 received message:', data);
    if (users[1].currentUser) {
        console.log('Adding message to User 1 chat');
        addMessage(1, data.text, data.sender, data.senderId === users[1].currentUser._id ? "self" : "other", data.createdAt, data.status || 'delivered');
    } else {
        console.log('User 1 not logged in, cannot display message');
    }
});

socket2.on("message", (data) => {
    console.log('User 2 received message:', data);
    if (users[2].currentUser) {
        console.log('Adding message to User 2 chat');
        addMessage(2, data.text, data.sender, data.senderId === users[2].currentUser._id ? "self" : "other", data.createdAt, data.status || 'delivered');
    } else {
        console.log('User 2 not logged in, cannot display message');
    }
});

// --- Delete Chat Function ---
async function deleteChat(userNum) {
    if (!users[userNum].currentConversationId) {
        showAuthMessage(userNum, '❌ No active chat to delete', 'error');
        return;
    }

    if (!confirm('Are you sure you want to delete this chat?')) {
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/conversations/${users[userNum].currentConversationId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${users[userNum].token}` }
        });

        if (res.ok) {
            showAuthMessage(userNum, '✅ Chat deleted successfully', 'success');
            
            // Clear the chat
            users[userNum].currentConversationId = null;
            document.getElementById(`chat-header-${userNum}`).innerHTML = `<span>Select a user to start chatting</span><button onclick="deleteChat(${userNum})" class="delete-btn" title="Delete chat">🗑️</button>`;
            document.getElementById(`chat-messages-${userNum}`).innerHTML = '<div class="empty-state"><p>👋 Select a user from the list to start a conversation</p></div>';
        } else {
            const data = await res.json();
            showAuthMessage(userNum, `❌ ${data.message || 'Failed to delete chat'}`, 'error');
        }
    } catch (error) {
        console.error('Error deleting chat:', error);
        showAuthMessage(userNum, `❌ Error: ${error.message}`, 'error');
    }
}

// --- Conversations Folder Functions ---

// Switch between Conversations and New Chat tabs
function switchTab(userNum, tab) {
    const tabBtns = document.querySelectorAll(`#chat-screen-${userNum} .tab-btn`);
    const conversationsList = document.getElementById(`conversations-list-${userNum}`);
    const userList = document.getElementById(`user-list-${userNum}`);

    tabBtns.forEach(btn => btn.classList.remove('active'));
    
    if (tab === 'conversations') {
        tabBtns[0].classList.add('active');
        conversationsList.style.display = 'block';
        userList.style.display = 'none';
        loadConversations(userNum);
    } else {
        tabBtns[1].classList.add('active');
        conversationsList.style.display = 'none';
        userList.style.display = 'block';
        fetchUsers(userNum);
    }
}

// Load all conversations for the user
async function loadConversations(userNum) {
    try {
        const res = await fetch(`${API_URL}/api/conversations`, {
            headers: { 'Authorization': `Bearer ${users[userNum].token}` }
        });

        if (!res.ok) throw new Error('Failed to fetch conversations');
        
        const conversations = await res.json();
        users[userNum].conversations = conversations;
        
        const conversationsList = document.getElementById(`conversations-list-${userNum}`);
        conversationsList.innerHTML = '';

        if (conversations.length === 0) {
            conversationsList.innerHTML = '<div style="padding: 20px; text-align: center; color: #65676b;">No conversations yet</div>';
            return;
        }

        conversations.forEach(conv => {
            const otherMember = conv.members.find(m => String(m._id) !== String(users[userNum].currentUser._id));
            const displayName = otherMember ? otherMember.name : 'Group Chat';
            
            const div = document.createElement('div');
            div.className = 'conversation-item';
            if (String(conv._id) === String(users[userNum].currentConversationId)) {
                div.classList.add('active');
            }
            
            div.innerHTML = `
                <div class="conversation-name">
                    <div class="conversation-title">👤 ${displayName}</div>
                    <div class="conversation-preview">Tap to view messages</div>
                </div>
            `;
            
            div.onclick = () => openConversation(userNum, conv);
            conversationsList.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading conversations:', error);
        showAuthMessage(userNum, '❌ Failed to load conversations', 'error');
    }
}

// Open a specific conversation
async function openConversation(userNum, conversation) {
    try {
        users[userNum].currentConversationId = conversation._id;
        
        const otherMember = conversation.members.find(m => String(m._id) !== String(users[userNum].currentUser._id));
        const displayName = otherMember ? otherMember.name : 'Group Chat';
        
        document.getElementById(`chat-header-${userNum}`).innerHTML = `<span>💬 ${displayName}</span><button onclick="deleteChat(${userNum})" class="delete-btn" title="Delete chat">🗑️</button>`;
        document.getElementById(`chat-messages-${userNum}`).innerHTML = '';

        // Join Socket.io room
        users[userNum].socket.emit('joinConversation', conversation._id);
        console.log(`User ${userNum} joined conversation room:`, conversation._id);
        
        // Load message history
        loadMessages(userNum, conversation._id);
        
        // Update active state in conversations list
        document.querySelectorAll(`#conversations-list-${userNum} .conversation-item`).forEach(item => {
            item.classList.remove('active');
        });
        event.currentTarget?.classList.add('active');
    } catch (error) {
        console.error('Error opening conversation:', error);
        showAuthMessage(userNum, '❌ Failed to open conversation', 'error');
    }
}