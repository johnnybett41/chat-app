const socket1 = io("http://localhost:5000");
const socket2 = io("http://localhost:5000");

const users = {
    1: { socket: socket1, currentUser: null, token: null, currentConversationId: null },
    2: { socket: socket2, currentUser: null, token: null, currentConversationId: null }
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
        const res = await fetch('http://localhost:5000/api/auth/login', {
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
        const res = await fetch('http://localhost:5000/api/auth/register', {
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
        const res = await fetch('http://localhost:5000/api/users', {
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
    } catch (error) {
        console.error('Error fetching users:', error);
    }
}

async function startConversation(userNum, user) {
    try {
        const res = await fetch('http://localhost:5000/api/conversations', {
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
        const res = await fetch(`http://localhost:5000/api/conversations/${conversationId}/messages`, {
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