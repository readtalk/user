// === WHATSAPP STORIES SYSTEM ===
class WhatsAppStatus {
    constructor() {
        this.state = {
            myStatus: null,
            statusUpdates: [],
            viewedStatuses: new Set(),
            currentStory: null,
            storyIndex: 0,
            isViewing: false,
            isRecording: false,
            isUploading: false,
            lastUpdated: null,
            privacy: 'my-contacts',
            muteList: [],
            allowedViewers: [],
            blockedViewers: []
        };
        
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.storyTimer = null;
        this.viewTimer = null;
        
        this.init();
    }
    
    async init() {
        console.log('📺 WhatsApp Status initializing...');
        
        // 1. Load status data
        await this.loadStatusData();
        
        // 2. Setup event listeners
        this.setupEventListeners();
        
        // 3. Setup camera access
        await this.setupCamera();
        
        // 4. Start status sync
        this.startStatusSync();
        
        console.log('✅ WhatsApp Status ready');
    }
    
    async loadStatusData() {
        try {
            // Load from IndexedDB
            const savedData = localStorage.getItem('whatsapp_status_data');
            
            if (savedData) {
                const data = JSON.parse(savedData);
                this.state.statusUpdates = data.statusUpdates || [];
                this.state.myStatus = data.myStatus || null;
                this.state.viewedStatuses = new Set(data.viewedStatuses || []);
                this.state.privacy = data.privacy || 'my-contacts';
            } else {
                // Load default data
                await this.loadDefaultStatus();
            }
            
            this.state.lastUpdated = Date.now();
            
        } catch (error) {
            console.error('Failed to load status data:', error);
            await this.loadDefaultStatus();
        }
    }
    
    async loadDefaultStatus() {
        this.state.myStatus = {
            id: 'my-status',
            type: 'text',
            content: 'Tap to add status update',
            backgroundColor: '#008069',
            textColor: '#FFFFFF',
            font: 'default',
            createdAt: Date.now(),
            expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
            views: 0,
            replies: 0
        };
        
        this.state.statusUpdates = [
            {
                id: 'status-1',
                userId: 'user1',
                userName: 'Sarah',
                userAvatar: '👩‍🦰',
                isViewed: false,
                stories: [
                    {
                        id: 'story-1-1',
                        type: 'photo',
                        url: null, // In real app, would be blob URL
                        preview: '🌅',
                        caption: 'Beautiful sunset!',
                        duration: 5000,
                        createdAt: Date.now() - 3600000,
                        views: 12,
                        replies: 3
                    },
                    {
                        id: 'story-1-2',
                        type: 'video',
                        url: null,
                        preview: '🎬',
                        caption: 'Fun times!',
                        duration: 10000,
                        createdAt: Date.now() - 1800000,
                        views: 8,
                        replies: 1
                    }
                ]
            },
            {
                id: 'status-2',
                userId: 'user2',
                userName: 'John',
                userAvatar: '👨‍💼',
                isViewed: true,
                stories: [
                    {
                        id: 'story-2-1',
                        type: 'text',
                        text: 'Working from home today! 🏠',
                        backgroundColor: '#2196F3',
                        textColor: '#FFFFFF',
                        font: 'bold',
                        duration: 7000,
                        createdAt: Date.now() - 7200000,
                        views: 20,
                        replies: 5
                    }
                ]
            },
            {
                id: 'status-3',
                userId: 'user3',
                userName: 'Alex',
                userAvatar: '👨',
                isViewed: false,
                stories: [
                    {
                        id: 'story-3-1',
                        type: 'photo',
                        url: null,
                        preview: '🍕',
                        caption: 'Pizza night!',
                        duration: 5000,
                        createdAt: Date.now() - 14400000,
                        views: 15,
                        replies: 2
                    }
                ]
            }
        ];
    }
    
    setupEventListeners() {
        // Status tab click
        document.addEventListener('tab-change', (e) => {
            if (e.detail.tab === 'status') {
                this.onStatusTabOpen();
            }
        });
        
        // New status button
        document.addEventListener('new-status', () => {
            this.openStatusCreator();
        });
        
        // Status item clicks
        document.addEventListener('click', (e) => {
            const statusItem = e.target.closest('.status-item');
            if (statusItem) {
                const statusId = statusItem.dataset.statusId;
                this.openStatusViewer(statusId);
            }
            
            const myStatusItem = e.target.closest('.my-status-item');
            if (myStatusItem) {
                this.openMyStatusViewer();
            }
        });
        
        // Keyboard shortcuts for status viewer
        document.addEventListener('keydown', (e) => {
            if (this.state.isViewing) {
                this.handleStatusViewerKeydown(e);
            }
        });
        
        // Handle status replies
        document.addEventListener('status-reply', (e) => {
            this.handleStatusReply(e.detail);
        });
    }
    
    async setupCamera() {
        try {
            // Check camera permissions
            const cameraPermission = await navigator.permissions.query({ name: 'camera' });
            
            if (cameraPermission.state === 'granted') {
                this.state.hasCameraAccess = true;
            } else if (cameraPermission.state === 'prompt') {
                // Will request when needed
                this.state.hasCameraAccess = false;
            }
            
            // Listen for permission changes
            cameraPermission.onchange = () => {
                this.state.hasCameraAccess = cameraPermission.state === 'granted';
            };
            
        } catch (error) {
            console.warn('Camera permission check failed:', error);
        }
    }
    
    startStatusSync() {
        // Sync status updates periodically
        this.syncInterval = setInterval(() => {
            this.syncStatusUpdates();
        }, 30000); // Every 30 seconds
        
        // Check for expired statuses
        this.cleanupInterval = setInterval(() => {
            this.removeExpiredStatuses();
        }, 60000); // Every minute
    }
    
    stopStatusSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
    }
    
    // === STATUS VIEWER ===
    
    onStatusTabOpen() {
        // Update status list when tab opens
        this.updateStatusList();
        
        // Mark statuses as seen (not viewed, just in list)
        this.markStatusesAsSeen();
    }
    
    updateStatusList() {
        const statusList = document.querySelector('wa-status-list');
        if (statusList && statusList.shadowRoot) {
            // Trigger re-render
            statusList.render();
        }
    }
    
    markStatusesAsSeen() {
        // Update UI to show statuses as seen (grey ring instead of green)
        this.state.statusUpdates.forEach(status => {
            if (!status.isViewed) {
                // Mark as seen in UI but not as viewed
                status.isSeen = true;
            }
        });
    }
    
    openStatusViewer(statusId) {
        const status = this.state.statusUpdates.find(s => s.id === statusId);
        if (!status) return;
        
        this.state.isViewing = true;
        this.state.currentStory = status;
        this.state.storyIndex = 0;
        
        // Mark as viewed
        if (!status.isViewed) {
            status.isViewed = true;
            this.state.viewedStatuses.add(statusId);
            this.saveStatusData();
            
            // Update unread count
            this.updateUnreadCount();
        }
        
        // Show status viewer
        this.showStatusViewer();
        
        // Start auto-advance timer
        this.startStoryTimer();
    }
    
    openMyStatusViewer() {
        if (!this.state.myStatus) {
            this.openStatusCreator();
            return;
        }
        
        this.state.isViewing = true;
        this.state.currentStory = {
            id: 'my-status-view',
            userId: 'me',
            userName: 'My Status',
            userAvatar: '😊',
            stories: [this.state.myStatus]
        };
        this.state.storyIndex = 0;
        
        this.showStatusViewer();
        this.startStoryTimer();
    }
    
    showStatusViewer() {
        // Create status viewer overlay
        const viewer = document.createElement('div');
        viewer.id = 'statusViewer';
        viewer.className = 'status-viewer';
        viewer.innerHTML = this.renderStatusViewer();
        
        document.body.appendChild(viewer);
        
        // Add styles if not already added
        this.addStatusViewerStyles();
        
        // Setup viewer event listeners
        this.setupStatusViewerEvents(viewer);
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        
        // Start viewing timer
        this.startViewTimer();
    }
    
    renderStatusViewer() {
        if (!this.state.currentStory) return '';
        
        const story = this.state.currentStory.stories[this.state.storyIndex];
        const totalStories = this.state.currentStory.stories.length;
        const progress = ((this.state.storyIndex + 1) / totalStories) * 100;
        
        return `
            <div class="status-viewer-container">
                <!-- Progress bars -->
                <div class="status-progress-bars">
                    ${this.state.currentStory.stories.map((_, index) => `
                        <div class="progress-bar-container">
                            <div class="progress-bar-background"></div>
                            <div class="progress-bar-fill ${index < this.state.storyIndex ? 'filled' : ''} 
                                  ${index === this.state.storyIndex ? 'active' : ''}"
                                 style="${index === this.state.storyIndex ? `animation-duration: ${story.duration || 5000}ms` : ''}">
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <!-- Header -->
                <div class="status-header">
                    <div class="status-user-info">
                        <div class="status-user-avatar">${this.state.currentStory.userAvatar}</div>
                        <div class="status-user-details">
                            <div class="status-user-name">${this.state.currentStory.userName}</div>
                            <div class="status-time">${this.formatTime(story.createdAt)}</div>
                        </div>
                    </div>
                    <div class="status-actions">
                        <button class="status-action-btn" title="Mute" onclick="window.status.toggleMute('${this.state.currentStory.userId}')">
                            🔇
                        </button>
                        <button class="status-action-btn" title="More" onclick="window.status.showMoreMenu()">
                            ⋮
                        </button>
                        <button class="status-close-btn" onclick="window.status.closeStatusViewer()">
                            ×
                        </button>
                    </div>
                </div>
                
                <!-- Story Content -->
                <div class="story-content">
                    ${this.renderStoryContent(story)}
                </div>
                
                <!-- Footer -->
                <div class="status-footer">
                    <div class="reply-container">
                        <input type="text" 
                               class="status-reply-input" 
                               placeholder="Reply..."
                               onkeydown="window.status.handleReplyKeydown(event)">
                        <button class="send-reply-btn" onclick="window.status.sendReply()">
                            →
                        </button>
                    </div>
                    
                    <div class="view-count">
                        👁️ ${story.views || 0} views
                    </div>
                </div>
                
                <!-- Navigation areas -->
                <div class="nav-area left" onclick="window.status.previousStory()"></div>
                <div class="nav-area right" onclick="window.status.nextStory()"></div>
                
                <!-- Gesture indicator -->
                <div class="swipe-hint">← Swipe →</div>
            </div>
        `;
    }
    
    renderStoryContent(story) {
        switch(story.type) {
            case 'text':
                return `
                    <div class="text-story" style="
                        background: ${story.backgroundColor || '#008069'};
                        color: ${story.textColor || '#FFFFFF'};
                        font-family: ${this.getFontFamily(story.font)};
                    ">
                        <div class="text-content">${story.text || ''}</div>
                    </div>
                `;
                
            case 'photo':
                return `
                    <div class="photo-story">
                        <div class="photo-placeholder">${story.preview || '📷'}</div>
                        ${story.caption ? `<div class="story-caption">${story.caption}</div>` : ''}
                    </div>
                `;
                
            case 'video':
                return `
                    <div class="video-story">
                        <div class="video-placeholder">${story.preview || '🎬'}</div>
                        <div class="video-controls">
                            <button class="video-control-btn" onclick="window.status.toggleVideoPlayback()">
                                ⏯️
                            </button>
                        </div>
                        ${story.caption ? `<div class="story-caption">${story.caption}</div>` : ''}
                    </div>
                `;
                
            default:
                return '<div class="unknown-story">Unknown story type</div>';
        }
    }
    
    getFontFamily(font) {
        const fonts = {
            'default': '-apple-system, BlinkMacSystemFont, sans-serif',
            'bold': '-apple-system, BlinkMacSystemFont, sans-serif',
            'serif': 'Georgia, serif',
            'monospace': 'Monaco, monospace',
            'cursive': 'Comic Sans MS, cursive'
        };
        
        return fonts[font] || fonts.default;
    }
    
    setupStatusViewerEvents(viewer) {
        // Touch gestures for navigation
        let startX = 0;
        let startY = 0;
        
        viewer.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }, { passive: true });
        
        viewer.addEventListener('touchend', (e) => {
            if (!startX || !startY) return;
            
            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            
            const diffX = startX - endX;
            const diffY = startY - endY;
            
            // Horizontal swipe (change story)
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
                if (diffX > 0) {
                    this.nextStory();
                } else {
                    this.previousStory();
                }
            }
            
            // Vertical swipe (close)
            if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 100) {
                if (diffY > 0) {
                    this.closeStatusViewer();
                }
            }
            
            startX = 0;
            startY = 0;
        }, { passive: true });
        
        // Click navigation
        viewer.addEventListener('click', (e) => {
            const width = viewer.clientWidth;
            const x = e.clientX;
            
            // Left third: previous story
            if (x < width / 3) {
                this.previousStory();
            }
            // Right third: next story
            else if (x > (width * 2) / 3) {
                this.nextStory();
            }
            // Middle third: toggle pause/play
            else {
                this.toggleStoryTimer();
            }
        });
        
        // Pause timer when mouse is over
        viewer.addEventListener('mouseenter', () => {
            this.pauseStoryTimer();
        });
        
        viewer.addEventListener('mouseleave', () => {
            this.resumeStoryTimer();
        });
    }
    
    addStatusViewerStyles() {
        if (document.getElementById('status-viewer-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'status-viewer-styles';
        styles.textContent = `
            .status-viewer {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: #000;
                z-index: 10000;
                animation: statusViewerFadeIn 0.3s ease;
            }
            
            @keyframes statusViewerFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            .status-viewer-container {
                position: relative;
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
            }
            
            /* Progress bars */
            .status-progress-bars {
                display: flex;
                gap: 4px;
                padding: 12px 12px 8px;
                background: rgba(0, 0, 0, 0.3);
            }
            
            .progress-bar-container {
                flex: 1;
                height: 3px;
                position: relative;
            }
            
            .progress-bar-background {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 1.5px;
            }
            
            .progress-bar-fill {
                position: absolute;
                top: 0;
                left: 0;
                right: 100%;
                bottom: 0;
                background: rgba(255, 255, 255, 0.9);
                border-radius: 1.5px;
                transition: right linear;
            }
            
            .progress-bar-fill.filled {
                right: 0 !important;
            }
            
            .progress-bar-fill.active {
                right: 0;
                animation: progressBarFill linear forwards;
            }
            
            @keyframes progressBarFill {
                from { right: 100%; }
                to { right: 0; }
            }
            
            /* Header */
            .status-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 16px;
                background: rgba(0, 0, 0, 0.5);
            }
            
            .status-user-info {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .status-user-avatar {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: linear-gradient(45deg, #008069, #00A884);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                color: white;
            }
            
            .status-user-details {
                color: white;
            }
            
            .status-user-name {
                font-weight: 500;
                font-size: 16px;
            }
            
            .status-time {
                font-size: 12px;
                opacity: 0.8;
                margin-top: 2px;
            }
            
            .status-actions {
                display: flex;
                gap: 8px;
                align-items: center;
            }
            
            .status-action-btn, .status-close-btn {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                width: 36px;
                height: 36px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                cursor: pointer;
                transition: background 0.2s;
            }
            
            .status-action-btn:hover, .status-close-btn:hover {
                background: rgba(255, 255, 255, 0.3);
            }
            
            /* Story Content */
            .story-content {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                position: relative;
            }
            
            .text-story {
                width: 90%;
                max-width: 400px;
                height: 70%;
                border-radius: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 24px;
                text-align: center;
                font-size: 32px;
                font-weight: 500;
                word-break: break-word;
                animation: textStoryAppear 0.5s ease;
            }
            
            @keyframes textStoryAppear {
                from { transform: scale(0.9); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
            
            .photo-story, .video-story {
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }
            
            .photo-placeholder, .video-placeholder {
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 100px;
                animation: mediaStoryAppear 0.5s ease;
            }
            
            @keyframes mediaStoryAppear {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            .story-caption {
                position: absolute;
                bottom: 80px;
                left: 0;
                right: 0;
                text-align: center;
                color: white;
                font-size: 18px;
                padding: 16px;
                text-shadow: 0 2px 4px rgba(0,0,0,0.5);
                background: linear-gradient(transparent, rgba(0,0,0,0.5));
            }
            
            .video-controls {
                position: absolute;
                bottom: 20px;
                left: 0;
                right: 0;
                display: flex;
                justify-content: center;
            }
            
            .video-control-btn {
                background: rgba(0, 0, 0, 0.5);
                border: 2px solid white;
                color: white;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .video-control-btn:hover {
                background: rgba(0, 0, 0, 0.7);
                transform: scale(1.1);
            }
            
            /* Footer */
            .status-footer {
                padding: 16px;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                gap: 16px;
            }
            
            .reply-container {
                flex: 1;
                display: flex;
                gap: 8px;
            }
            
            .status-reply-input {
                flex: 1;
                padding: 12px 16px;
                border: 1px solid rgba(255, 255, 255, 0.3);
                border-radius: 24px;
                background: rgba(255, 255, 255, 0.1);
                color: white;
                font-size: 16px;
                outline: none;
            }
            
            .status-reply-input:focus {
                border-color: #008069;
                background: rgba(255, 255, 255, 0.15);
            }
            
            .status-reply-input::placeholder {
                color: rgba(255, 255, 255, 0.6);
            }
            
            .send-reply-btn {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background: #008069;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
                transition: background 0.2s;
            }
            
            .send-reply-btn:hover {
                background: #00A884;
            }
            
            .view-count {
                color: rgba(255, 255, 255, 0.7);
                font-size: 14px;
                white-space: nowrap;
            }
            
            /* Navigation areas */
            .nav-area {
                position: absolute;
                top: 0;
                bottom: 0;
                width: 33%;
                cursor: pointer;
                z-index: 1;
            }
            
            .nav-area.left {
                left: 0;
            }
            
            .nav-area.right {
                right: 0;
            }
            
            .swipe-hint {
                position: absolute;
                bottom: 120px;
                left: 0;
                right: 0;
                text-align: center;
                color: rgba(255, 255, 255, 0.5);
                font-size: 14px;
                animation: swipeHintPulse 2s infinite;
                pointer-events: none;
            }
            
            @keyframes swipeHintPulse {
                0%, 100% { opacity: 0.5; }
                50% { opacity: 0.8; }
            }
            
            /* Status list styles */
            .status-list-item {
                display: flex;
                align-items: center;
                padding: 12px 16px;
                cursor: pointer;
                transition: background 0.2s;
                border-bottom: 1px solid var(--wa-border-light);
            }
            
            .status-list-item:hover {
                background: var(--wa-border-light);
            }
            
            .status-avatar {
                position: relative;
                margin-right: 12px;
            }
            
            .status-ring {
                width: 56px;
                height: 56px;
                border-radius: 50%;
                padding: 2px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .status-ring.unviewed {
                background: linear-gradient(45deg, #008069, #00A884);
            }
            
            .status-ring.viewed {
                background: linear-gradient(45deg, #666, #999);
            }
            
            .status-avatar-img {
                width: 52px;
                height: 52px;
                border-radius: 50%;
                background: var(--wa-surface);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                color: var(--wa-text-primary);
            }
            
            .status-info {
                flex: 1;
            }
            
            .status-user-name {
                font-weight: 500;
                color: var(--wa-text-primary);
                margin-bottom: 2px;
            }
            
            .status-time {
                font-size: 14px;
                color: var(--wa-text-secondary);
            }
            
            .status-count {
                color: var(--wa-text-tertiary);
                font-size: 14px;
            }
            
            /* Dark mode adjustments */
            @media (prefers-color-scheme: dark) {
                .status-ring.viewed {
                    background: linear-gradient(45deg, #444, #666);
                }
            }
            
            /* Reduced motion */
            @media (prefers-reduced-motion: reduce) {
                .progress-bar-fill,
                .text-story,
                .photo-placeholder,
                .video-placeholder,
                .swipe-hint {
                    animation: none !important;
                    transition: none !important;
                }
                
                .progress-bar-fill.active {
                    transition: right linear !important;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    // === STORY NAVIGATION ===
    
    startStoryTimer() {
        if (this.storyTimer) {
            clearTimeout(this.storyTimer);
        }
        
        const story = this.state.currentStory?.stories[this.state.storyIndex];
        if (!story) return;
        
        const duration = story.duration || 5000;
        
        this.storyTimer = setTimeout(() => {
            this.nextStory();
        }, duration);
    }
    
    pauseStoryTimer() {
        if (this.storyTimer) {
            clearTimeout(this.storyTimer);
            
            // Pause progress bar animation
            const activeProgressBar = document.querySelector('.progress-bar-fill.active');
            if (activeProgressBar) {
                const computedStyle = getComputedStyle(activeProgressBar);
                const currentWidth = parseFloat(computedStyle.right);
                const duration = parseFloat(computedStyle.animationDuration) * 1000;
                const elapsed = (100 - currentWidth) / 100 * duration;
                
                activeProgressBar.style.animationPlayState = 'paused';
                activeProgressBar.dataset.pausedAt = elapsed.toString();
            }
        }
    }
    
    resumeStoryTimer() {
        const activeProgressBar = document.querySelector('.progress-bar-fill.active');
        if (activeProgressBar && activeProgressBar.dataset.pausedAt) {
            const elapsed = parseFloat(activeProgressBar.dataset.pausedAt);
            const duration = parseFloat(activeProgressBar.style.animationDuration) * 1000;
            const remaining = duration - elapsed;
            
            activeProgressBar.style.animationPlayState = 'running';
            
            // Restart timer with remaining time
            this.storyTimer = setTimeout(() => {
                this.nextStory();
            }, remaining);
        } else {
            this.startStoryTimer();
        }
    }
    
    toggleStoryTimer() {
        if (this.storyTimer) {
            this.pauseStoryTimer();
        } else {
            this.resumeStoryTimer();
        }
    }
    
    nextStory() {
        if (!this.state.currentStory) return;
        
        const totalStories = this.state.currentStory.stories.length;
        
        if (this.state.storyIndex < totalStories - 1) {
            this.state.storyIndex++;
            this.updateStatusViewer();
        } else {
            // Move to next user's status
            this.nextUserStatus();
        }
    }
    
    previousStory() {
        if (!this.state.currentStory) return;
        
        if (this.state.storyIndex > 0) {
            this.state.storyIndex--;
            this.updateStatusViewer();
        } else {
            // Move to previous user's status
            this.previousUserStatus();
        }
    }
    
    nextUserStatus() {
        const currentIndex = this.state.statusUpdates.findIndex(
            s => s.id === this.state.currentStory?.id
        );
        
        if (currentIndex < this.state.statusUpdates.length - 1) {
            const nextStatus = this.state.statusUpdates[currentIndex + 1];
            this.openStatusViewer(nextStatus.id);
        } else {
            this.closeStatusViewer();
        }
    }
    
    previousUserStatus() {
        const currentIndex = this.state.statusUpdates.findIndex(
            s => s.id === this.state.currentStory?.id
        );
        
        if (currentIndex > 0) {
            const prevStatus = this.state.statusUpdates[currentIndex - 1];
            this.openStatusViewer(prevStatus.id);
        }
    }
    
    updateStatusViewer() {
        const viewer = document.getElementById('statusViewer');
        if (viewer) {
            viewer.innerHTML = this.renderStatusViewer();
            this.setupStatusViewerEvents(viewer);
            this.startStoryTimer();
        }
    }
    
    closeStatusViewer() {
        const viewer = document.getElementById('statusViewer');
        if (viewer) {
            viewer.style.animation = 'statusViewerFadeOut 0.3s ease';
            setTimeout(() => {
                viewer.remove();
            }, 300);
        }
        
        this.state.isViewing = false;
        this.state.currentStory = null;
        this.state.storyIndex = 0;
        
        if (this.storyTimer) {
            clearTimeout(this.storyTimer);
            this.storyTimer = null;
        }
        
        if (this.viewTimer) {
            clearInterval(this.viewTimer);
            this.viewTimer = null;
        }
        
        // Restore body scroll
        document.body.style.overflow = '';
        
        // Update status list
        this.updateStatusList();
    }
    
    // === STATUS CREATION ===
    
    openStatusCreator() {
        const creator = document.createElement('div');
        creator.id = 'statusCreator';
        creator.className = 'status-creator';
        creator.innerHTML = this.renderStatusCreator();
        
        document.body.appendChild(creator);
        this.addStatusCreatorStyles();
        
        // Setup camera if available
        if (this.state.hasCameraAccess) {
            this.initCameraPreview();
        }
    }
    
    renderStatusCreator() {
        return `
            <div class="status-creator-container">
                <div class="creator-header">
                    <button class="creator-close-btn" onclick="window.status.closeStatusCreator()">
                        ×
                    </button>
                    <div class="creator-title">New Status</div>
                    <button class="creator-next-btn" onclick="window.status.previewStatus()">
                        Next
                    </button>
                </div>
                
                <div class="creator-content">
                    <!-- Camera Preview -->
                    <div class="camera-preview" id="cameraPreview">
                        <div class="camera-placeholder">
                            📷
                            <div class="camera-hint">Camera access needed</div>
                        </div>
                    </div>
                    
                    <!-- Text Editor -->
                    <div class="text-editor" id="textEditor" style="display: none;">
                        <textarea class="status-text-input" 
                                  placeholder="Type your status..." 
                                  maxlength="100"></textarea>
                        <div class="text-tools">
                            <div class="color-picker">
                                ${this.renderColorPicker()}
                            </div>
                            <div class="font-picker">
                                ${this.renderFontPicker()}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Drawing Canvas -->
                    <div class="drawing-canvas" id="drawingCanvas" style="display: none;">
                        <canvas width="400" height="600"></canvas>
                        <div class="drawing-tools">
                            <button class="drawing-tool" data-tool="pen">✏️</button>
                            <button class="drawing-tool" data-tool="eraser">🧽</button>
                            <input type="color" class="drawing-color" value="#000000">
                            <button class="drawing-clear" onclick="window.status.clearCanvas()">Clear</button>
                        </div>
                    </div>
                </div>
                
                <div class="creator-footer">
                    <div class="mode-selector">
                        <button class="mode-btn active" data-mode="camera" onclick="window.status.switchMode('camera')">
                            📷
                        </button>
                        <button class="mode-btn" data-mode="text" onclick="window.status.switchMode('text')">
                            📝
                        </button>
                        <button class="mode-btn" data-mode="draw" onclick="window.status.switchMode('draw')">
                            🎨
                        </button>
                        <button class="mode-btn" data-mode="gallery" onclick="window.status.switchMode('gallery')">
                            🖼️
                        </button>
                    </div>
                    
                    <div class="capture-controls">
                        <button class="capture-btn" onclick="window.status.capturePhoto()">
                            📸
                        </button>
                        <button class="record-btn" onclick="window.status.toggleRecording()">
                            ⏺️
                        </button>
                    </div>
                </div>
                
                <!-- Privacy selector -->
                <div class="privacy-selector">
                    <select class="privacy-select" onchange="window.status.setPrivacy(this.value)">
                        <option value="my-contacts">My contacts</option>
                        <option value="selected-contacts">Selected contacts</option>
                        <option value="except-contacts">All except...</option>
                        <option value="only-me">Only me</option>
                    </select>
                </div>
            </div>
        `;
    }
    
    renderColorPicker() {
        const colors = [
            '#008069', '#2196F3', '#4CAF50', '#FF9800',
            '#F44336', '#9C27B0', '#3F51B5', '#00BCD4',
            '#8BC34A', '#FFC107', '#E91E63', '#673AB7'
        ];
        
        return colors.map(color => `
            <button class="color-option" 
                    style="background: ${color}" 
                    onclick="window.status.setTextColor('${color}')">
            </button>
        `).join('');
    }
    
    renderFontPicker() {
        const fonts = [
            { id: 'default', name: 'Default' },
            { id: 'bold', name: 'Bold' },
            { id: 'serif', name: 'Serif' },
            { id: 'monospace', name: 'Mono' },
            { id: 'cursive', name: 'Cursive' }
        ];
        
        return fonts.map(font => `
            <button class="font-option" 
                    data-font="${font.id}"
                    onclick="window.status.setTextFont('${font.id}')">
                ${font.name}
            </button>
        `).join('');
    }
    
    addStatusCreatorStyles() {
        if (document.getElementById('status-creator-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'status-creator-styles';
        styles.textContent = `
            .status-creator {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: #000;
                z-index: 10001;
                animation: creatorFadeIn 0.3s ease;
            }
            
            .status-creator-container {
                position: relative;
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
            }
            
            /* Header */
            .creator-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px;
                background: rgba(0, 0, 0, 0.8);
                z-index: 2;
            }
            
            .creator-close-btn, .creator-next-btn {
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                padding: 8px;
            }
            
            .creator-title {
                color: white;
                font-size: 18px;
                font-weight: 500;
            }
            
            /* Content area */
            .creator-content {
                flex: 1;
                position: relative;
                overflow: hidden;
            }
            
            .camera-preview, .text-editor, .drawing-canvas {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
            }
            
            .camera-placeholder {
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 80px;
                background: #111;
            }
            
            .camera-hint {
                font-size: 16px;
                margin-top: 16px;
                opacity: 0.7;
            }
            
            .text-editor {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 24px;
                background: #111;
            }
            
            .status-text-input {
                width: 100%;
                max-width: 400px;
                height: 200px;
                background: transparent;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 12px;
                color: white;
                font-size: 24px;
                padding: 16px;
                resize: none;
                outline: none;
                text-align: center;
                font-family: inherit;
            }
            
            .status-text-input:focus {
                border-color: #008069;
            }
            
            .text-tools {
                margin-top: 24px;
                display: flex;
                gap: 24px;
            }
            
            .color-picker, .font-picker {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
                justify-content: center;
            }
            
            .color-option {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                border: 2px solid white;
                cursor: pointer;
                transition: transform 0.2s;
            }
            
            .color-option:hover {
                transform: scale(1.1);
            }
            
            .font-option {
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.3);
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .font-option:hover {
                background: rgba(255, 255, 255, 0.2);
            }
            
            /* Footer */
            .creator-footer {
                padding: 16px;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .mode-selector {
                display: flex;
                gap: 12px;
            }
            
            .mode-btn {
                background: rgba(255, 255, 255, 0.1);
                border: none;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                color: white;
                font-size: 24px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .mode-btn.active {
                background: #008069;
            }
            
            .mode-btn:hover:not(.active) {
                background: rgba(255, 255, 255, 0.2);
            }
            
            .capture-controls {
                display: flex;
                gap: 16px;
            }
            
            .capture-btn, .record-btn {
                background: rgba(255, 255, 255, 0.2);
                border: 2px solid white;
                width: 60px;
                height: 60px;
                border-radius: 50%;
                color: white;
                font-size: 28px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .capture-btn:hover, .record-btn:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: scale(1.05);
            }
            
            .record-btn.recording {
                background: #F44336;
                animation: recordingPulse 1s infinite;
            }
            
            @keyframes recordingPulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }
            
            /* Privacy selector */
            .privacy-selector {
                position: absolute;
                bottom: 100px;
                left: 0;
                right: 0;
                display: flex;
                justify-content: center;
            }
            
            .privacy-select {
                background: rgba(0, 0, 0, 0.7);
                color: white;
                border: 1px solid rgba(255, 255, 255, 0.3);
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 14px;
                outline: none;
            }
            
            /* Drawing canvas */
            .drawing-canvas {
                background: white;
            }
            
            .drawing-canvas canvas {
                width: 100%;
                height: calc(100% - 60px);
                cursor: crosshair;
            }
            
            .drawing-tools {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 60px;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                padding: 0 16px;
            }
            
            .drawing-tool, .drawing-clear {
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.3);
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                cursor: pointer;
                transition: background 0.2s;
            }
            
            .drawing-tool:hover, .drawing-clear:hover {
                background: rgba(255, 255, 255, 0.2);
            }
            
            .drawing-color {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                border: 2px solid white;
                cursor: pointer;
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    // === STATUS MANAGEMENT ===
    
    async syncStatusUpdates() {
        if (!navigator.onLine) return;
        
        try {
            // Simulate API call to get new statuses
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Update last sync time
            this.state.lastUpdated = Date.now();
            
            // In real app, would merge with server data
            console.log('📺 Status updates synced');
            
        } catch (error) {
            console.error('Failed to sync status updates:', error);
        }
    }
    
    removeExpiredStatuses() {
        const now = Date.now();
        const twentyFourHours = 24 * 60 * 60 * 1000;
        
        // Remove expired statuses
        this.state.statusUpdates = this.state.statusUpdates.filter(status => {
            const latestStory = status.stories[status.stories.length - 1];
            return now - latestStory.createdAt < twentyFourHours;
        });
        
        // Remove expired my status
        if (this.state.myStatus && now > this.state.myStatus.expiresAt) {
            this.state.myStatus = null;
        }
        
        this.saveStatusData();
    }
    
    saveStatusData() {
        try {
            const data = {
                statusUpdates: this.state.statusUpdates,
                myStatus: this.state.myStatus,
                viewedStatuses: Array.from(this.state.viewedStatuses),
                privacy: this.state.privacy
            };
            
            localStorage.setItem('whatsapp_status_data', JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save status data:', error);
        }
    }
    
    updateUnreadCount() {
        const unreadCount = this.state.statusUpdates.filter(s => !s.isViewed).length;
        
        if (window.app) {
            window.app.state.unreadCounts.status = unreadCount;
            window.app.calculateUnreadCounts();
        }
    }
    
    // === HELPER FUNCTIONS ===
    
    formatTime(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        
        const date = new Date(timestamp);
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    
    handleStatusViewerKeydown(event) {
        switch(event.key) {
            case 'ArrowLeft':
                this.previousStory();
                break;
            case 'ArrowRight':
                this.nextStory();
                break;
            case 'Escape':
                this.closeStatusViewer();
                break;
            case ' ':
                event.preventDefault();
                this.toggleStoryTimer();
                break;
        }
    }
    
    handleStatusReply(detail) {
        console.log('Status reply:', detail);
        // Handle status reply logic
    }
    
    handleReplyKeydown(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendReply();
        }
    }
    
    sendReply() {
        const input = document.querySelector('.status-reply-input');
        if (!input || !input.value.trim()) return;
        
        const reply = {
            id: `reply-${Date.now()}`,
            storyId: this.state.currentStory.stories[this.state.storyIndex].id,
            userId: 'me',
            text: input.value.trim(),
            timestamp: Date.now()
        };
        
        console.log('Sending reply:', reply);
        
        // Clear input
        input.value = '';
        
        // In real app, would send to server
        // For now, just show confirmation
        this.showToast('Reply sent', 'success');
    }
    
    showToast(message, type) {
        // Simple toast notification
        const toast = document.createElement('div');
        toast.className = `status-toast ${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'success' ? '#4CAF50' : '#F44336'};
            color: white;
            padding: 12px 24px;
            border-radius: 24px;
            z-index: 10002;
            animation: toastSlideUp 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'toastSlideDown 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
    
    // === PUBLIC API ===
    
    createTextStatus(text, options = {}) {
        const status = {
            id: `status-${Date.now()}`,
            type: 'text',
            text: text,
            backgroundColor: options.backgroundColor || '#008069',
            textColor: options.textColor || '#FFFFFF',
            font: options.font || 'default',
            createdAt: Date.now(),
            expiresAt: Date.now() + (24 * 60 * 60 * 1000),
            views: 0,
            replies: 0
        };
        
        this.state.myStatus = status;
        this.saveStatusData();
        
        return status;
    }
    
    getStatusCount() {
        return this.state.statusUpdates.length;
    }
    
    getUnreadStatusCount() {
        return this.state.statusUpdates.filter(s => !s.isViewed).length;
    }
}

// === INITIALIZE STATUS ===
document.addEventListener('DOMContentLoaded', () => {
    // Initialize status system
    window.status = new WhatsAppStatus();
    
    console.log('📺 WhatsApp Status initialized');
});
