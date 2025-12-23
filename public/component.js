// === PLATFORM DETECTION ===
class PlatformDetector {
    static isMobile() {
        return CSS.supports('(--is-mobile: 1)') ? 
            getComputedStyle(document.documentElement)
                .getPropertyValue('--is-mobile').trim() === '1' :
            window.innerWidth < 768;
    }
    
    static isDesktop() {
        return CSS.supports('(--is-desktop: 1)') ?
            getComputedStyle(document.documentElement)
                .getPropertyValue('--is-desktop').trim() === '1' :
            window.innerWidth >= 768;
    }
    
    static isTouch() {
        return CSS.supports('(--is-touch: 1)') ?
            getComputedStyle(document.documentElement)
                .getPropertyValue('--is-touch').trim() === '1' :
            'ontouchstart' in window;
    }
}

// === WA-HEADER COMPONENT ===
class WAHeader extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.render();
    }
    
    render() {
        const isDesktop = PlatformDetector.isDesktop();
        
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    background: var(--wa-green);
                    color: white;
                    z-index: 100;
                }
                
                .header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: var(--space-md) var(--space-lg);
                    height: 60px;
                }
                
                .logo {
                    font-size: var(--font-size-xl);
                    font-weight: var(--font-weight-medium);
                    letter-spacing: 0.5px;
                }
                
                .actions {
                    display: flex;
                    gap: var(--space-lg);
                }
                
                .action-btn {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 20px;
                    cursor: pointer;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background-color var(--transition-fast);
                }
                
                .action-btn:hover {
                    background: rgba(255,255,255,0.1);
                }
                
                .desktop-tabs {
                    display: none;
                }
                
                @media (min-width: 768px) {
                    .desktop-tabs {
                        display: flex;
                        gap: var(--space-xl);
                        margin-left: var(--space-xl);
                    }
                    
                    .tab {
                        background: none;
                        border: none;
                        color: rgba(255,255,255,0.7);
                        font-size: var(--font-size-sm);
                        font-weight: var(--font-weight-medium);
                        cursor: pointer;
                        padding: var(--space-sm) 0;
                        position: relative;
                    }
                    
                    .tab.active {
                        color: white;
                    }
                    
                    .tab.active::after {
                        content: '';
                        position: absolute;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        height: 3px;
                        background: white;
                        border-radius: 3px 3px 0 0;
                    }
                }
            </style>
            
            <div class="header">
                <div class="logo">WhatsApp</div>
                
                <div class="desktop-tabs">
                    <button class="tab active" data-tab="chats">CHATS</button>
                    <button class="tab" data-tab="status">STATUS</button>
                    <button class="tab" data-tab="calls">CALLS</button>
                </div>
                
                <div class="actions">
                    <button class="action-btn" title="Search">🔍</button>
                    ${isDesktop ? `
                        <button class="action-btn" title="New chat">💬</button>
                        <button class="action-btn" title="Menu">⋮</button>
                    ` : `
                        <button class="action-btn" title="Camera">📷</button>
                        <button class="action-btn" title="Search">🔍</button>
                        <button class="action-btn" title="Menu">⋮</button>
                    `}
                </div>
            </div>
        `;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.shadowRoot.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.shadowRoot.querySelectorAll('.tab').forEach(t => 
                    t.classList.remove('active'));
                e.target.classList.add('active');
                
                // Dispatch custom event
                this.dispatchEvent(new CustomEvent('tab-change', {
                    detail: { tab: e.target.dataset.tab },
                    bubbles: true
                }));
            });
        });
    }
}

// === WA-CHAT-LIST COMPONENT ===
class WAChatList extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.chats = [];
        this.render();
    }
    
    async connectedCallback() {
        await this.loadChats();
        this.renderChats();
    }
    
    async loadChats() {
        // Mock data - in real app would be from IndexedDB/API
        this.chats = [
            { id: 1, name: 'Family Group', last: 'Dinner at 7! 🍽️', time: '10:30', unread: 12, online: true, muted: false },
            { id: 2, name: 'Mom', last: 'Call me ❤️', time: '09:45', unread: 3, online: true, muted: false },
            { id: 3, name: 'Alex Johnson', last: 'Thanks! 📎', time: 'Yesterday', unread: 0, online: false, muted: false },
            { id: 4, name: 'Work Team', last: 'Meeting moved', time: 'Yesterday', unread: 0, online: true, muted: true },
            { id: 5, name: 'Sarah Miller', last: '😂😂😂', time: '12/12', unread: 0, online: true, muted: false },
        ];
    }
    
    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    flex: 1;
                    overflow-y: auto;
                    background: var(--wa-surface);
                }
                
                .chat-list {
                    list-style: none;
                }
                
                .chat-item {
                    display: flex;
                    align-items: center;
                    padding: var(--space-md) var(--space-lg);
                    border-bottom: 1px solid var(--wa-border);
                    cursor: pointer;
                    transition: background-color var(--transition-fast);
                    min-height: 72px;
                }
                
                .chat-item:hover {
                    background: rgba(0,0,0,0.02);
                }
                
                .chat-item.unread {
                    background: rgba(37, 211, 102, 0.05);
                }
                
                .avatar {
                    position: relative;
                    margin-right: var(--space-md);
                    flex-shrink: 0;
                }
                
                .avatar-img {
                    width: 56px;
                    height: 56px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, var(--wa-text-secondary), #91999e);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: var(--font-weight-bold);
                    font-size: 18px;
                }
                
                .online {
                    position: absolute;
                    bottom: 2px;
                    right: 2px;
                    width: 12px;
                    height: 12px;
                    background: var(--wa-unread);
                    border: 2px solid var(--wa-surface);
                    border-radius: 50%;
                }
                
                .chat-content {
                    flex: 1;
                    min-width: 0;
                }
                
                .chat-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: var(--space-xs);
                }
                
                .chat-name {
                    font-size: var(--font-size-md);
                    font-weight: var(--font-weight-bold);
                    color: var(--wa-text);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .chat-time {
                    font-size: var(--font-size-xs);
                    color: var(--wa-text-secondary);
                }
                
                .chat-preview {
                    font-size: var(--font-size-sm);
                    color: var(--wa-text-secondary);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    display: flex;
                    align-items: center;
                    gap: var(--space-xs);
                }
                
                .unread-badge {
                    background: var(--wa-unread);
                    color: white;
                    font-size: var(--font-size-xs);
                    font-weight: var(--font-weight-bold);
                    padding: 2px 6px;
                    border-radius: var(--radius-full);
                    min-width: 18px;
                    text-align: center;
                }
                
                .muted {
                    font-size: 12px;
                    color: var(--wa-text-secondary);
                }
                
                .empty-state {
                    text-align: center;
                    padding: var(--space-xxl) var(--space-lg);
                    color: var(--wa-text-secondary);
                }
                
                .empty-icon {
                    font-size: 48px;
                    margin-bottom: var(--space-md);
                    opacity: 0.5;
                }
                
                /* Desktop specific */
                @media (min-width: 768px) {
                    .chat-item {
                        padding: var(--space-md) var(--space-xl);
                    }
                    
                    .avatar-img {
                        width: 48px;
                        height: 48px;
                        font-size: 16px;
                    }
                }
            </style>
            
            <ul class="chat-list" id="chatList">
                <!-- Chats will be rendered here -->
            </ul>
        `;
    }
    
    renderChats() {
        const chatList = this.shadowRoot.getElementById('chatList');
        
        if (this.chats.length === 0) {
            chatList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">💬</div>
                    <h3>No chats yet</h3>
                    <p>Start a conversation by tapping the + button</p>
                </div>
            `;
            return;
        }
        
        chatList.innerHTML = this.chats.map(chat => `
            <li class="chat-item ${chat.unread > 0 ? 'unread' : ''}" 
                data-id="${chat.id}"
                onclick="this.getRootNode().host.handleChatClick(${chat.id})">
                <div class="avatar">
                    <div class="avatar-img">${chat.name.charAt(0)}</div>
                    ${chat.online ? '<div class="online"></div>' : ''}
                </div>
                <div class="chat-content">
                    <div class="chat-header">
                        <div class="chat-name">
                            ${chat.name}
                            ${chat.muted ? '<span class="muted"> 🔇</span>' : ''}
                        </div>
                        <div class="chat-time">${chat.time}</div>
                    </div>
                    <div class="chat-preview">
                        ${chat.last}
                        ${chat.unread > 0 ? `<span class="unread-badge">${chat.unread}</span>` : ''}
                    </div>
                </div>
            </li>
        `).join('');
    }
    
    handleChatClick(chatId) {
        this.dispatchEvent(new CustomEvent('chat-select', {
            detail: { chatId },
            bubbles: true
        }));
    }
}

// === WA-BOTTOM-NAV COMPONENT (Mobile) ===
class WABottomNav extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }
    
    connectedCallback() {
        if (PlatformDetector.isDesktop()) {
            this.style.display = 'none';
            return;
        }
        
        this.render();
    }
    
    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    background: var(--wa-surface);
                    border-top: 1px solid var(--wa-border);
                    position: sticky;
                    bottom: 0;
                    z-index: 100;
                }
                
                .nav {
                    display: flex;
                    height: 56px;
                }
                
                .nav-item {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background: none;
                    border: none;
                    color: var(--wa-text-secondary);
                    font-size: var(--font-size-xs);
                    cursor: pointer;
                    transition: color var(--transition-fast);
                }
                
                .nav-item.active {
                    color: var(--wa-green);
                }
                
                .nav-icon {
                    font-size: 20px;
                    margin-bottom: 2px;
                }
            </style>
            
            <nav class="nav">
                <button class="nav-item active" data-tab="chats">
                    <span class="nav-icon">💬</span>
                    <span>Chats</span>
                </button>
                <button class="nav-item" data-tab="status">
                    <span class="nav-icon">📺</span>
                    <span>Status</span>
                </button>
                <button class="nav-item" data-tab="calls">
                    <span class="nav-icon">📞</span>
                    <span>Calls</span>
                </button>
            </nav>
        `;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.shadowRoot.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.shadowRoot.querySelectorAll('.nav-item').forEach(i => 
                    i.classList.remove('active'));
                e.target.closest('.nav-item').classList.add('active');
            });
        });
    }
}

// === WA-SIDEBAR COMPONENT (Desktop) ===
class WASidebar extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }
    
    connectedCallback() {
        if (!PlatformDetector.isDesktop()) {
            this.style.display = 'none';
            return;
        }
        
        this.render();
    }
    
    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 240px;
                    background: var(--wa-surface);
                    border-right: 1px solid var(--wa-border);
                    overflow-y: auto;
                }
                
                .sidebar-header {
                    padding: var(--space-lg);
                    border-bottom: 1px solid var(--wa-border);
                }
                
                .search-box {
                    width: 100%;
                    padding: var(--space-sm) var(--space-md);
                    border: 1px solid var(--wa-border);
                    border-radius: var(--radius-lg);
                    background: var(--wa-background);
                    font-size: var(--font-size-sm);
                }
                
                .sidebar-nav {
                    padding: var(--space-md) 0;
                }
                
                .nav-item {
                    display: flex;
                    align-items: center;
                    gap: var(--space-md);
                    padding: var(--space-md) var(--space-lg);
                    background: none;
                    border: none;
                    width: 100%;
                    text-align: left;
                    cursor: pointer;
                    transition: background-color var(--transition-fast);
                }
                
                .nav-item:hover {
                    background: rgba(0,0,0,0.02);
                }
                
                .nav-item.active {
                    background: rgba(7, 94, 84, 0.1);
                    color: var(--wa-green);
                    font-weight: var(--font-weight-medium);
                }
                
                .nav-icon {
                    font-size: 18px;
                }
                
                .nav-badge {
                    margin-left: auto;
                    background: var(--wa-unread);
                    color: white;
                    font-size: var(--font-size-xs);
                    padding: 2px 6px;
                    border-radius: var(--radius-full);
                }
            </style>
            
            <div class="sidebar-header">
                <input type="text" class="search-box" placeholder="Search...">
            </div>
            
            <nav class="sidebar-nav">
                <button class="nav-item active">
                    <span class="nav-icon">💬</span>
                    <span>Chats</span>
                    <span class="nav-badge">12</span>
                </button>
                <button class="nav-item">
                    <span class="nav-icon">📺</span>
                    <span>Status</span>
                </button>
                <button class="nav-item">
                    <span class="nav-icon">📞</span>
                    <span>Calls</span>
                    <span class="nav-badge">3</span>
                </button>
                <button class="nav-item">
                    <span class="nav-icon">⚙️</span>
                    <span>Settings</span>
                </button>
            </nav>
        `;
    }
}

// === WA-FAB COMPONENT ===
class WAFab extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.render();
    }
    
    render() {
        const isDesktop = PlatformDetector.isDesktop();
        
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    position: fixed;
                    ${isDesktop ? 'bottom: var(--space-xl); right: var(--space-xl);' : 'bottom: 80px; right: var(--space-lg);'}
                    z-index: 99;
                }
                
                .fab {
                    width: 56px;
                    height: 56px;
                    border-radius: 50%;
                    background: var(--wa-green-bright);
                    color: white;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: var(--shadow-lg);
                    transition: transform var(--transition-normal), box-shadow var(--transition-normal);
                }
                
                .fab:hover {
                    transform: scale(1.05);
                    box-shadow: 0 8px 24px rgba(37, 211, 102, 0.4);
                }
                
                .fab:active {
                    transform: scale(0.95);
                }
                
                /* Desktop larger FAB */
                @media (min-width: 768px) {
                    .fab {
                        width: 64px;
                        height: 64px;
                        font-size: 28px;
                    }
                }
            </style>
            
            <button class="fab" title="New chat">
                ${isDesktop ? '💬' : '✏️'}
            </button>
        `;
        
        this.shadowRoot.querySelector('.fab').addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('new-chat', { bubbles: true }));
        });
    }
}

// === REGISTER COMPONENTS ===
customElements.define('wa-header', WAHeader);
customElements.define('wa-chat-list', WAChatList);
customElements.define('wa-bottom-nav', WABottomNav);
customElements.define('wa-sidebar', WASidebar);
customElements.define('wa-fab', WAFab);
