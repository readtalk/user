// ===== WHATSAPP LOBBY DATA =====
const whatsappChats = [
    {
        id: 'chat_1',
        name: 'Family Group',
        initials: 'FG',
        lastMessage: 'Dinner at 7 PM tonight! 🍽️',
        time: '10:30 AM',
        unread: 12,
        online: true,
        muted: false,
        pinned: true,
        type: 'group'
    },
    {
        id: 'chat_2',
        name: 'Mom',
        initials: 'M',
        lastMessage: 'Call me when you\'re free ❤️',
        time: '09:45 AM',
        unread: 3,
        online: true,
        muted: false,
        pinned: true,
        type: 'personal'
    },
    {
        id: 'chat_3',
        name: 'Alex Johnson',
        initials: 'AJ',
        lastMessage: 'Thanks for the files! 📎',
        time: 'Yesterday',
        unread: 0,
        online: false,
        muted: false,
        pinned: false,
        type: 'personal'
    },
    {
        id: 'chat_4',
        name: 'Work Team',
        initials: 'WT',
        lastMessage: 'Meeting moved to 3 PM',
        time: 'Yesterday',
        unread: 0,
        online: true,
        muted: true,
        pinned: false,
        type: 'group'
    },
    {
        id: 'chat_5',
        name: 'Sarah Miller',
        initials: 'SM',
        lastMessage: '😂😂😂',
        time: '12/12',
        unread: 0,
        online: true,
        muted: false,
        pinned: false,
        type: 'personal'
    },
    {
        id: 'chat_6',
        name: 'Book Club',
        initials: 'BC',
        lastMessage: 'Next book: Atomic Habits',
        time: '11/12',
        unread: 1,
        online: false,
        muted: false,
        pinned: false,
        type: 'group'
    },
    {
        id: 'chat_7',
        name: 'David Wilson',
        initials: 'DW',
        lastMessage: 'Missed voice call',
        time: '10/12',
        unread: 0,
        online: false,
        muted: false,
        pinned: false,
        type: 'personal'
    },
    {
        id: 'chat_8',
        name: 'Gaming Squad',
        initials: 'GS',
        lastMessage: 'Tonight at 9 PM? 🎮',
        time: '09/12',
        unread: 0,
        online: true,
        muted: true,
        pinned: false,
        type: 'group'
    },
    {
        id: 'chat_9',
        name: '+1 (555) 123-4567',
        initials: '?',
        lastMessage: 'Photo sent 📸',
        time: '08/12',
        unread: 0,
        online: false,
        muted: false,
        pinned: false,
        type: 'personal'
    },
    {
        id: 'chat_10',
        name: 'Project Alpha',
        initials: 'PA',
        lastMessage: 'Deadline extended to Friday',
        time: '07/12',
        unread: 0,
        online: false,
        muted: false,
        pinned: false,
        type: 'group'
    }
];

// ===== DOM ELEMENTS =====
const chatList = document.getElementById('chatList');
const tabs = document.querySelectorAll('.tab');
const fab = document.querySelector('.whatsapp-fab');

// ===== UTILITY FUNCTIONS =====
function getMessageIcon(message) {
    if (message.includes('📸')) return 'fas fa-camera';
    if (message.includes('📎')) return 'fas fa-paperclip';
    if (message.includes('🎮')) return 'fas fa-gamepad';
    if (message.includes('🍽️')) return 'fas fa-utensils';
    if (message.includes('😂')) return 'fas fa-laugh';
    if (message.includes('❤️')) return 'fas fa-heart';
    if (message.includes('📞') || message.includes('call')) return 'fas fa-phone-alt';
    return 'fas fa-check';
}

function formatTimeDisplay(timeStr) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (timeStr.includes('AM') || timeStr.includes('PM')) {
        return timeStr;
    } else if (timeStr === 'Yesterday') {
        return 'Yesterday';
    } else if (timeStr.includes('/')) {
        return timeStr;
    }
    return timeStr;
}

// ===== RENDER CHATS =====
function renderChats(chats = whatsappChats) {
    chatList.innerHTML = '';
    
    if (chats.length === 0) {
        chatList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="fab fa-whatsapp"></i>
                </div>
                <div class="empty-state-title">No chats yet</div>
                <div class="empty-state-subtitle">
                    Start a conversation by tapping the message button below
                </div>
            </div>
        `;
        return;
    }
    
    // Sort: pinned first, then unread, then by time
    const sortedChats = [...chats].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        if (a.unread > 0 && b.unread === 0) return -1;
        if (a.unread === 0 && b.unread > 0) return 1;
        return 0;
    });
    
    sortedChats.forEach(chat => {
        const chatItem = createChatElement(chat);
        chatList.appendChild(chatItem);
    });
}

// ===== CREATE CHAT ELEMENT =====
function createChatElement(chat) {
    const div = document.createElement('div');
    div.className = `chat-item ${chat.unread > 0 ? 'unread' : ''}`;
    
    const messageIcon = getMessageIcon(chat.lastMessage);
    const formattedTime = formatTimeDisplay(chat.time);
    
    div.innerHTML = `
        <div class="chat-avatar">
            <div class="avatar-img">${chat.initials}</div>
            ${chat.online ? '<div class="online-status"></div>' : ''}
        </div>
        <div class="chat-content">
            <div class="chat-header">
                <div class="chat-name">
                    ${chat.name}
                    ${chat.muted ? '<i class="fas fa-volume-mute chat-muted"></i>' : ''}
                    ${chat.pinned ? '<i class="fas fa-thumbtack chat-muted" style="margin-left: 4px;"></i>' : ''}
                </div>
                <div class="chat-time">${formattedTime}</div>
            </div>
            <div class="chat-preview">
                <i class="${messageIcon}"></i>
                <span>${chat.lastMessage}</span>
            </div>
        </div>
        ${chat.unread > 0 ? `<div class="unread-badge">${chat.unread}</div>` : ''}
    `;
    
    // Click handler
    div.addEventListener('click', () => {
        openChat(chat.id);
    });
    
    return div;
}

// ===== CHAT FUNCTIONS =====
function openChat(chatId) {
    const chat = whatsappChats.find(c => c.id === chatId);
    if (chat) {
        // Mark as read
        chat.unread = 0;
        renderChats();
        
        // In real app, this would open chat window
        alert(`Opening chat with ${chat.name}\n(This is a demo - chat interface would open here)`);
    }
}

// ===== TAB FUNCTIONALITY =====
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Remove active class from all tabs
        tabs.forEach(t => t.classList.remove('active'));
        // Add active class to clicked tab
        tab.classList.add('active');
        
        // Filter chats based on tab
        const tabLabel = tab.querySelector('.tab-label').textContent;
        let filteredChats = [...whatsappChats];
        
        if (tabLabel === 'STATUS') {
            chatList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fas fa-broadcast-tower"></i>
                    </div>
                    <div class="empty-state-title">No status updates</div>
                    <div class="empty-state-subtitle">
                        Status updates from your contacts will appear here
                    </div>
                </div>
            `;
            return;
        } else if (tabLabel === 'CALLS') {
            chatList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fas fa-phone-alt"></i>
                    </div>
                    <div class="empty-state-title">No call history</div>
                    <div class="empty-state-subtitle">
                        Calls you make and receive will appear here
                    </div>
                </div>
            `;
            return;
        }
        
        renderChats(filteredChats);
    });
});

// ===== FAB FUNCTIONALITY =====
fab.addEventListener('click', () => {
    const contactName = prompt('Enter contact name or number:');
    if (contactName && contactName.trim()) {
        const newId = 'new_' + Date.now();
        const initials = contactName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?';
        
        whatsappChats.unshift({
            id: newId,
            name: contactName,
            initials: initials,
            lastMessage: 'Say hi! 👋',
            time: 'Now',
            unread: 1,
            online: true,
            muted: false,
            pinned: false,
            type: 'personal'
        });
        
        renderChats();
        alert(`New chat created with ${contactName}`);
    }
});

// ===== HEADER ICON FUNCTIONALITY =====
document.querySelectorAll('.header-icon').forEach((icon, index) => {
    icon.addEventListener('click', () => {
        const actions = ['Open camera', 'Search chats', 'Open menu'];
        alert(`${actions[index]} (WhatsApp feature demo)`);
    });
});

// ===== ARCHIVED BANNER =====
document.querySelector('.archived-banner').addEventListener('click', () => {
    alert('Archived chats (WhatsApp feature demo)');
});

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + N for new chat
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        fab.click();
    }
    
    // Esc to clear search (if implemented)
    if (e.key === 'Escape') {
        // Would clear search if search was active
    }
});

// ===== INITIAL RENDER =====
document.addEventListener('DOMContentLoaded', () => {
    renderChats();
    
    // Simulate real-time updates
    setInterval(() => {
        // Randomly change online status
        whatsappChats.forEach(chat => {
            if (chat.id !== 'chat_1' && Math.random() > 0.8) {
                chat.online = !chat.online;
            }
        });
        
        // Update online indicators
        document.querySelectorAll('.chat-item').forEach((item, index) => {
            const chat = whatsappChats[index];
            if (chat) {
                const onlineIndicator = item.querySelector('.online-status');
                if (onlineIndicator) {
                    onlineIndicator.style.display = chat.online ? 'block' : 'none';
                }
            }
        });
    }, 15000);
});

// ===== EXPORT FUNCTIONS =====
window.openChat = openChat;
