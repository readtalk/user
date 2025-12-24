// === PLATFORM & FEATURE DETECTION ===
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
            window.innerWidth >= 1024;
    }
    
    static isTablet() {
        return window.innerWidth >= 768 && window.innerWidth < 1024;
    }
    
    static isTouch() {
        return 'ontouchstart' in window || 
               navigator.maxTouchPoints > 0 ||
               navigator.msMaxTouchPoints > 0;
    }
    
    static isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    }
    
    static isAndroid() {
        return /Android/.test(navigator.userAgent);
    }
    
    static isPWA() {
        return window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone ||
               document.referrer.includes('android-app://');
    }
}

// === WA-HEADER COMPONENT (Enhanced) ===
class WAHeader extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.unreadCounts = { chats: 0, status: 0, calls: 0 };
        this.render();
    }
    
    connectedCallback() {
        this.setupEventListeners();
        this.setupAppStateListener();
    }
    
    render() {
        const isDesktop = PlatformDetector.isDesktop();
        const isPWA = PlatformDetector.isPWA();
        
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    background: var(--wa-primary);
                    color: white;
                    position: sticky;
                    top: 0;
                    z-index: var(--wa-z-header);
                    box-shadow: var(--wa-shadow-sm);
                }
                
                .header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: ${isPWA ? 'var(--wa-space-md)' : 'var(--wa-space-sm) var(--wa-space-md)'};
                    padding-top: calc(${isPWA ? 'var(--wa-space-md)' : 'var(--wa-space-sm)'} + env(safe-area-inset-top, 0));
                    height: ${isPWA ? '60px' : '56px'};
                    transition: background-color var(--wa-transition-normal);
                }
                
                .header.scrolled {
                    background: rgba(0, 128, 105, 0.95);
                    backdrop-filter: blur(10px);
                }
                
                .left-section {
                    display: flex;
                    align-items: center;
                    gap: var(--wa-space-md);
                    flex: 1;
                }
                
                .logo {
                    font-size: var(--wa-font-size-xl);
                    font-weight: var(--wa-font-weight-bold);
                    letter-spacing: -0.5px;
                    display: flex;
                    align-items: center;
                    gap: var(--wa-space-xs);
                    cursor: default;
                }
                
                .logo-icon {
                    font-size: 20px;
                }
                
                .last-seen {
                    font-size: var(--wa-font-size-xs);
                    opacity: 0.8;
                    margin-left: var(--wa-space-xs);
                }
                
                .right-section {
                    display: flex;
                    align-items: center;
                    gap: ${isDesktop ? 'var(--wa-space-md)' : 'var(--wa-space-sm)'};
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
                    transition: all var(--wa-transition-fast);
                    position: relative;
                }
                
                .action-btn:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
                
                .action-btn:active {
                    transform: scale(0.95);
                }
                
                .badge {
                    position: absolute;
                    top: 0;
                    right: 0;
                    background: var(--wa-accent-red);
                    color: white;
                    font-size: 10px;
                    font-weight: var(--wa-font-weight-bold);
                    min-width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2px;
                    border: 2px solid var(--wa-primary);
                }
                
                .desktop-tabs {
                    display: none;
                    margin-left: var(--wa-space-xl);
                }
                
                .tab {
                    background: none;
                    border: none;
                    color: rgba(255, 255, 255, 0.7);
                    font-size: var(--wa-font-size-sm);
                    font-weight: var(--wa-font-weight-medium);
                    cursor: pointer;
                    padding: var(--wa-space-sm) 0;
                    position: relative;
                    margin: 0 var(--wa-space-sm);
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
                    animation: tabIndicatorSlide 200ms ease;
                }
                
                .tab-badge {
                    position: absolute;
                    top: -5px;
                    right: -10px;
                    background: var(--wa-accent-red);
                    color: white;
                    font-size: 10px;
                    min-width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                /* Dark mode support */
                @media (prefers-color-scheme: dark) {
                    :host {
                        background: var(--wa-background);
                        border-bottom: 1px solid var(--wa-border);
                    }
                    
                    .header.scrolled {
                        background: rgba(17, 27, 33, 0.95);
                    }
                    
                    .badge, .tab-badge {
                        border-color: var(--wa-background);
                    }
                }
                
                @keyframes tabIndicatorSlide {
                    from { transform: scaleX(0); }
                    to { transform: scaleX(1); }
                }
                
                @media (min-width: 768px) {
                    .desktop-tabs {
                        display: flex;
                    }
                    
                    .logo {
                        font-size: var(--wa-font-size-xxl);
                    }
                }
            </style>
            
            <div class="header" id="header">
                <div class="left-section">
                    <div class="logo">
                        <span class="logo-icon">💚</span>
                        WhatsApp
                        <span class="last-seen" id="lastSeen">last seen today at 10:30</span>
                    </div>
                    
                    ${isDesktop ? `
                        <div class="desktop-tabs">
                            <button class="tab active" data-tab="chats">
                                CHATS
                                ${this.unreadCounts.chats > 0 ? `<span class="tab-badge">${this.unreadCounts.chats}</span>` : ''}
                            </button>
                            <button class="tab" data-tab="status">
                                STATUS
                                ${this.unreadCounts.status > 0 ? `<span class="tab-badge">${this.unreadCounts.status}</span>` : ''}
                            </button>
                            <button class="tab" data-tab="calls">
                                CALLS
                                ${this.unreadCounts.calls > 0 ? `<span class="tab-badge">${this.unreadCounts.calls}</span>` : ''}
                            </button>
                        </div>
                    ` : ''}
                </div>
                
                <div class="right-section">
                    ${isDesktop ? `
                        <button class="action-btn" title="New chat" data-action="new-chat">💬</button>
                        <button class="action-btn" title="Search" data-action="search">🔍</button>
                        <button class="action-btn" title="Menu" data-action="menu">⋮</button>
                    ` : `
                        <button class="action-btn" title="Camera" data-action="camera">📷</button>
                        <button class="action-btn" title="Search" data-action="search">🔍</button>
                        <button class="action-btn" title="Menu" data-action="menu">⋮</button>
                    `}
                </div>
            </div>
        `;
    }
    
    setupEventListeners() {
        // Header scroll effect
        const header = this.shadowRoot.getElementById('header');
        const mainContent = document.getElementById('mainContent');
        
        if (mainContent) {
            mainContent.addEventListener('scroll', () => {
                header.classList.toggle('scrolled', mainContent.scrollTop > 10);
            });
        }
        
        // Tab buttons
        this.shadowRoot.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.dispatchTabChange(tabName);
            });
        });
        
        // Action buttons
        this.shadowRoot.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleAction(action);
            });
        });
    }
    
    setupAppStateListener() {
        // Listen for unread count updates
        if (window.app) {
            window.app.on('unread-update', (counts) => {
                this.unreadCounts = counts;
                this.updateBadges();
            });
            
            window.app.on('tab-change', (tab) => {
                this.updateActiveTab(tab);
            });
        }
    }
    
    updateBadges() {
        // Update tab badges
        this.shadowRoot.querySelectorAll('.tab-badge').forEach(badge => badge.remove());
        
        // Update chat tab badge
        const chatTab = this.shadowRoot.querySelector('.tab[data-tab="chats"]');
        if (chatTab && this.unreadCounts.chats > 0) {
            const badge = document.createElement('span');
            badge.className = 'tab-badge';
            badge.textContent = this.unreadCounts.chats > 99 ? '99+' : this.unreadCounts.chats;
            chatTab.appendChild(badge);
        }
        
        // Update status tab badge
        const statusTab = this.shadowRoot.querySelector('.tab[data-tab="status"]');
        if (statusTab && this.unreadCounts.status > 0) {
            const badge = document.createElement('span');
            badge.className = 'tab-badge';
            badge.textContent = this.unreadCounts.status > 99 ? '99+' : this.unreadCounts.status;
            statusTab.appendChild(badge);
        }
        
        // Update calls tab badge
        const callsTab = this.shadowRoot.querySelector('.tab[data-tab="calls"]');
        if (callsTab && this.unreadCounts.calls > 0) {
            const badge = document.createElement('span');
            badge.className = 'tab-badge';
            badge.textContent = this.unreadCounts.calls > 99 ? '99+' : this.unreadCounts.calls;
            callsTab.appendChild(badge);
        }
    }
    
    updateActiveTab(activeTab) {
        this.shadowRoot.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === activeTab);
        });
    }
    
    dispatchTabChange(tab) {
        this.dispatchEvent(new CustomEvent('tab-change', {
            detail: { tab },
            bubbles: true,
            composed: true
        }));
    }
    
    handleAction(action) {
        switch(action) {
            case 'search':
                this.dispatchEvent(new CustomEvent('search-toggle', { bubbles: true }));
                break;
            case 'new-chat':
                this.dispatchEvent(new CustomEvent('new-chat', { bubbles: true }));
                break;
            case 'camera':
                this.dispatchEvent(new CustomEvent('camera-open', { bubbles: true }));
                break;
            case 'menu':
                this.showMenu();
                break;
        }
    }
    
    showMenu() {
        const menu = document.createElement('div');
        menu.className = 'header-menu';
        menu.innerHTML = `
            <style>
                .header-menu {
                    position: fixed;
                    top: 60px;
                    right: var(--wa-space-md);
                    background: var(--wa-surface);
                    border-radius: var(--wa-radius-md);
                    box-shadow: var(--wa-shadow-lg);
                    border: 1px solid var(--wa-border);
                    min-width: 200px;
                    z-index: 1000;
                    animation: menuSlideDown 150ms ease;
                }
                
                .menu-item {
                    display: flex;
                    align-items: center;
                    gap: var(--wa-space-md);
                    width: 100%;
                    padding: var(--wa-space-md);
                    border: none;
                    background: none;
                    text-align: left;
                    cursor: pointer;
                    color: var(--wa-text-primary);
                    font-size: var(--wa-font-size-md);
                    border-bottom: 1px solid var(--wa-border);
                }
                
                .menu-item:last-child {
                    border-bottom: none;
                }
                
                .menu-item:hover {
                    background: var(--wa-border-light);
                }
                
                .menu-icon {
                    font-size: 18px;
                    width: 24px;
                }
                
                @keyframes menuSlideDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            </style>
            <button class="menu-item" data-action="new-group">
                <span class="menu-icon">👥</span>
                <span>New group</span>
            </button>
            <button class="menu-item" data-action="new-broadcast">
                <span class="menu-icon">📢</span>
                <span>New broadcast</span>
            </button>
            <button class="menu-item" data-action="linked-devices">
                <span class="menu-icon">💻</span>
                <span>Linked devices</span>
            </button>
            <button class="menu-item" data-action="starred-messages">
                <span class="menu-icon">⭐</span>
                <span>Starred messages</span>
            </button>
            <button class="menu-item" data-action="settings">
                <span class="menu-icon">⚙️</span>
                <span>Settings</span>
            </button>
        `;
        
        document.body.appendChild(menu);
        
        // Close menu when clicking outside
        const closeMenu = (e) => {
            if (!menu.contains(e.target) && !this.shadowRoot.querySelector('[data-action="menu"]').contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        
        setTimeout(() => document.addEventListener('click', closeMenu), 100);
        
        // Handle menu item clicks
        menu.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleMenuAction(action);
                menu.remove();
            });
        });
    }
    
    handleMenuAction(action) {
        console.log('Menu action:', action);
        // Implement menu actions
    }
}

// === WA-TAB-BAR COMPONENT (Mobile) ===
class WATabBar extends HTMLElement {
    constructor() {
        super();
        if (PlatformDetector.isDesktop()) {
            this.style.display = 'none';
            return;
        }
        
        this.attachShadow({ mode: 'open' });
        this.unreadCounts = { chats: 0, status: 0, calls: 0 };
        this.render();
    }
    
    connectedCallback() {
        this.setupEventListeners();
        this.setupAppStateListener();
    }
    
    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    background: var(--wa-surface);
                    border-bottom: 1px solid var(--wa-border);
                    position: sticky;
                    top: 56px;
                    z-index: var(--wa-z-header);
                }
                
                .tab-bar {
                    display: flex;
                    height: 48px;
                }
                
                .tab {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: none;
                    border: none;
                    color: var(--wa-text-secondary);
                    font-size: var(--wa-font-size-md);
                    font-weight: var(--wa-font-weight-medium);
                    cursor: pointer;
                    position: relative;
                    transition: color var(--wa-transition-fast);
                    gap: var(--wa-space-xs);
                }
                
                .tab.active {
                    color: var(--wa-primary);
                }
                
                .tab.active::after {
                    content: '';
                    position: absolute;
                    bottom: 0;
                    left: 25%;
                    right: 25%;
                    height: 3px;
                    background: var(--wa-primary);
                    border-radius: 3px 3px 0 0;
                    animation: tabSlide 200ms ease;
                }
                
                .tab-badge {
                    position: absolute;
                    top: 8px;
                    right: calc(50% - 20px);
                    background: var(--wa-accent-red);
                    color: white;
                    font-size: 10px;
                    min-width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2px;
                }
                
                @keyframes tabSlide {
                    from { transform: scaleX(0); }
                    to { transform: scaleX(1); }
                }
                
                /* Dark mode */
                @media (prefers-color-scheme: dark) {
                    :host {
                        background: var(--wa-background);
                        border-color: var(--wa-border);
                    }
                }
            </style>
            
            <div class="tab-bar">
                <button class="tab active" data-tab="chats">
                    CHATS
                    ${this.unreadCounts.chats > 0 ? `<span class="tab-badge">${this.unreadCounts.chats}</span>` : ''}
                </button>
                <button class="tab" data-tab="status">
                    STATUS
                    ${this.unreadCounts.status > 0 ? `<span class="tab-badge">${this.unreadCounts.status}</span>` : ''}
                </button>
                <button class="tab" data-tab="calls">
                    CALLS
                    ${this.unreadCounts.calls > 0 ? `<span class="tab-badge">${this.unreadCounts.calls}</span>` : ''}
                </button>
            </div>
        `;
    }
    
    setupEventListeners() {
        this.shadowRoot.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.dispatchTabChange(tabName);
            });
        });
    }
    
    setupAppStateListener() {
        if (window.app) {
            window.app.on('unread-update', (counts) => {
                this.unreadCounts = counts;
                this.updateBadges();
            });
            
            window.app.on('tab-change', (tab) => {
                this.updateActiveTab(tab);
            });
        }
    }
    
    updateBadges() {
        this.shadowRoot.querySelectorAll('.tab-badge').forEach(badge => badge.remove());
        
        ['chats', 'status', 'calls'].forEach(tabName => {
            const count = this.unreadCounts[tabName];
            if (count > 0) {
                const tab = this.shadowRoot.querySelector(`.tab[data-tab="${tabName}"]`);
                const badge = document.createElement('span');
                badge.className = 'tab-badge';
                badge.textContent = count > 99 ? '99+' : count;
                tab.appendChild(badge);
            }
        });
    }
    
    updateActiveTab(activeTab) {
        this.shadowRoot.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === activeTab);
        });
    }
    
    dispatchTabChange(tab) {
        this.dispatchEvent(new CustomEvent('tab-change', {
            detail: { tab },
            bubbles: true,
            composed: true
        }));
    }
}

// === WA-CHAT-LIST COMPONENT (Enhanced) ===
class WAChatList extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.chats = [];
        this.isSelecting = false;
        this.selectedChats = new Set();
        this.render();
    }
    
    async connectedCallback() {
        await this.loadChats();
        this.renderChats();
        this.setupAppStateListener();
        this.setupIntersectionObserver();
    }
    
    async loadChats() {
        if (window.app) {
            this.chats = window.app.state.chats;
            window.app.on('chats-updated', (chats) => {
                this.chats = chats;
                this.renderChats();
            });
            
            window.app.on('selection-mode-changed', (isSelecting) => {
                this.isSelecting = isSelecting;
                this.updateSelectionUI();
            });
        }
    }
    
    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    height: 100%;
                    overflow-y: auto;
                    background: var(--wa-surface);
                    position: relative;
                }
                
                .chat-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }
                
                .section-header {
                    padding: var(--wa-space-sm) var(--wa-space-md);
                    background: var(--wa-surface-secondary);
                    color: var(--wa-text-secondary);
                    font-size: var(--wa-font-size-sm);
                    font-weight: var(--wa-font-weight-medium);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    border-bottom: 1px solid var(--wa-border);
                    position: sticky;
                    top: 0;
                    z-index: 1;
                }
                
                .chat-item {
                    display: flex;
                    align-items: center;
                    padding: var(--wa-space-md) var(--wa-space-lg);
                    border-bottom: 1px solid var(--wa-border-light);
                    cursor: pointer;
                    transition: all var(--wa-transition-fast);
                    position: relative;
                    min-height: 72px;
                    user-select: none;
                    -webkit-user-select: none;
                }
                
                .chat-item:hover {
                    background: var(--wa-border-light);
                }
                
                .chat-item.selected {
                    background: rgba(37, 211, 102, 0.05);
                }
                
                .chat-item.unread {
                    background: rgba(37, 211, 102, 0.03);
                }
                
                .chat-item.unread .chat-name {
                    font-weight: var(--wa-font-weight-bold);
                }
                
                .chat-item.unread .chat-preview {
                    color: var(--wa-text-primary);
                    font-weight: var(--wa-font-weight-medium);
                }
                
                .chat-item.muted .chat-name::after {
                    content: ' 🔇';
                    opacity: 0.6;
                }
                
                .selection-checkbox {
                    margin-right: var(--wa-space-md);
                    width: 20px;
                    height: 20px;
                    border: 2px solid var(--wa-border-dark);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all var(--wa-transition-fast);
                    flex-shrink: 0;
                }
                
                .selection-checkbox.checked {
                    background: var(--wa-primary);
                    border-color: var(--wa-primary);
                }
                
                .selection-checkbox.checked::after {
                    content: '✓';
                    color: white;
                    font-size: 12px;
                }
                
                .avatar {
                    position: relative;
                    margin-right: var(--wa-space-md);
                    flex-shrink: 0;
                }
                
                .avatar-img {
                    width: 56px;
                    height: 56px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, var(--wa-primary), var(--wa-primary-light));
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: var(--wa-font-weight-bold);
                    font-size: 20px;
                    position: relative;
                }
                
                .avatar.online .avatar-img::after {
                    content: '';
                    position: absolute;
                    bottom: 2px;
                    right: 2px;
                    width: 12px;
                    height: 12px;
                    background: var(--wa-status-online);
                    border: 2px solid var(--wa-surface);
                    border-radius: 50%;
                }
                
                .avatar.typing .avatar-img::after {
                    content: '';
                    position: absolute;
                    bottom: 2px;
                    right: 2px;
                    width: 12px;
                    height: 12px;
                    background: var(--wa-status-typing);
                    border: 2px solid var(--wa-surface);
                    border-radius: 50%;
                    animation: typingPulse 1.5s infinite;
                }
                
                .group-badge {
                    position: absolute;
                    bottom: -2px;
                    right: -2px;
                    background: var(--wa-primary);
                    color: white;
                    font-size: 10px;
                    padding: 2px 4px;
                    border-radius: 4px;
                    border: 2px solid var(--wa-surface);
                }
                
                .chat-content {
                    flex: 1;
                    min-width: 0;
                    overflow: hidden;
                }
                
                .chat-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: var(--wa-space-xs);
                }
                
                .chat-name {
                    font-size: var(--wa-font-size-md);
                    color: var(--wa-text-primary);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    flex: 1;
                }
                
                .chat-time {
                    font-size: var(--wa-font-size-xs);
                    color: var(--wa-text-secondary);
                    white-space: nowrap;
                    margin-left: var(--wa-space-sm);
                }
                
                .chat-preview {
                    display: flex;
                    align-items: center;
                    gap: var(--wa-space-xs);
                    font-size: var(--wa-font-size-sm);
                    color: var(--wa-text-secondary);
                    white-space: nowrap;
                    overflow: hidden;
                }
                
                .preview-text {
                    flex: 1;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .unread-badge {
                    background: var(--wa-accent-green);
                    color: white;
                    font-size: var(--wa-font-size-xs);
                    font-weight: var(--wa-font-weight-bold);
                    padding: 2px 6px;
                    border-radius: var(--wa-radius-full);
                    min-width: 18px;
                    text-align: center;
                    flex-shrink: 0;
                }
                
                .message-status {
                    font-size: 14px;
                    color: var(--wa-message-sent);
                    flex-shrink: 0;
                }
                
                .message-status.delivered {
                    color: var(--wa-message-delivered);
                }
                
                .message-status.read {
                    color: var(--wa-message-read);
                }
                
                .typing-indicator {
                    display: flex;
                    align-items: center;
                    gap: 2px;
                    color: var(--wa-status-typing);
                    font-style: italic;
                }
                
                .typing-dot {
                    width: 4px;
                    height: 4px;
                    background: currentColor;
                    border-radius: 50%;
                    animation: typingBounce 1.4s infinite;
                }
                
                .typing-dot:nth-child(2) { animation-delay: 0.2s; }
                .typing-dot:nth-child(3) { animation-delay: 0.4s; }
                
                .empty-state {
                    text-align: center;
                    padding: var(--wa-space-xxl) var(--wa-space-lg);
                    color: var(--wa-text-secondary);
                }
                
                .empty-icon {
                    font-size: 48px;
                    margin-bottom: var(--wa-space-md);
                    opacity: 0.5;
                }
                
                .archived-section {
                    margin-top: var(--wa-space-md);
                }
                
                .archived-header {
                    padding: var(--wa-space-sm) var(--wa-space-lg);
                    color: var(--wa-primary);
                    font-size: var(--wa-font-size-sm);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: var(--wa-space-sm);
                }
                
                .archived-header:hover {
                    background: var(--wa-border-light);
                }
                
                .archived-icon {
                    font-size: 16px;
                    transition: transform var(--wa-transition-fast);
                }
                
                .archived-icon.collapsed {
                    transform: rotate(-90deg);
                }
                
                /* Swipe actions */
                .swipe-actions {
                    position: absolute;
                    right: 0;
                    top: 0;
                    bottom: 0;
                    display: flex;
                    opacity: 0;
                    transition: opacity var(--wa-transition-fast);
                }
                
                .swipe-action {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 80px;
                    color: white;
                    font-weight: var(--wa-font-weight-bold);
                    transition: transform var(--wa-transition-fast);
                }
                
                .swipe-archive {
                    background: var(--wa-accent-green);
                }
                
                .swipe-delete {
                    background: var(--wa-accent-red);
                }
                
                .chat-item.swiping .swipe-actions {
                    opacity: 1;
                }
                
                @keyframes typingBounce {
                    0%, 60%, 100% { transform: translateY(0); }
                    30% { transform: translateY(-4px); }
                }
                
                @keyframes typingPulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                /* Responsive */
                @media (min-width: 768px) {
                    .chat-item {
                        padding: var(--wa-space-md) var(--wa-space-xl);
                    }
                    
                    .avatar-img {
                        width: 48px;
                        height: 48px;
                        font-size: 18px;
                    }
                }
                
                /* Dark mode */
                @media (prefers-color-scheme: dark) {
                    .chat-item.unread {
                        background: rgba(0, 168, 132, 0.05);
                    }
                    
                    .chat-item.selected {
                        background: rgba(0, 168, 132, 0.1);
                    }
                }
            </style>
            
            <div class="chat-list" id="chatList">
                <!-- Chats will be rendered here -->
            </div>
        `;
    }
    
    renderChats() {
        const chatList = this.shadowRoot.getElementById('chatList');
        if (!chatList) return;
        
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
        
        // Separate pinned and regular chats
        const pinnedChats = this.chats.filter(chat => chat.isPinned && !chat.isArchived);
        const regularChats = this.chats.filter(chat => !chat.isPinned && !chat.isArchived);
        const archivedChats = this.chats.filter(chat => chat.isArchived);
        
        let html = '';
        
        // Pinned chats section
        if (pinnedChats.length > 0) {
            html += `<div class="section-header">Pinned</div>`;
            html += pinnedChats.map(chat => this.renderChatItem(chat)).join('');
        }
        
        // Regular chats
        if (regularChats.length > 0) {
            if (pinnedChats.length > 0) {
                html += `<div class="section-header">All chats</div>`;
            }
            html += regularChats.map(chat => this.renderChatItem(chat)).join('');
        }
        
        // Archived chats (collapsible)
        if (archivedChats.length > 0) {
            html += `
                <div class="archived-section">
                    <div class="archived-header" id="archivedToggle">
                        <span class="archived-icon collapsed">▶</span>
                        <span>Archived (${archivedChats.length})</span>
                    </div>
                    <div class="archived-chats" id="archivedChats" hidden>
                        ${archivedChats.map(chat => this.renderChatItem(chat)).join('')}
                    </div>
                </div>
            `;
        }
        
        chatList.innerHTML = html;
        
        // Setup archived toggle
        const archivedToggle = chatList.querySelector('#archivedToggle');
        const archivedChatsContainer = chatList.querySelector('#archivedChats');
        if (archivedToggle && archivedChatsContainer) {
            archivedToggle.addEventListener('click', () => {
                const isHidden = archivedChatsContainer.hidden;
                archivedChatsContainer.hidden = !isHidden;
                archivedToggle.querySelector('.archived-icon').classList.toggle('collapsed', !isHidden);
            });
        }
        
        // Setup chat item event listeners
        this.setupChatItemListeners();
    }
    
    renderChatItem(chat) {
        const isSelected = this.selectedChats.has(chat.id);
        const isUnread = chat.unread > 0;
        
        // Format time
        const time = this.formatTime(chat.timestamp);
        
        // Message status icon
        let statusIcon = '';
        if (chat.lastMessageStatus === 'delivered') {
            statusIcon = '<span class="message-status delivered">✓✓</span>';
        } else if (chat.lastMessageStatus === 'read') {
            statusIcon = '<span class="message-status read">✓✓</span>';
        } else if (chat.lastMessageStatus === 'sent') {
            statusIcon = '<span class="message-status">✓</span>';
        }
        
        // Typing indicator
        const preview = chat.typing ? 
            `<div class="typing-indicator">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                typing...
            </div>` :
            `<span class="preview-text">${chat.lastMessage}</span>`;
        
        return `
            <li class="chat-item ${isUnread ? 'unread' : ''} ${chat.isMuted ? 'muted' : ''} ${isSelected ? 'selected' : ''}" 
                data-id="${chat.id}"
                data-chat="${encodeURIComponent(JSON.stringify(chat))}">
                
                <div class="selection-checkbox ${isSelected ? 'checked' : ''}"></div>
                
                <div class="avatar ${chat.online ? 'online' : ''} ${chat.typing ? 'typing' : ''}">
                    <div class="avatar-img">${chat.avatar}</div>
                    ${chat.isGroup ? `<span class="group-badge">${chat.participants}</span>` : ''}
                </div>
                
                <div class="chat-content">
                    <div class="chat-header">
                        <div class="chat-name">${chat.name}</div>
                        <div class="chat-time">${time}</div>
                    </div>
                    <div class="chat-preview">
                        ${preview}
                        ${statusIcon}
                        ${chat.unread > 0 ? `<span class="unread-badge">${chat.unread}</span>` : ''}
                    </div>
                </div>
                
                <div class="swipe-actions">
                    <div class="swipe-action swipe-archive">Archive</div>
                    <div class="swipe-action swipe-delete">Delete</div>
                </div>
            </li>
        `;
    }
    
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 86400000) { // Less than 24 hours
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diff < 604800000) { // Less than 7 days
            return date.toLocaleDateString([], { weekday: 'short' });
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    }
    
    setupChatItemListeners() {
        const chatItems = this.shadowRoot.querySelectorAll('.chat-item');
        
        chatItems.forEach(item => {
            // Click handler
            item.addEventListener('click', (e) => {
                if (e.target.closest('.selection-checkbox') || this.isSelecting) {
                    this.toggleChatSelection(item.dataset.id);
                } else if (!e.target.closest('.swipe-actions')) {
                    this.selectChat(item.dataset.id);
                }
            });
            
            // Touch swipe handler
            this.setupSwipeHandler(item);
        });
    }
    
    setupSwipeHandler(item) {
        if (!PlatformDetector.isTouch()) return;
        
        let startX, startY;
        let isSwiping = false;
        
        item.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }, { passive: true });
        
        item.addEventListener('touchmove', (e) => {
            if (!startX || !startY || this.isSelecting) return;
            
            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;
            
            const diffX = startX - currentX;
            const diffY = startY - currentY;
            
            // Only horizontal swipe
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
                e.preventDefault();
                isSwiping = true;
                
                const swipeDistance = Math.min(diffX, 160);
                item.style.transform = `translateX(-${swipeDistance}px)`;
                
                // Show swipe actions with opacity based on distance
                const opacity = Math.min(swipeDistance / 160, 1);
                item.querySelector('.swipe-actions').style.opacity = opacity;
                
                // Scale actions
                const actions = item.querySelectorAll('.swipe-action');
                const scale = 0.8 + (0.2 * opacity);
                actions.forEach(action => {
                    action.style.transform = `scale(${scale})`;
                });
            }
        }, { passive: false });
        
        item.addEventListener('touchend', (e) => {
            if (!startX || !startY) return;
            
            const endX = e.changedTouches[0].clientX;
            const diffX = startX - endX;
            
            if (isSwiping && Math.abs(diffX) > 80) {
                const chatId = item.dataset.id;
                if (diffX > 0) {
                    this.archiveChat(chatId);
                } else {
                    this.deleteChat(chatId);
                }
            }
            
            // Reset
            item.style.transform = '';
            item.querySelector('.swipe-actions').style.opacity = '0';
            item.querySelectorAll('.swipe-action').forEach(action => {
                action.style.transform = '';
            });
            
            startX = null;
            startY = null;
            isSwiping = false;
        }, { passive: true });
    }
    
    setupAppStateListener() {
        if (window.app) {
            window.app.on('selection-mode-changed', (isSelecting) => {
                this.isSelecting = isSelecting;
                this.updateSelectionUI();
            });
        }
    }
    
    setupIntersectionObserver() {
        // Lazy load or infinite scroll implementation
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Load more chats if needed
                    console.log('Chat visible:', entry.target.dataset.id);
                }
            });
        }, { threshold: 0.1 });
        
        // Observe chat items
        setTimeout(() => {
            this.shadowRoot.querySelectorAll('.chat-item').forEach(item => {
                observer.observe(item);
            });
        }, 100);
    }
    
    toggleChatSelection(chatId) {
        const checkbox = this.shadowRoot.querySelector(`.chat-item[data-id="${chatId}"] .selection-checkbox`);
        if (checkbox) {
            checkbox.classList.toggle('checked');
        }
        
        if (this.selectedChats.has(chatId)) {
            this.selectedChats.delete(chatId);
        } else {
            this.selectedChats.add(chatId);
        }
        
        // Update UI
        const item = this.shadowRoot.querySelector(`.chat-item[data-id="${chatId}"]`);
        if (item) {
            item.classList.toggle('selected');
        }
        
        // Trigger event
        this.dispatchEvent(new CustomEvent('chat-select', {
            detail: { chatId, selected: this.selectedChats.has(chatId) },
            bubbles: true
        }));
    }
    
    selectChat(chatId) {
        this.dispatchEvent(new CustomEvent('chat-select', {
            detail: { chatId, selected: false },
            bubbles: true
        }));
    }
    
    updateSelectionUI() {
        const checkboxes = this.shadowRoot.querySelectorAll('.selection-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.style.display = this.isSelecting ? 'flex' : 'none';
        });
    }
    
    archiveChat(chatId) {
        if (window.app) {
            window.app.state.chats = window.app.state.chats.map(chat => 
                chat.id === chatId ? { ...chat, isArchived: true } : chat
            );
            window.app.trigger('chats-updated', window.app.state.chats);
            window.app.showToast('Chat archived', 'success');
        }
    }
    
    deleteChat(chatId) {
        if (window.app) {
            if (confirm('Delete this chat? This action cannot be undone.')) {
                window.app.state.chats = window.app.state.chats.filter(chat => chat.id !== chatId);
                window.app.trigger('chats-updated', window.app.state.chats);
                window.app.showToast('Chat deleted', 'success');
            }
        }
    }
}

// === WA-STATUS-LIST COMPONENT ===
class WAStatusList extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.render();
    }
    
    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    height: 100%;
                    overflow-y: auto;
                    background: var(--wa-surface);
                }
                
                .status-list {
                    padding: var(--wa-space-md) 0;
                }
                
                .status-section {
                    margin-bottom: var(--wa-space-xl);
                }
                
                .section-title {
                    padding: var(--wa-space-sm) var(--wa-space-lg);
                    color: var(--wa-text-secondary);
                    font-size: var(--wa-font-size-sm);
                    font-weight: var(--wa-font-weight-medium);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                .my-status {
                    margin: 0 var(--wa-space-lg) var(--wa-space-lg);
                    background: var(--wa-surface-secondary);
                    border-radius: var(--wa-radius-md);
                    overflow: hidden;
                }
                
                .status-item {
                    display: flex;
                    align-items: center;
                    padding: var(--wa-space-md) var(--wa-space-lg);
                    cursor: pointer;
                    transition: background-color var(--wa-transition-fast);
                    border-bottom: 1px solid var(--wa-border-light);
                }
                
                .status-item:last-child {
                    border-bottom: none;
                }
                
                .status-item:hover {
                    background: var(--wa-border-light);
                }
                
                .status-avatar {
                    position: relative;
                    margin-right: var(--wa-space-md);
                }
                
                .status-ring {
                    width: 56px;
                    height: 56px;
                    border-radius: 50%;
                    padding: 2px;
                    background: linear-gradient(45deg, var(--wa-primary), var(--wa-accent-green));
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .status-ring.unviewed {
                    background: linear-gradient(45deg, var(--wa-primary-light), var(--wa-accent-blue));
                }
                
                .status-ring.my {
                    background: linear-gradient(45deg, var(--wa-border-dark), var(--wa-text-tertiary));
                }
                
                .status-avatar-img {
                    width: 52px;
                    height: 52px;
                    border-radius: 50%;
                    background: var(--wa-surface);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--wa-text-primary);
                    font-weight: var(--wa-font-weight-bold);
                    font-size: 20px;
                }
                
                .add-status {
                    position: absolute;
                    bottom: 0;
                    right: 0;
                    background: var(--wa-primary);
                    color: white;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 2px solid var(--wa-surface);
                    font-size: 16px;
                }
                
                .status-content {
                    flex: 1;
                }
                
                .status-name {
                    font-size: var(--wa-font-size-md);
                    font-weight: var(--wa-font-weight-medium);
                    color: var(--wa-text-primary);
                    margin-bottom: 2px;
                }
                
                .status-time {
                    font-size: var(--wa-font-size-sm);
                    color: var(--wa-text-secondary);
                }
                
                .viewed-status {
                    font-size: var(--wa-font-size-xs);
                    color: var(--wa-primary);
                    font-weight: var(--wa-font-weight-medium);
                }
                
                .empty-state {
                    text-align: center;
                    padding: var(--wa-space-xxl) var(--wa-space-lg);
                    color: var(--wa-text-secondary);
                }
                
                .empty-icon {
                    font-size: 48px;
                    margin-bottom: var(--wa-space-md);
                    opacity: 0.5;
                }
                
                .recent-updates {
                    margin-top: var(--wa-space-xl);
                }
            </style>
            
            <div class="status-list">
                <div class="status-section">
                    <div class="section-title">My status</div>
                    <div class="my-status">
                        <div class="status-item">
                            <div class="status-avatar">
                                <div class="status-ring my">
                                    <div class="status-avatar-img">😊</div>
                                </div>
                                <div class="add-status">+</div>
                            </div>
                            <div class="status-content">
                                <div class="status-name">My status</div>
                                <div class="status-time">Tap to add status update</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="status-section recent-updates">
                    <div class="section-title">Recent updates</div>
                    <div class="empty-state">
                        <div class="empty-icon">📺</div>
                        <h3>No status updates</h3>
                        <p>When your contacts share updates, they'll appear here</p>
                    </div>
                </div>
            </div>
        `;
    }
}

// === WA-CALLS-LIST COMPONENT ===
class WACallsList extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.render();
    }
    
    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    height: 100%;
                    overflow-y: auto;
                    background: var(--wa-surface);
                }
                
                .calls-list {
                    padding: var(--wa-space-md) 0;
                }
                
                .call-item {
                    display: flex;
                    align-items: center;
                    padding: var(--wa-space-md) var(--wa-space-lg);
                    cursor: pointer;
                    transition: background-color var(--wa-transition-fast);
                    border-bottom: 1px solid var(--wa-border-light);
                }
                
                .call-item:last-child {
                    border-bottom: none;
                }
                
                .call-item:hover {
                    background: var(--wa-border-light);
                }
                
                .call-item.missed .call-name {
                    color: var(--wa-accent-red);
                }
                
                .call-avatar {
                    margin-right: var(--wa-space-md);
                }
                
                .call-avatar-img {
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, var(--wa-text-secondary), #91999e);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: var(--wa-font-weight-bold);
                    font-size: 18px;
                }
                
                .call-content {
                    flex: 1;
                }
                
                .call-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2px;
                }
                
                .call-name {
                    font-size: var(--wa-font-size-md);
                    font-weight: var(--wa-font-weight-medium);
                    color: var(--wa-text-primary);
                }
                
                .call-time {
                    font-size: var(--wa-font-size-xs);
                    color: var(--wa-text-secondary);
                }
                
                .call-details {
                    display: flex;
                    align-items: center;
                    gap: var(--wa-space-xs);
                    font-size: var(--wa-font-size-sm);
                    color: var(--wa-text-secondary);
                }
                
                .call-type {
                    font-size: 14px;
                }
                
                .call-type.incoming {
                    color: var(--wa-accent-green);
                }
                
                .call-type.outgoing {
                    color: var(--wa-primary);
                }
                
                .call-type.missed {
                    color: var(--wa-accent-red);
                }
                
                .call-action {
                    margin-left: var(--wa-space-md);
                }
                
                .call-btn {
                    background: var(--wa-primary);
                    color: white;
                    border: none;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                    cursor: pointer;
                    transition: transform var(--wa-transition-fast);
                }
                
                .call-btn:hover {
                    transform: scale(1.05);
                }
                
                .empty-state {
                    text-align: center;
                    padding: var(--wa-space-xxl) var(--wa-space-lg);
                    color: var(--wa-text-secondary);
                }
                
                .empty-icon {
                    font-size: 48px;
                    margin-bottom: var(--wa-space-md);
                    opacity: 0.5;
                }
            </style>
            
            <div class="calls-list">
                <div class="empty-state">
                    <div class="empty-icon">📞</div>
                    <h3>No calls yet</h3>
                    <p>Calls you make and receive will appear here</p>
                </div>
            </div>
        `;
    }
}

// === WA-BOTTOM-NAV COMPONENT (Mobile) ===
class WABottomNav extends HTMLElement {
    constructor() {
        super();
        if (PlatformDetector.isDesktop()) {
            this.style.display = 'none';
            return;
        }
        
        this.attachShadow({ mode: 'open' });
        this.unreadCounts = { chats: 0, status: 0, calls: 0 };
        this.render();
    }
    
    connectedCallback() {
        this.setupEventListeners();
        this.setupAppStateListener();
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
                    z-index: var(--wa-z-header);
                    padding-bottom: env(safe-area-inset-bottom, 0);
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
                    font-size: var(--wa-font-size-xs);
                    cursor: pointer;
                    transition: color var(--wa-transition-fast);
                    position: relative;
                }
                
                .nav-item.active {
                    color: var(--wa-primary);
                }
                
                .nav-icon {
                    font-size: 20px;
                    margin-bottom: 2px;
                    position: relative;
                }
                
                .nav-badge {
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    background: var(--wa-accent-red);
                    color: white;
                    font-size: 10px;
                    min-width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2px;
                }
                
                /* Dark mode */
                @media (prefers-color-scheme: dark) {
                    :host {
                        background: var(--wa-background);
                        border-color: var(--wa-border);
                    }
                }
            </style>
            
            <nav class="nav">
                <button class="nav-item active" data-tab="chats">
                    <span class="nav-icon">
                        💬
                        ${this.unreadCounts.chats > 0 ? `<span class="nav-badge">${this.unreadCounts.chats}</span>` : ''}
                    </span>
                    <span>Chats</span>
                </button>
                <button class="nav-item" data-tab="status">
                    <span class="nav-icon">
                        📺
                        ${this.unreadCounts.status > 0 ? `<span class="nav-badge">${this.unreadCounts.status}</span>` : ''}
                    </span>
                    <span>Status</span>
                </button>
                <button class="nav-item" data-tab="calls">
                    <span class="nav-icon">
                        📞
                        ${this.unreadCounts.calls > 0 ? `<span class="nav-badge">${this.unreadCounts.calls}</span>` : ''}
                    </span>
                    <span>Calls</span>
                </button>
            </nav>
        `;
    }
    
    setupEventListeners() {
        this.shadowRoot.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.dispatchTabChange(tabName);
            });
        });
    }
    
    setupAppStateListener() {
        if (window.app) {
            window.app.on('unread-update', (counts) => {
                this.unreadCounts = counts;
                this.updateBadges();
            });
            
            window.app.on('tab-change', (tab) => {
                this.updateActiveTab(tab);
            });
        }
    }
    
    updateBadges() {
        this.shadowRoot.querySelectorAll('.nav-badge').forEach(badge => badge.remove());
        
        ['chats', 'status', 'calls'].forEach(tabName => {
            const count = this.unreadCounts[tabName];
            if (count > 0) {
                const tab = this.shadowRoot.querySelector(`.nav-item[data-tab="${tabName}"] .nav-icon`);
                const badge = document.createElement('span');
                badge.className = 'nav-badge';
                badge.textContent = count > 99 ? '99+' : count;
                tab.appendChild(badge);
            }
        });
    }
    
    updateActiveTab(activeTab) {
        this.shadowRoot.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.tab === activeTab);
        });
    }
    
    dispatchTabChange(tab) {
        this.dispatchEvent(new CustomEvent('tab-change', {
            detail: { tab },
            bubbles: true,
            composed: true
        }));
    }
}

// === WA-SIDEBAR COMPONENT (Desktop Enhanced) ===
class WASidebar extends HTMLElement {
    constructor() {
        super();
        if (!PlatformDetector.isDesktop()) {
            this.style.display = 'none';
            return;
        }
        
        this.attachShadow({ mode: 'open' });
        this.render();
    }
    
    connectedCallback() {
        this.setupEventListeners();
    }
    
    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 280px;
                    background: var(--wa-surface);
                    border-right: 1px solid var(--wa-border);
                    height: 100%;
                    overflow-y: auto;
                }
                
                .sidebar-header {
                    padding: var(--wa-space-lg);
                    border-bottom: 1px solid var(--wa-border);
                }
                
                .profile {
                    display: flex;
                    align-items: center;
                    gap: var(--wa-space-md);
                    margin-bottom: var(--wa-space-lg);
                    cursor: pointer;
                    padding: var(--wa-space-sm);
                    border-radius: var(--wa-radius-md);
                    transition: background-color var(--wa-transition-fast);
                }
                
                .profile:hover {
                    background: var(--wa-border-light);
                }
                
                .profile-avatar {
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, var(--wa-primary), var(--wa-primary-light));
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: var(--wa-font-weight-bold);
                    font-size: 18px;
                }
                
                .profile-info {
                    flex: 1;
                }
                
                .profile-name {
                    font-size: var(--wa-font-size-md);
                    font-weight: var(--wa-font-weight-medium);
                    color: var(--wa-text-primary);
                    margin-bottom: 2px;
                }
                
                .profile-status {
                    font-size: var(--wa-font-size-sm);
                    color: var(--wa-text-secondary);
                }
                
                .search-box {
                    width: 100%;
                    padding: var(--wa-space-sm) var(--wa-space-md);
                    border: 1px solid var(--wa-border-dark);
                    border-radius: var(--wa-radius-lg);
                    background: var(--wa-surface-secondary);
                    font-size: var(--wa-font-size-sm);
                    color: var(--wa-text-primary);
                    outline: none;
                    transition: all var(--wa-transition-fast);
                }
                
                .search-box:focus {
                    border-color: var(--wa-primary);
                    background: var(--wa-surface);
                }
                
                .sidebar-nav {
                    padding: var(--wa-space-md) 0;
                }
                
                .nav-item {
                    display: flex;
                    align-items: center;
                    gap: var(--wa-space-md);
                    padding: var(--wa-space-md) var(--wa-space-lg);
                    background: none;
                    border: none;
                    width: 100%;
                    text-align: left;
                    cursor: pointer;
                    transition: background-color var(--wa-transition-fast);
                    color: var(--wa-text-primary);
                    font-size: var(--wa-font-size-md);
                }
                
                .nav-item:hover {
                    background: var(--wa-border-light);
                }
                
                .nav-item.active {
                    background: rgba(7, 94, 84, 0.1);
                    color: var(--wa-primary);
                    font-weight: var(--wa-font-weight-medium);
                }
                
                .nav-icon {
                    font-size: 18px;
                    width: 24px;
                    text-align: center;
                }
                
                .nav-badge {
                    margin-left: auto;
                    background: var(--wa-accent-green);
                    color: white;
                    font-size: var(--wa-font-size-xs);
                    padding: 2px 6px;
                    border-radius: var(--wa-radius-full);
                    font-weight: var(--wa-font-weight-bold);
                }
                
                .sidebar-footer {
                    padding: var(--wa-space-lg);
                    border-top: 1px solid var(--wa-border);
                    margin-top: auto;
                }
                
                .footer-text {
                    font-size: var(--wa-font-size-xs);
                    color: var(--wa-text-tertiary);
                    text-align: center;
                }
                
                /* Dark mode */
                @media (prefers-color-scheme: dark) {
                    :host {
                        background: var(--wa-background);
                        border-color: var(--wa-border);
                    }
                    
                    .nav-item.active {
                        background: rgba(0, 128, 105, 0.1);
                    }
                }
            </style>
            
            <div class="sidebar-header">
                <div class="profile">
                    <div class="profile-avatar">😊</div>
                    <div class="profile-info">
                        <div class="profile-name">Your Name</div>
                        <div class="profile-status">Online</div>
                    </div>
                </div>
                <input type="text" class="search-box" placeholder="Search or start new chat">
            </div>
            
            <nav class="sidebar-nav">
                <button class="nav-item active" data-tab="chats">
                    <span class="nav-icon">💬</span>
                    <span>Chats</span>
                    <span class="nav-badge">12</span>
                </button>
                <button class="nav-item" data-tab="status">
                    <span class="nav-icon">📺</span>
                    <span>Status</span>
                </button>
                <button class="nav-item" data-tab="calls">
                    <span class="nav-icon">📞</span>
                    <span>Calls</span>
                    <span class="nav-badge">3</span>
                </button>
                <button class="nav-item" data-tab="communities">
                    <span class="nav-icon">🏠</span>
                    <span>Communities</span>
                </button>
                <button class="nav-item" data-tab="archived">
                    <span class="nav-icon">📁</span>
                    <span>Archived</span>
                    <span class="nav-badge">24</span>
                </button>
                <button class="nav-item" data-tab="starred">
                    <span class="nav-icon">⭐</span>
                    <span>Starred Messages</span>
                </button>
                <button class="nav-item" data-tab="settings">
                    <span class="nav-icon">⚙️</span>
                    <span>Settings</span>
                </button>
            </nav>
            
            <div class="sidebar-footer">
                <div class="footer-text">
                    Your personal messages are secured with end-to-end encryption
                </div>
            </div>
        `;
    }
    
    setupEventListeners() {
        this.shadowRoot.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.dispatchTabChange(tabName);
            });
        });
        
        const searchBox = this.shadowRoot.querySelector('.search-box');
        searchBox.addEventListener('focus', () => {
            this.dispatchEvent(new CustomEvent('search-toggle', { bubbles: true }));
        });
    }
    
    dispatchTabChange(tab) {
        this.dispatchEvent(new CustomEvent('tab-change', {
            detail: { tab },
            bubbles: true,
            composed: true
        }));
    }
}

// === WA-FAB COMPONENT (Enhanced) ===
class WAFab extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.isMenuOpen = false;
        this.render();
    }
    
    connectedCallback() {
        this.setupEventListeners();
        this.setupAppStateListener();
    }
    
    render() {
        const isDesktop = PlatformDetector.isDesktop();
        const currentTab = window.app ? window.app.state.currentTab : 'chats';
        
        let icon = '💬';
        let title = 'New chat';
        
        switch(currentTab) {
            case 'status':
                icon = '📷';
                title = 'New status';
                break;
            case 'calls':
                icon = '📞';
                title = 'New call';
                break;
        }
        
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    position: fixed;
                    ${isDesktop ? 'bottom: var(--wa-space-xl); right: var(--wa-space-xl);' : 'bottom: 80px; right: var(--wa-space-lg);'}
                    z-index: var(--wa-z-fab);
                    transition: transform var(--wa-transition-normal);
                }
                
                :host(.hidden) {
                    transform: scale(0);
                }
                
                .fab {
                    width: 56px;
                    height: 56px;
                    border-radius: 50%;
                    background: var(--wa-accent-green);
                    color: white;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: var(--wa-shadow-lg);
                    transition: all var(--wa-transition-normal);
                    position: relative;
                }
                
                .fab:hover {
                    transform: scale(1.05);
                    box-shadow: 0 8px 24px rgba(37, 211, 102, 0.4);
                }
                
                .fab:active {
                    transform: scale(0.95);
                }
                
                .fab.menu-open {
                    transform: rotate(45deg);
                    background: var(--wa-accent-red);
                }
                
                .ripple {
                    position: absolute;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.6);
                    transform: scale(0);
                    animation: ripple 600ms ease-out;
                }
                
                @keyframes ripple {
                    to {
                        transform: scale(4);
                        opacity: 0;
                    }
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
            
            <button class="fab" title="${title}">
                ${icon}
            </button>
        `;
    }
    
    setupEventListeners() {
        const fab = this.shadowRoot.querySelector('.fab');
        
        fab.addEventListener('click', (e) => {
            this.createRipple(e);
            
            if (window.app && window.app.state.currentTab === 'chats') {
                this.toggleMenu();
            } else {
                this.handleFabClick();
            }
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isMenuOpen && !this.contains(e.target)) {
                this.closeMenu();
            }
        });
    }
    
    setupAppStateListener() {
        if (window.app) {
            window.app.on('tab-change', (tab) => {
                this.updateFabIcon(tab);
            });
        }
    }
    
    createRipple(event) {
        const fab = this.shadowRoot.querySelector('.fab');
        const circle = document.createElement('span');
        const diameter = Math.max(fab.clientWidth, fab.clientHeight);
        const radius = diameter / 2;
        
        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${event.clientX - fab.getBoundingClientRect().left - radius}px`;
        circle.style.top = `${event.clientY - fab.getBoundingClientRect().top - radius}px`;
        circle.classList.add('ripple');
        
        fab.appendChild(circle);
        
        setTimeout(() => {
            circle.remove();
        }, 600);
    }
    
    updateFabIcon(tab) {
        const fab = this.shadowRoot.querySelector('.fab');
        if (!fab) return;
        
        switch(tab) {
            case 'chats':
                fab.innerHTML = '💬';
                fab.title = 'New chat';
                break;
            case 'status':
                fab.innerHTML = '📷';
                fab.title = 'New status';
                break;
            case 'calls':
                fab.innerHTML = '📞';
                fab.title = 'New call';
                break;
        }
    }
    
    toggleMenu() {
        this.isMenuOpen = !this.isMenuOpen;
        const fab = this.shadowRoot.querySelector('.fab');
        
        if (this.isMenuOpen) {
            fab.classList.add('menu-open');
            this.openMenu();
        } else {
            fab.classList.remove('menu-open');
            this.closeMenu();
        }
    }
    
    openMenu() {
        const menu = document.getElementById('fabMenu');
        if (menu) {
            menu.hidden = false;
            menu.style.animation = 'scaleIn 200ms ease';
        }
    }
    
    closeMenu() {
        const menu = document.getElementById('fabMenu');
        if (menu) {
            menu.style.animation = 'scaleOut 200ms ease';
            setTimeout(() => {
                menu.hidden = true;
            }, 200);
        }
        this.isMenuOpen = false;
        this.shadowRoot.querySelector('.fab').classList.remove('menu-open');
    }
    
    handleFabClick() {
        const tab = window.app ? window.app.state.currentTab : 'chats';
        
        switch(tab) {
            case 'chats':
                this.dispatchEvent(new CustomEvent('new-chat', { bubbles: true }));
                break;
            case 'status':
                this.dispatchEvent(new CustomEvent('new-status', { bubbles: true }));
                break;
            case 'calls':
                this.dispatchEvent(new CustomEvent('new-call', { bubbles: true }));
                break;
        }
    }
}

// === REGISTER ALL COMPONENTS ===
customElements.define('wa-header', WAHeader);
customElements.define('wa-tab-bar', WATabBar);
customElements.define('wa-chat-list', WAChatList);
customElements.define('wa-status-list', WAStatusList);
customElements.define('wa-calls-list', WACallsList);
customElements.define('wa-bottom-nav', WABottomNav);
customElements.define('wa-sidebar', WASidebar);
customElements.define('wa-fab', WAFab);

console.log('✅ WhatsApp Components registered');
