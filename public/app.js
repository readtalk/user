// === WHATSAPP LOBBY CONTROLLER (Enhanced) ===
class WhatsAppLobby {
    constructor() {
        this.state = {
            currentTab: 'chats',
            chats: [],
            statusUpdates: [],
            calls: [],
            selectedChats: new Set(),
            searchQuery: '',
            unreadCounts: { chats: 0, status: 0, calls: 0 },
            online: navigator.onLine,
            platform: this.detectPlatform(),
            pwaInstalled: false,
            isSearching: false,
            isSelecting: false,
            lastSync: null,
            connectionQuality: 'good',
            batteryLevel: null,
            theme: this.detectTheme()
        };
        
        this.listeners = new Map();
        this.init();
    }
    
    detectPlatform() {
        const ua = navigator.userAgent;
        const width = window.innerWidth;
        
        if (width >= 1024) return 'desktop';
        if (width >= 768) return 'tablet';
        if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
        if (/Android/.test(ua)) return 'android';
        return 'mobile';
    }
    
    detectTheme() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    async init() {
        console.log('🚀 WhatsApp Lobby initializing...');
        
        // 1. Setup theme detection
        this.setupThemeListener();
        
        // 2. Check PWA installation
        this.checkPWAInstallation();
        
        // 3. Setup event listeners
        this.setupEventListeners();
        
        // 4. Load initial data
        await this.loadInitialData();
        
        // 5. Setup offline detection
        this.setupOfflineDetection();
        
        // 6. Setup battery monitoring
        this.setupBatteryMonitoring();
        
        // 7. Start sync if online
        if (this.state.online) {
            this.startSync();
        }
        
        // 8. Update UI
        this.updateUI();
        
        // 9. Register service worker
        this.registerServiceWorker();
        
        console.log('✅ WhatsApp Lobby initialized on:', this.state.platform);
    }
    
    setupThemeListener() {
        const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        darkModeMediaQuery.addEventListener('change', (e) => {
            this.state.theme = e.matches ? 'dark' : 'light';
            this.updateTheme();
        });
    }
    
    updateTheme() {
        document.documentElement.classList.toggle('dark-theme', this.state.theme === 'dark');
        document.documentElement.classList.toggle('light-theme', this.state.theme === 'light');
        
        // Update status bar color
        const statusBar = document.querySelector('.status-bar');
        if (statusBar) {
            statusBar.style.backgroundColor = this.state.theme === 'dark' ? '#111B21' : '#008069';
        }
    }
    
    checkPWAInstallation() {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                           window.navigator.standalone ||
                           document.referrer.includes('android-app://');
        
        this.state.pwaInstalled = isStandalone;
        
        // Show install prompt if not installed and on mobile
        if (!isStandalone && (this.state.platform === 'android' || this.state.platform === 'ios')) {
            setTimeout(() => this.showInstallPrompt(), 3000);
        }
    }
    
    showInstallPrompt() {
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            
            // Show prompt after delay
            setTimeout(() => {
                if (!this.state.pwaInstalled) {
                    const prompt = document.getElementById('installPrompt');
                    prompt && (prompt.hidden = false);
                }
            }, 5000);
        });
        
        // Make install function globally available
        window.installPWA = async () => {
            if (!deferredPrompt) return;
            
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                this.state.pwaInstalled = true;
                document.getElementById('installPrompt').hidden = true;
                this.trigger('pwa-installed');
            }
            
            deferredPrompt = null;
        };
        
        window.dismissInstall = () => {
            document.getElementById('installPrompt').hidden = true;
        };
    }
    
    setupEventListeners() {
        // Tab changes
        this.on('tab-change', (tab) => {
            this.state.currentTab = tab;
            this.updateTabContent();
            this.updateFABContext(tab);
        });
        
        // Chat selection
        this.on('chat-select', (chatId) => {
            if (this.state.isSelecting) {
                this.toggleChatSelection(chatId);
            } else {
                this.openChat(chatId);
            }
        });
        
        // Multi-select mode
        this.on('select-mode-toggle', () => {
            this.state.isSelecting = !this.state.isSelecting;
            this.updateSelectionMode();
        });
        
        // Search
        this.on('search-toggle', () => {
            this.state.isSearching = !this.state.isSearching;
            this.toggleSearch();
        });
        
        // New chat/group/community
        this.on('new-chat', () => this.createNewChat());
        this.on('new-group', () => this.createNewGroup());
        this.on('new-community', () => this.createNewCommunity());
        
        // Selection actions
        this.on('selection-action', (action) => {
            this.handleSelectionAction(action);
        });
        
        // Keyboard shortcuts (Desktop)
        if (this.state.platform === 'desktop') {
            document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        }
        
        // Swipe gestures (Mobile)
        this.setupSwipeGestures();
        
        // Pull to refresh
        this.setupPullToRefresh();
    }
    
    setupSwipeGestures() {
        if (this.state.platform === 'ios' || this.state.platform === 'android') {
            let startX, startY;
            
            document.addEventListener('touchstart', (e) => {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
            }, { passive: true });
            
            document.addEventListener('touchend', (e) => {
                if (!startX || !startY) return;
                
                const endX = e.changedTouches[0].clientX;
                const endY = e.changedTouches[0].clientY;
                
                const diffX = startX - endX;
                const diffY = startY - endY;
                
                // Horizontal swipe (min 50px)
                if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
                    if (diffX > 0) {
                        this.swipeLeft();
                    } else {
                        this.swipeRight();
                    }
                }
                
                startX = null;
                startY = null;
            }, { passive: true });
        }
    }
    
    swipeLeft() {
        const tabs = ['chats', 'status', 'calls'];
        const currentIndex = tabs.indexOf(this.state.currentTab);
        if (currentIndex < tabs.length - 1) {
            this.trigger('tab-change', tabs[currentIndex + 1]);
        }
    }
    
    swipeRight() {
        const tabs = ['chats', 'status', 'calls'];
        const currentIndex = tabs.indexOf(this.state.currentTab);
        if (currentIndex > 0) {
            this.trigger('tab-change', tabs[currentIndex - 1]);
        }
    }
    
    setupPullToRefresh() {
        let startY;
        const mainContent = document.getElementById('mainContent');
        
        if (!mainContent) return;
        
        mainContent.addEventListener('touchstart', (e) => {
            if (mainContent.scrollTop === 0) {
                startY = e.touches[0].clientY;
            }
        }, { passive: true });
        
        mainContent.addEventListener('touchmove', (e) => {
            if (!startY) return;
            
            const currentY = e.touches[0].clientY;
            const diff = currentY - startY;
            
            if (diff > 0) {
                e.preventDefault();
                this.showPullToRefresh(diff);
            }
        });
        
        mainContent.addEventListener('touchend', () => {
            if (startY) {
                this.hidePullToRefresh();
                this.refreshData();
                startY = null;
            }
        });
    }
    
    showPullToRefresh(distance) {
        // Implement pull-to-refresh UI
        console.log('Pull to refresh:', distance);
    }
    
    setupBatteryMonitoring() {
        if ('getBattery' in navigator) {
            navigator.getBattery().then(battery => {
                this.state.batteryLevel = battery.level * 100;
                
                battery.addEventListener('levelchange', () => {
                    this.state.batteryLevel = battery.level * 100;
                    this.updateConnectionQuality();
                });
                
                battery.addEventListener('chargingchange', () => {
                    this.updateConnectionQuality();
                });
            });
        }
    }
    
    updateConnectionQuality() {
        if (!this.state.online) {
            this.state.connectionQuality = 'offline';
        } else if (this.state.batteryLevel < 20) {
            this.state.connectionQuality = 'poor';
        } else {
            this.state.connectionQuality = 'good';
        }
        
        this.updateNetworkStatus();
    }
    
    async loadInitialData() {
        try {
            // Load from IndexedDB first
            const [chats, status, calls] = await Promise.all([
                this.loadFromIndexedDB('chats'),
                this.loadFromIndexedDB('status'),
                this.loadFromIndexedDB('calls')
            ]);
            
            this.state.chats = chats.length > 0 ? chats : this.getDefaultChats();
            this.state.statusUpdates = status.length > 0 ? status : this.getDefaultStatus();
            this.state.calls = calls.length > 0 ? calls : this.getDefaultCalls();
            
            // Calculate unread counts
            this.calculateUnreadCounts();
            
        } catch (error) {
            console.error('Failed to load initial data:', error);
            // Load defaults
            this.state.chats = this.getDefaultChats();
            this.state.statusUpdates = this.getDefaultStatus();
            this.state.calls = this.getDefaultCalls();
        }
    }
    
    getDefaultChats() {
        return [
            {
                id: '1',
                name: 'Family Group',
                avatar: '👨‍👩‍👧‍👦',
                lastMessage: 'Dinner at 7! 🍽️',
                timestamp: Date.now() - 3600000, // 1 hour ago
                unread: 12,
                isPinned: true,
                isMuted: false,
                isArchived: false,
                isGroup: true,
                participants: 8,
                online: true,
                lastMessageStatus: 'read',
                typing: false
            },
            {
                id: '2',
                name: 'Mom',
                avatar: '👩',
                lastMessage: 'Call me when you\'re free ❤️',
                timestamp: Date.now() - 7200000, // 2 hours ago
                unread: 3,
                isPinned: true,
                isMuted: false,
                isArchived: false,
                isGroup: false,
                online: true,
                lastMessageStatus: 'delivered',
                typing: false
            },
            {
                id: '3',
                name: 'Work Team',
                avatar: '💼',
                lastMessage: 'Meeting moved to 3 PM',
                timestamp: Date.now() - 86400000, // 1 day ago
                unread: 0,
                isPinned: false,
                isMuted: true,
                isArchived: false,
                isGroup: true,
                participants: 15,
                online: true,
                lastMessageStatus: 'read',
                typing: true
            },
            {
                id: '4',
                name: 'Alex Johnson',
                avatar: '👨',
                lastMessage: 'Thanks for the document! 📎',
                timestamp: Date.now() - 172800000, // 2 days ago
                unread: 0,
                isPinned: false,
                isMuted: false,
                isArchived: true,
                isGroup: false,
                online: false,
                lastMessageStatus: 'read',
                typing: false
            }
        ];
    }
    
    getDefaultStatus() {
        return [
            {
                id: 's1',
                name: 'My Status',
                avatar: '😊',
                timestamp: Date.now() - 1800000, // 30 minutes ago
                isMyStatus: true,
                unviewed: false
            },
            {
                id: 's2',
                name: 'Sarah',
                avatar: '👩‍🦰',
                timestamp: Date.now() - 3600000, // 1 hour ago
                isMyStatus: false,
                unviewed: true
            },
            {
                id: 's3',
                name: 'John Doe',
                avatar: '👨‍💼',
                timestamp: Date.now() - 7200000, // 2 hours ago
                isMyStatus: false,
                unviewed: false
            }
        ];
    }
    
    getDefaultCalls() {
        return [
            {
                id: 'c1',
                name: 'Mom',
                avatar: '👩',
                timestamp: Date.now() - 3600000,
                type: 'outgoing',
                duration: '5:32',
                missed: false,
                video: false
            },
            {
                id: 'c2',
                name: 'Dad',
                avatar: '👨',
                timestamp: Date.now() - 86400000,
                type: 'incoming',
                duration: '2:15',
                missed: false,
                video: true
            },
            {
                id: 'c3',
                name: 'Unknown',
                avatar: '📞',
                timestamp: Date.now() - 172800000,
                type: 'incoming',
                duration: '0:00',
                missed: true,
                video: false
            }
        ];
    }
    
    calculateUnreadCounts() {
        this.state.unreadCounts.chats = this.state.chats.reduce((sum, chat) => sum + chat.unread, 0);
        this.state.unreadCounts.status = this.state.statusUpdates.filter(s => s.unviewed && !s.isMyStatus).length;
        this.state.unreadCounts.calls = this.state.calls.filter(c => c.missed).length;
        
        // Update badge in title
        const totalUnread = this.state.unreadCounts.chats + this.state.unreadCounts.status + this.state.unreadCounts.calls;
        document.title = totalUnread > 0 ? `(${totalUnread}) WhatsApp` : 'WhatsApp';
        
        // Trigger UI update
        this.trigger('unread-update', this.state.unreadCounts);
    }
    
    setupOfflineDetection() {
        window.addEventListener('online', () => {
            this.state.online = true;
            this.updateConnectionQuality();
            this.startSync();
            this.showToast('Back online', 'success');
        });
        
        window.addEventListener('offline', () => {
            this.state.online = false;
            this.updateConnectionQuality();
            this.stopSync();
            this.showToast('You\'re offline', 'warning');
        });
    }
    
    updateNetworkStatus() {
        const networkStatus = document.getElementById('networkStatus');
        if (!networkStatus) return;
        
        if (!this.state.online) {
            networkStatus.hidden = false;
            networkStatus.querySelector('.network-text').textContent = 'No internet connection';
            networkStatus.style.background = '#F44336';
        } else if (this.state.connectionQuality === 'poor') {
            networkStatus.hidden = false;
            networkStatus.querySelector('.network-text').textContent = 'Poor connection';
            networkStatus.style.background = '#FF9800';
        } else {
            networkStatus.hidden = true;
        }
    }
    
    startSync() {
        // Clear existing interval
        this.stopSync();
        
        // Start new sync interval
        this.syncInterval = setInterval(() => {
            this.syncWithServer();
        }, 30000); // Every 30 seconds
        
        // Initial sync
        this.syncWithServer();
    }
    
    stopSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }
    
    async syncWithServer() {
        if (!this.state.online) return;
        
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Update last sync timestamp
            this.state.lastSync = Date.now();
            
            // Simulate new message
            const newChat = {
                id: `new-${Date.now()}`,
                name: 'WhatsApp',
                avatar: '💚',
                lastMessage: 'Welcome to WhatsApp! Start chatting with your contacts.',
                timestamp: Date.now(),
                unread: 1,
                isPinned: false,
                isMuted: false,
                isArchived: false,
                isGroup: false,
                online: true,
                lastMessageStatus: 'sent',
                typing: false
            };
            
            // Add to beginning of chats
            this.state.chats.unshift(newChat);
            
            // Update unread counts
            this.calculateUnreadCounts();
            
            // Trigger UI update
            this.trigger('chats-updated', this.state.chats);
            
        } catch (error) {
            console.error('Sync failed:', error);
        }
    }
    
    updateTabContent() {
        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Show active tab content
        const activeTab = document.querySelector(`.tab-content[data-tab="${this.state.currentTab}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
        
        // Update tab indicators
        document.querySelectorAll('[data-tab]').forEach(element => {
            element.classList.toggle('active', element.dataset.tab === this.state.currentTab);
        });
    }
    
    updateFABContext(tab) {
        const fab = document.querySelector('wa-fab');
        if (!fab) return;
        
        const shadowRoot = fab.shadowRoot;
        const fabButton = shadowRoot.querySelector('.fab');
        
        switch(tab) {
            case 'chats':
                fabButton.innerHTML = '💬';
                fabButton.title = 'New chat';
                break;
            case 'status':
                fabButton.innerHTML = '📷';
                fabButton.title = 'New status';
                break;
            case 'calls':
                fabButton.innerHTML = '📞';
                fabButton.title = 'New call';
                break;
        }
    }
    
    toggleSearch() {
        const searchOverlay = document.getElementById('searchOverlay');
        const searchInput = document.getElementById('searchInput');
        
        if (this.state.isSearching) {
            searchOverlay.hidden = false;
            setTimeout(() => searchInput?.focus(), 100);
        } else {
            searchOverlay.hidden = true;
            this.state.searchQuery = '';
            this.updateSearchResults();
        }
    }
    
    updateSearchResults() {
        const resultsContainer = document.getElementById('searchResults');
        if (!resultsContainer) return;
        
        if (!this.state.searchQuery.trim()) {
            resultsContainer.innerHTML = `
                <div class="search-empty">
                    <div class="search-empty-icon">🔍</div>
                    <h4>Search messages, contacts, or chats</h4>
                </div>
            `;
            return;
        }
        
        const query = this.state.searchQuery.toLowerCase();
        const filteredChats = this.state.chats.filter(chat =>
            chat.name.toLowerCase().includes(query) ||
            chat.lastMessage.toLowerCase().includes(query)
        );
        
        resultsContainer.innerHTML = filteredChats.map(chat => `
            <div class="search-result-item" data-chat-id="${chat.id}">
                <div class="search-result-avatar">${chat.avatar}</div>
                <div class="search-result-content">
                    <div class="search-result-name">${chat.name}</div>
                    <div class="search-result-preview">${chat.lastMessage}</div>
                </div>
            </div>
        `).join('');
    }
    
    updateSelectionMode() {
        const toolbar = document.getElementById('selectionToolbar');
        if (!toolbar) return;
        
        if (this.state.isSelecting) {
            toolbar.hidden = false;
        } else {
            toolbar.hidden = true;
            this.state.selectedChats.clear();
            this.updateSelectionCount();
        }
        
        // Update chat list selection state
        this.trigger('selection-mode-changed', this.state.isSelecting);
    }
    
    toggleChatSelection(chatId) {
        if (this.state.selectedChats.has(chatId)) {
            this.state.selectedChats.delete(chatId);
        } else {
            this.state.selectedChats.add(chatId);
        }
        
        this.updateSelectionCount();
    }
    
    updateSelectionCount() {
        const countElement = document.querySelector('.selection-count');
        if (countElement) {
            countElement.textContent = `${this.state.selectedChats.size} selected`;
        }
    }
    
    handleSelectionAction(action) {
        switch(action) {
            case 'archive':
                this.archiveSelectedChats();
                break;
            case 'delete':
                this.deleteSelectedChats();
                break;
            case 'mute':
                this.muteSelectedChats();
                break;
            case 'pin':
                this.pinSelectedChats();
                break;
            case 'close':
                this.state.isSelecting = false;
                this.updateSelectionMode();
                break;
        }
    }
    
    archiveSelectedChats() {
        this.state.chats = this.state.chats.map(chat => ({
            ...chat,
            isArchived: this.state.selectedChats.has(chat.id) ? true : chat.isArchived
        }));
        
        this.state.isSelecting = false;
        this.updateSelectionMode();
        this.trigger('chats-updated', this.state.chats);
        this.showToast('Chats archived', 'success');
    }
    
    deleteSelectedChats() {
        if (confirm(`Delete ${this.state.selectedChats.size} chat(s)? This action cannot be undone.`)) {
            this.state.chats = this.state.chats.filter(chat => !this.state.selectedChats.has(chat.id));
            this.state.isSelecting = false;
            this.updateSelectionMode();
            this.trigger('chats-updated', this.state.chats);
            this.showToast('Chats deleted', 'success');
        }
    }
    
    muteSelectedChats() {
        this.state.chats = this.state.chats.map(chat => ({
            ...chat,
            isMuted: this.state.selectedChats.has(chat.id) ? true : chat.isMuted
        }));
        
        this.state.isSelecting = false;
        this.updateSelectionMode();
        this.trigger('chats-updated', this.state.chats);
        this.showToast('Chats muted', 'success');
    }
    
    pinSelectedChats() {
        this.state.chats = this.state.chats.map(chat => ({
            ...chat,
            isPinned: this.state.selectedChats.has(chat.id) ? true : chat.isPinned
        }));
        
        // Sort: pinned first
        this.state.chats.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
        
        this.state.isSelecting = false;
        this.updateSelectionMode();
        this.trigger('chats-updated', this.state.chats);
        this.showToast('Chats pinned', 'success');
    }
    
    openChat(chatId) {
        console.log('Opening chat:', chatId);
        // In full app, would navigate to chat room
        this.showToast(`Opening chat ${chatId}`, 'info');
        
        // Mark as read
        this.state.chats = this.state.chats.map(chat => 
            chat.id === chatId ? { ...chat, unread: 0 } : chat
        );
        
        this.calculateUnreadCounts();
        this.trigger('chats-updated', this.state.chats);
    }
    
    createNewChat() {
        const contact = prompt('Enter contact name or number:');
        if (contact) {
            const newChat = {
                id: `chat-${Date.now()}`,
                name: contact,
                avatar: '👤',
                lastMessage: 'Say hi! 👋',
                timestamp: Date.now(),
                unread: 0,
                isPinned: false,
                isMuted: false,
                isArchived: false,
                isGroup: false,
                online: true,
                lastMessageStatus: 'sent',
                typing: false
            };
            
            this.state.chats.unshift(newChat);
            this.trigger('chats-updated', this.state.chats);
            this.showToast(`Chat created with ${contact}`, 'success');
        }
    }
    
    createNewGroup() {
        const groupName = prompt('Enter group name:');
        if (groupName) {
            const newGroup = {
                id: `group-${Date.now()}`,
                name: groupName,
                avatar: '👥',
                lastMessage: 'Group created',
                timestamp: Date.now(),
                unread: 0,
                isPinned: false,
                isMuted: false,
                isArchived: false,
                isGroup: true,
                participants: 1,
                online: true,
                lastMessageStatus: 'sent',
                typing: false
            };
            
            this.state.chats.unshift(newGroup);
            this.trigger('chats-updated', this.state.chats);
            this.showToast(`Group "${groupName}" created`, 'success');
        }
    }
    
    createNewCommunity() {
        const communityName = prompt('Enter community name:');
        if (communityName) {
            this.showToast(`Community "${communityName}" created`, 'success');
        }
    }
    
    handleKeyboardShortcuts(e) {
        // Don't trigger in input fields
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        switch(e.key) {
            case 'k':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.trigger('search-toggle');
                }
                break;
            case 'n':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.createNewChat();
                }
                break;
            case 'Escape':
                if (this.state.isSearching) {
                    this.state.isSearching = false;
                    this.toggleSearch();
                }
                if (this.state.isSelecting) {
                    this.state.isSelecting = false;
                    this.updateSelectionMode();
                }
                break;
            case '1': case '2': case '3':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    const tabs = ['chats', 'status', 'calls'];
                    const tabIndex = parseInt(e.key) - 1;
                    this.trigger('tab-change', tabs[tabIndex]);
                }
                break;
            case 'a':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    if (this.state.currentTab === 'chats') {
                        this.state.isSelecting = !this.state.isSelecting;
                        this.updateSelectionMode();
                    }
                }
                break;
        }
    }
    
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#F44336' : '#2196F3'};
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 9999;
            animation: toastSlideUp 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'toastSlideDown 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    updateUI() {
        this.updateTheme();
        this.updateTabContent();
        this.updateNetworkStatus();
        this.updateFABContext(this.state.currentTab);
    }
    
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('sw.js');
                console.log('ServiceWorker registered:', registration);
                
                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('ServiceWorker update found:', newWorker);
                });
                
            } catch (error) {
                console.error('ServiceWorker registration failed:', error);
            }
        }
    }
    
    // Event system
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }
    
    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }
    
    trigger(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => callback(data));
        }
    }
    
    // IndexedDB helpers
    async loadFromIndexedDB(storeName) {
        return new Promise((resolve) => {
            // Mock implementation
            setTimeout(() => resolve([]), 100);
        });
    }
    
    async saveToIndexedDB(storeName, data) {
        return new Promise((resolve) => {
            // Mock implementation
            setTimeout(() => resolve(true), 100);
        });
    }
    
    refreshData() {
        this.showToast('Refreshing...', 'info');
        setTimeout(() => {
            this.loadInitialData();
            this.showToast('Refreshed', 'success');
        }, 1000);
    }
}

// === INITIALIZE APP ===
document.addEventListener('DOMContentLoaded', () => {
    // Initialize app
    window.whatsAppLobby = new WhatsAppLobby();
    
    // Make app instance globally available
    window.app = window.whatsAppLobby;
    
    // Global search input handler
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            window.app.state.searchQuery = e.target.value;
            window.app.updateSearchResults();
        });
        
        const searchClear = searchInput.nextElementSibling;
        if (searchClear) {
            searchClear.addEventListener('click', () => {
                searchInput.value = '';
                window.app.state.searchQuery = '';
                window.app.updateSearchResults();
                searchInput.focus();
            });
            
            searchInput.addEventListener('input', () => {
                searchClear.hidden = !searchInput.value;
            });
        }
    }
    
    // Global close search handler
    window.closeSearch = () => {
        window.app.state.isSearching = false;
        window.app.toggleSearch();
    };
    
    // Add CSS for toast animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes toastSlideUp {
            from { transform: translate(-50%, 100%); opacity: 0; }
            to { transform: translate(-50%, 0); opacity: 1; }
        }
        @keyframes toastSlideDown {
            from { transform: translate(-50%, 0); opacity: 1; }
            to { transform: translate(-50%, 100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    console.log('📱 WhatsApp Lobby PWA ready!');
});
