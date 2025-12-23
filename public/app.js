// === APP STATE MANAGEMENT ===
class AppState {
    constructor() {
        this.state = {
            currentTab: 'chats',
            chats: [],
            selectedChat: null,
            unreadCount: 0,
            online: navigator.onLine,
            platform: this.detectPlatform(),
            pwaInstalled: false,
            lastUpdate: Date.now()
        };
        
        this.listeners = new Set();
    }
    
    detectPlatform() {
        if (PlatformDetector.isDesktop()) return 'desktop';
        if (PlatformDetector.isMobile()) return 'mobile';
        return 'unknown';
    }
    
    setState(updates) {
        const prevState = { ...this.state };
        this.state = { ...this.state, ...updates };
        this.notifyListeners(prevState, this.state);
    }
    
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    
    notifyListeners(prevState, newState) {
        this.listeners.forEach(listener => listener(prevState, newState));
    }
}

// === APP CONTROLLER ===
class WhatsAppLobby {
    constructor() {
        this.state = new AppState();
        this.init();
    }
    
    async init() {
        // 1. Check PWA installation
        this.checkPWAInstallation();
        
        // 2. Setup event listeners
        this.setupEventListeners();
        
        // 3. Load initial data
        await this.loadInitialData();
        
        // 4. Setup offline detection
        this.setupOfflineDetection();
        
        // 5. Start sync (if online)
        if (this.state.state.online) {
            this.startSync();
        }
        
        console.log('WhatsApp Lobby initialized on:', this.state.state.platform);
    }
    
    checkPWAInstallation() {
        // Check if running as standalone PWA
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                           window.navigator.standalone ||
                           document.referrer.includes('android-app://');
        
        this.state.setState({ pwaInstalled: isStandalone });
        
        // Show install prompt if not installed
        if (!isStandalone && PlatformDetector.isMobile()) {
            this.showInstallPrompt();
        }
    }
    
    showInstallPrompt() {
        // Deferred prompt for PWA installation
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            
            // Show install prompt after 5 seconds
            setTimeout(() => {
                const prompt = document.getElementById('installPrompt');
                if (prompt && !this.state.state.pwaInstalled) {
                    prompt.hidden = false;
                }
            }, 5000);
        });
        
        // Handle install button
        window.installPWA = async () => {
            if (!deferredPrompt) return;
            
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                this.state.setState({ pwaInstalled: true });
                document.getElementById('installPrompt').hidden = true;
            }
            
            deferredPrompt = null;
        };
    }
    
    setupEventListeners() {
        // Tab changes
        document.addEventListener('tab-change', (e) => {
            this.state.setState({ currentTab: e.detail.tab });
            this.handleTabChange(e.detail.tab);
        });
        
        // Chat selection
        document.addEventListener('chat-select', (e) => {
            this.state.setState({ selectedChat: e.detail.chatId });
            this.handleChatSelect(e.detail.chatId);
        });
        
        // New chat
        document.addEventListener('new-chat', () => {
            this.handleNewChat();
        });
        
        // Keyboard shortcuts (Desktop)
        if (PlatformDetector.isDesktop()) {
            document.addEventListener('keydown', (e) => {
                this.handleKeyboardShortcuts(e);
            });
        }
        
        // Subscribe to state changes
        this.state.subscribe((prevState, newState) => {
            this.onStateChange(prevState, newState);
        });
    }
    
    async loadInitialData() {
        try {
            // Check IndexedDB first (offline-first)
            const cachedChats = await this.getCachedChats();
            
            if (cachedChats.length > 0) {
                this.state.setState({ chats: cachedChats });
            }
            
            // If online, sync with server
            if (this.state.state.online) {
                await this.syncWithServer();
            }
            
        } catch (error) {
            console.error('Failed to load initial data:', error);
        }
    }
    
    async getCachedChats() {
        // Mock - in real app would use IndexedDB
        return [
            { id: 1, name: 'Family Group', last: 'Dinner at 7! 🍽️', time: '10:30', unread: 12, online: true },
            { id: 2, name: 'Mom', last: 'Call me ❤️', time: '09:45', unread: 3, online: true },
            { id: 3, name: 'Alex Johnson', last: 'Thanks! 📎', time: 'Yesterday', unread: 0, online: false },
        ];
    }
    
    async syncWithServer() {
        // Mock API call
        return new Promise(resolve => {
            setTimeout(() => {
                // Simulate new messages
                const updatedChats = [
                    ...this.state.state.chats,
                    { id: Date.now(), name: 'New Contact', last: 'Hi there! 👋', time: 'Now', unread: 1, online: true }
                ];
                
                this.state.setState({ 
                    chats: updatedChats,
                    lastUpdate: Date.now()
                });
                
                resolve();
            }, 1000);
        });
    }
    
    setupOfflineDetection() {
        window.addEventListener('online', () => {
            this.state.setState({ online: true });
            this.startSync();
        });
        
        window.addEventListener('offline', () => {
            this.state.setState({ online: false });
            this.stopSync();
        });
    }
    
    startSync() {
        // Start periodic sync when online
        this.syncInterval = setInterval(() => {
            this.syncWithServer();
        }, 30000); // Every 30 seconds
    }
    
    stopSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
    }
    
    handleTabChange(tab) {
        console.log('Tab changed to:', tab);
        // Update UI based on tab
        // In full app, would load different data for each tab
    }
    
    handleChatSelect(chatId) {
        console.log('Chat selected:', chatId);
        // In full app, would navigate to chat room
        alert(`Opening chat ${chatId} (navigasi ke room.html di app lengkap)`);
    }
    
    handleNewChat() {
        const contact = prompt('Enter contact name or number:');
        if (contact) {
            const newChat = {
                id: Date.now(),
                name: contact,
                last: 'Say hi! 👋',
                time: 'Now',
                unread: 0,
                online: false
            };
            
            const updatedChats = [newChat, ...this.state.state.chats];
            this.state.setState({ chats: updatedChats });
            
            alert(`New chat created with ${contact}`);
        }
    }
    
    handleKeyboardShortcuts(e) {
        // Desktop keyboard shortcuts
        switch(e.key) {
            case 'n':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.handleNewChat();
                }
                break;
            case 'k':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    document.querySelector('wa-header').shadowRoot.querySelector('.action-btn[title="Search"]').click();
                }
                break;
            case '1': case '2': case '3':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    const tabs = ['chats', 'status', 'calls'];
                    const tabIndex = parseInt(e.key) - 1;
                    this.state.setState({ currentTab: tabs[tabIndex] });
                }
                break;
        }
    }
    
    onStateChange(prevState, newState) {
        // Update UI based on state changes
        
        // Update unread count badge
        if (newState.chats !== prevState.chats) {
            const unreadCount = newState.chats.reduce((sum, chat) => sum + chat.unread, 0);
            if (unreadCount !== newState.unreadCount) {
                this.state.setState({ unreadCount });
            }
        }
        
        // Update document title with unread count
        if (newState.unreadCount !== prevState.unreadCount) {
            document.title = newState.unreadCount > 0 ? 
                `(${newState.unreadCount}) WhatsApp` : 'WhatsApp';
        }
        
        // Show/hide empty state
        const emptyState = document.getElementById('emptyState');
        if (emptyState) {
            emptyState.hidden = newState.chats.length > 0;
        }
    }
}

// === INITIALIZE APP ===
document.addEventListener('DOMContentLoaded', () => {
    const app = new WhatsAppLobby();
    
    // Make app available globally for debugging
    window.whatsAppLobby = app;
    
    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(() => {
            console.log('Service Worker ready');
        });
    }
});
