// === WHATSAPP ENHANCED NOTIFICATIONS SYSTEM ===
class WhatsAppNotifications {
    constructor() {
        this.state = {
            permission: 'default',
            settings: {
                enabled: true,
                showPreview: true,
                sound: true,
                vibrate: true,
                led: true,
                priority: 'high',
                ringtone: 'default',
                vibrationPattern: 'default',
                notificationLightColor: '#25D366',
                groupNotifications: true,
                showNotificationsOnLockScreen: true,
                inAppNotifications: true,
                badge: true,
                reminder: false,
                reminderInterval: 15,
                quietHours: {
                    enabled: false,
                    start: '22:00',
                    end: '08:00',
                    days: [0, 1, 2, 3, 4, 5, 6] // 0 = Sunday
                },
                customSounds: {},
                blockedChats: [],
                mutedChats: [],
                mentionedOnly: [],
                mediaNotifications: true,
                callNotifications: true,
                statusNotifications: true,
                paymentNotifications: true,
                backupNotifications: true,
                lowPriorityGroups: []
            },
            pendingNotifications: [],
            notificationHistory: [],
            notificationQueue: [],
            isProcessingQueue: false,
            badgeCount: 0,
            lastNotificationId: 0,
            activeNotifications: new Map(),
            notificationSounds: new Map(),
            notificationVibrationPatterns: new Map()
        };
        
        this.init();
    }
    
    async init() {
        console.log('🔔 WhatsApp Notifications initializing...');
        
        // 1. Check and request permission
        await this.checkPermission();
        
        // 2. Load settings
        await this.loadSettings();
        
        // 3. Setup notification sounds
        await this.loadNotificationSounds();
        
        // 4. Setup vibration patterns
        this.setupVibrationPatterns();
        
        // 5. Setup event listeners
        this.setupEventListeners();
        
        // 6. Setup service worker messaging
        this.setupServiceWorkerMessaging();
        
        // 7. Process any pending notifications
        await this.processPendingNotifications();
        
        // 8. Start badge sync
        this.startBadgeSync();
        
        console.log('✅ WhatsApp Notifications ready');
    }
    
    async checkPermission() {
        if (!('Notification' in window)) {
            console.warn('Notifications not supported');
            this.state.permission = 'denied';
            return;
        }
        
        this.state.permission = Notification.permission;
        
        if (this.state.permission === 'default') {
            this.state.permission = await this.requestPermission();
        }
        
        console.log('Notification permission:', this.state.permission);
    }
    
    async requestPermission() {
        try {
            const permission = await Notification.requestPermission();
            this.state.permission = permission;
            
            if (permission === 'granted') {
                this.showWelcomeNotification();
            }
            
            return permission;
        } catch (error) {
            console.error('Failed to request notification permission:', error);
            return 'denied';
        }
    }
    
    async loadSettings() {
        try {
            const savedSettings = localStorage.getItem('whatsapp_notification_settings');
            
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                this.state.settings = { ...this.state.settings, ...settings };
            }
            
            // Migrate old settings if needed
            this.migrateSettings();
            
        } catch (error) {
            console.error('Failed to load notification settings:', error);
        }
    }
    
    saveSettings() {
        try {
            localStorage.setItem(
                'whatsapp_notification_settings',
                JSON.stringify(this.state.settings)
            );
        } catch (error) {
            console.error('Failed to save notification settings:', error);
        }
    }
    
    migrateSettings() {
        // Migration logic for future updates
        if (!this.state.settings.quietHours) {
            this.state.settings.quietHours = {
                enabled: false,
                start: '22:00',
                end: '08:00',
                days: [0, 1, 2, 3, 4, 5, 6]
            };
        }
    }
    
    async loadNotificationSounds() {
        // Preload notification sounds
        const sounds = {
            'default': this.createDefaultSound(),
            'chime': this.createChimeSound(),
            'pop': this.createPopSound(),
            'ding': this.createDingSound(),
            'trill': this.createTrillSound()
        };
        
        Object.entries(sounds).forEach(([name, sound]) => {
            this.state.notificationSounds.set(name, sound);
        });
    }
    
    setupVibrationPatterns() {
        const patterns = {
            'default': [200, 100, 200],
            'short': [100],
            'long': [500],
            'pulse': [100, 100, 100, 100, 100],
            'heartbeat': [100, 100, 300, 100, 100]
        };
        
        Object.entries(patterns).forEach(([name, pattern]) => {
            this.state.notificationVibrationPatterns.set(name, pattern);
        });
    }
    
    setupEventListeners() {
        // Listen for new messages from app
        if (window.app) {
            window.app.on('new-message', (message) => {
                this.handleNewMessage(message);
            });
            
            window.app.on('new-call', (call) => {
                this.handleNewCall(call);
            });
            
            window.app.on('status-update', (status) => {
                this.handleStatusUpdate(status);
            });
        }
        
        // Listen for visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.onAppBackground();
            } else {
                this.onAppForeground();
            }
        });
        
        // Listen for online/offline status
        window.addEventListener('online', () => {
            this.syncPendingNotifications();
        });
        
        window.addEventListener('offline', () => {
            this.queueNotifications();
        });
        
        // Listen for service worker messages
        navigator.serviceWorker?.addEventListener('message', (event) => {
            this.handleServiceWorkerMessage(event);
        });
        
        // Listen for notification clicks
        navigator.serviceWorker?.addEventListener('notificationclick', (event) => {
            this.handleNotificationClick(event);
        });
        
        // Listen for notification close
        navigator.serviceWorker?.addEventListener('notificationclose', (event) => {
            this.handleNotificationClose(event);
        });
    }
    
    setupServiceWorkerMessaging() {
        if (!navigator.serviceWorker?.controller) return;
        
        // Send settings to service worker
        navigator.serviceWorker.controller.postMessage({
            type: 'NOTIFICATION_SETTINGS',
            settings: this.state.settings
        });
    }
    
    async processPendingNotifications() {
        const pending = localStorage.getItem('whatsapp_pending_notifications');
        if (pending) {
            try {
                const notifications = JSON.parse(pending);
                for (const notification of notifications) {
                    await this.createNotification(notification);
                }
                
                // Clear pending notifications
                localStorage.removeItem('whatsapp_pending_notifications');
                
            } catch (error) {
                console.error('Failed to process pending notifications:', error);
            }
        }
    }
    
    startBadgeSync() {
        // Update badge count every minute
        setInterval(() => {
            this.updateBadgeCount();
        }, 60000);
        
        // Initial update
        this.updateBadgeCount();
    }
    
    // === NOTIFICATION CREATION ===
    
    async handleNewMessage(message) {
        if (!this.shouldNotifyForMessage(message)) return;
        
        const notification = {
            id: `msg-${message.id}`,
            type: 'message',
            title: message.senderName || 'New message',
            body: this.getMessagePreview(message),
            icon: message.senderAvatar || '/icons/icon-192.png',
            image: message.mediaUrl,
            tag: `chat-${message.chatId}`,
            timestamp: message.timestamp || Date.now(),
            data: {
                chatId: message.chatId,
                messageId: message.id,
                senderId: message.senderId,
                isGroup: message.isGroup,
                hasMedia: message.hasMedia,
                isMention: message.isMention,
                priority: this.getMessagePriority(message),
                actions: [
                    {
                        action: 'reply',
                        title: 'Reply',
                        icon: '/icons/reply.png'
                    },
                    {
                        action: 'mark-read',
                        title: 'Mark as read',
                        icon: '/icons/check.png'
                    }
                ]
            },
            requireInteraction: message.isMention || false,
            renotify: true,
            silent: this.isQuietHours() || message.isMuted,
            badge: '/icons/badge-72.png',
            vibrate: this.getVibrationPattern('message'),
            sound: this.getSound('message')
        };
        
        await this.createNotification(notification);
        
        // Add to history
        this.addToHistory(notification);
        
        // Update badge
        this.incrementBadgeCount();
    }
    
    async handleNewCall(call) {
        if (!this.state.settings.callNotifications) return;
        if (this.isQuietHours()) return;
        
        const notification = {
            id: `call-${call.id}`,
            type: 'call',
            title: call.isVideo ? 'Incoming video call' : 'Incoming call',
            body: `${call.callerName} is calling`,
            icon: call.callerAvatar || '/icons/icon-192.png',
            tag: `call-${call.id}`,
            timestamp: Date.now(),
            data: {
                callId: call.id,
                callerId: call.callerId,
                isVideo: call.isVideo,
                isGroupCall: call.isGroupCall,
                priority: 'max',
                actions: [
                    {
                        action: 'answer',
                        title: 'Answer',
                        icon: '/icons/answer.png'
                    },
                    {
                        action: 'decline',
                        title: 'Decline',
                        icon: '/icons/decline.png'
                    },
                    {
                        action: 'message',
                        title: 'Message',
                        icon: '/icons/message.png'
                    }
                ]
            },
            requireInteraction: true,
            renotify: true,
            silent: false,
            badge: '/icons/badge-72.png',
            vibrate: [1000, 1000, 1000, 1000, 1000], // Continuous vibration for calls
            sound: 'call'
        };
        
        await this.createNotification(notification);
    }
    
    async handleStatusUpdate(status) {
        if (!this.state.settings.statusNotifications) return;
        
        const notification = {
            id: `status-${status.id}`,
            type: 'status',
            title: 'Status update',
            body: `${status.userName} posted a new status`,
            icon: status.userAvatar || '/icons/icon-192.png',
            image: status.previewUrl,
            tag: `status-${status.userId}`,
            timestamp: status.timestamp || Date.now(),
            data: {
                statusId: status.id,
                userId: status.userId,
                type: status.type,
                priority: 'low'
            },
            requireInteraction: false,
            renotify: false,
            silent: this.isQuietHours(),
            badge: '/icons/badge-72.png',
            vibrate: this.getVibrationPattern('status'),
            sound: this.getSound('status')
        };
        
        await this.createNotification(notification);
    }
    
    async createNotification(notificationData) {
        // Check if notifications are enabled
        if (!this.state.settings.enabled) {
            this.queueNotification(notificationData);
            return;
        }
        
        // Check permission
        if (this.state.permission !== 'granted') {
            this.queueNotification(notificationData);
            return;
        }
        
        // Check quiet hours
        if (this.isQuietHours() && !notificationData.data?.priority === 'max') {
            this.queueNotification(notificationData);
            return;
        }
        
        // Check if app is in foreground
        if (!document.hidden && this.state.settings.inAppNotifications) {
            this.showInAppNotification(notificationData);
            return;
        }
        
        // Create the notification
        try {
            const options = this.buildNotificationOptions(notificationData);
            
            // Use service worker if available
            if (navigator.serviceWorker?.ready) {
                const registration = await navigator.serviceWorker.ready;
                await registration.showNotification(notificationData.title, options);
            } else if ('Notification' in window) {
                const notification = new Notification(notificationData.title, options);
                this.setupNotificationEvents(notification, notificationData);
            }
            
            // Play sound if enabled
            if (this.state.settings.sound && !options.silent) {
                this.playNotificationSound(notificationData.sound || 'default');
            }
            
            // Vibrate if enabled and supported
            if (this.state.settings.vibrate && 'vibrate' in navigator) {
                this.vibrate(notificationData.vibrate);
            }
            
            // Store notification reference
            this.state.activeNotifications.set(notificationData.id, {
                data: notificationData,
                timestamp: Date.now()
            });
            
            console.log('Notification created:', notificationData.id);
            
        } catch (error) {
            console.error('Failed to create notification:', error);
            this.queueNotification(notificationData);
        }
    }
    
    buildNotificationOptions(notificationData) {
        const options = {
            body: this.state.settings.showPreview ? notificationData.body : 'New message',
            icon: notificationData.icon,
            badge: notificationData.badge,
            tag: notificationData.tag,
            timestamp: notificationData.timestamp,
            data: notificationData.data,
            requireInteraction: notificationData.requireInteraction || false,
            renotify: notificationData.renotify || false,
            silent: notificationData.silent || false,
            vibrate: notificationData.vibrate,
            sound: notificationData.sound
        };
        
        // Add image if available and showPreview is enabled
        if (notificationData.image && this.state.settings.showPreview) {
            options.image = notificationData.image;
        }
        
        // Add actions if supported
        if ('actions' in Notification.prototype && notificationData.data?.actions) {
            options.actions = notificationData.data.actions.slice(0, 2); // Max 2 actions
        }
        
        // Add notification LED color for Android
        if (this.state.settings.led && notificationData.data?.priority === 'high') {
            options.led = this.state.settings.notificationLightColor;
        }
        
        return options;
    }
    
    setupNotificationEvents(notification, notificationData) {
        notification.onclick = (event) => {
            this.handleNotificationClick({
                notification: {
                    data: notificationData.data,
                    tag: notificationData.tag,
                    close: () => notification.close()
                },
                action: event.action
            });
        };
        
        notification.onclose = () => {
            this.handleNotificationClose({
                notification: {
                    data: notificationData.data,
                    tag: notificationData.tag
                }
            });
        };
    }
    
    // === NOTIFICATION HANDLERS ===
    
    handleNotificationClick(event) {
        const notification = event.notification;
        const action = event.action;
        
        console.log('Notification clicked:', notification.tag, 'Action:', action);
        
        // Close the notification
        notification.close();
        
        // Handle different actions
        if (action === 'reply') {
            this.handleReplyAction(notification.data);
        } else if (action === 'mark-read') {
            this.handleMarkReadAction(notification.data);
        } else if (action === 'answer') {
            this.handleAnswerCallAction(notification.data);
        } else if (action === 'decline') {
            this.handleDeclineCallAction(notification.data);
        } else if (action === 'message') {
            this.handleMessageInsteadAction(notification.data);
        } else {
            // Default action: open the chat/call
            this.handleDefaultAction(notification.data);
        }
        
        // Remove from active notifications
        this.state.activeNotifications.delete(notification.data.messageId || notification.data.callId);
        
        // Update badge count
        this.decrementBadgeCount();
        
        // Focus the app
        this.focusApp();
    }
    
    handleNotificationClose(event) {
        const notification = event.notification;
        
        console.log('Notification closed:', notification.tag);
        
        // Remove from active notifications
        this.state.activeNotifications.delete(notification.data.messageId || notification.data.callId);
        
        // Add to history
        this.addToHistory({
            id: `closed-${Date.now()}`,
            type: 'closed',
            data: notification.data,
            timestamp: Date.now()
        });
    }
    
    handleServiceWorkerMessage(event) {
        const message = event.data;
        
        switch(message.type) {
            case 'NOTIFICATION_CLICKED':
                this.handleNotificationClick(message.data);
                break;
                
            case 'NOTIFICATION_CLOSED':
                this.handleNotificationClose(message.data);
                break;
                
            case 'NOTIFICATION_PERMISSION_CHANGED':
                this.state.permission = message.permission;
                break;
                
            case 'BADGE_UPDATE':
                this.updateBadgeFromServiceWorker(message.count);
                break;
        }
    }
    
    // === NOTIFICATION ACTIONS ===
    
    handleDefaultAction(data) {
        if (data.chatId) {
            // Open chat
            this.openChat(data.chatId);
        } else if (data.callId) {
            // Open call interface
            this.openCall(data.callId);
        } else if (data.statusId) {
            // Open status
            this.openStatus(data.statusId);
        }
    }
    
    handleReplyAction(data) {
        // Open chat with reply interface
        this.openChat(data.chatId, { replyTo: data.messageId });
    }
    
    handleMarkReadAction(data) {
        // Mark message as read
        if (window.app) {
            window.app.markMessageAsRead(data.messageId, data.chatId);
        }
    }
    
    handleAnswerCallAction(data) {
        // Answer the call
        if (window.calls) {
            window.calls.answerCall();
        }
    }
    
    handleDeclineCallAction(data) {
        // Decline the call
        if (window.calls) {
            window.calls.declineCall();
        }
    }
    
    handleMessageInsteadAction(data) {
        // Open chat instead of answering call
        if (data.callerId) {
            this.openChatWithContact(data.callerId);
        }
    }
    
    openChat(chatId, options = {}) {
        console.log('Opening chat:', chatId, options);
        
        if (window.app) {
            window.app.openChat(chatId);
            
            if (options.replyTo) {
                // In real app, would focus reply input
                console.log('Reply to message:', options.replyTo);
            }
        }
    }
    
    openCall(callId) {
        console.log('Opening call:', callId);
        
        if (window.calls) {
            // In real app, would open call interface
        }
    }
    
    openStatus(statusId) {
        console.log('Opening status:', statusId);
        
        if (window.status) {
            // In real app, would open status viewer
        }
    }
    
    openChatWithContact(contactId) {
        console.log('Opening chat with contact:', contactId);
        
        if (window.app) {
            // In real app, would open or create chat
        }
    }
    
    focusApp() {
        // Focus the app window
        if (window.focus) {
            window.focus();
        }
        
        // If in PWA mode, might need different approach
        if (window.matchMedia('(display-mode: standalone)').matches) {
            // PWA specific focus logic
        }
    }
    
    // === IN-APP NOTIFICATIONS ===
    
    showInAppNotification(notificationData) {
        if (!this.state.settings.inAppNotifications) return;
        
        const notification = document.createElement('div');
        notification.className = 'in-app-notification';
        notification.dataset.id = notificationData.id;
        notification.innerHTML = this.renderInAppNotification(notificationData);
        
        document.body.appendChild(notification);
        
        // Add styles if not already added
        this.addInAppNotificationStyles();
        
        // Animate in
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Auto-remove after delay
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 5000);
        
        // Setup click handler
        notification.addEventListener('click', () => {
            this.handleNotificationClick({
                notification: {
                    data: notificationData.data,
                    tag: notificationData.tag,
                    close: () => {}
                }
            });
            notification.remove();
        });
        
        // Setup close button
        const closeBtn = notification.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                notification.remove();
            });
        }
    }
    
    renderInAppNotification(notificationData) {
        let icon = '💬';
        let accentColor = 'var(--wa-primary)';
        
        switch(notificationData.type) {
            case 'call':
                icon = '📞';
                accentColor = 'var(--wa-accent-green)';
                break;
            case 'status':
                icon = '📺';
                accentColor = 'var(--wa-accent-blue)';
                break;
        }
        
        return `
            <div class="notification-content">
                <div class="notification-icon" style="color: ${accentColor}">${icon}</div>
                <div class="notification-details">
                    <div class="notification-title">${notificationData.title}</div>
                    <div class="notification-body">${notificationData.body}</div>
                </div>
                <button class="notification-close">×</button>
            </div>
        `;
    }
    
    addInAppNotificationStyles() {
        if (document.getElementById('in-app-notification-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'in-app-notification-styles';
        styles.textContent = `
            .in-app-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 320px;
                max-width: calc(100vw - 40px);
                background: var(--wa-surface);
                border: 1px solid var(--wa-border);
                border-radius: 12px;
                box-shadow: var(--wa-shadow-lg);
                z-index: 10004;
                transform: translateX(400px);
                opacity: 0;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                overflow: hidden;
                cursor: pointer;
            }
            
            .in-app-notification.show {
                transform: translateX(0);
                opacity: 1;
            }
            
            .notification-content {
                display: flex;
                align-items: center;
                padding: 16px;
                gap: 12px;
            }
            
            .notification-icon {
                font-size: 24px;
                flex-shrink: 0;
            }
            
            .notification-details {
                flex: 1;
                min-width: 0;
            }
            
            .notification-title {
                font-weight: 500;
                color: var(--wa-text-primary);
                margin-bottom: 4px;
                font-size: 14px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .notification-body {
                font-size: 13px;
                color: var(--wa-text-secondary);
                line-height: 1.4;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
            
            .notification-close {
                background: none;
                border: none;
                color: var(--wa-text-tertiary);
                font-size: 20px;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                cursor: pointer;
                flex-shrink: 0;
                transition: background-color 0.2s;
            }
            
            .notification-close:hover {
                background: var(--wa-border);
            }
            
            /* Animation for multiple notifications */
            .in-app-notification:not(:last-child) {
                margin-bottom: 8px;
            }
            
            /* Dark mode */
            @media (prefers-color-scheme: dark) {
                .in-app-notification {
                    background: var(--wa-surface);
                    border-color: var(--wa-border);
                }
            }
            
            /* Reduced motion */
            @media (prefers-reduced-motion: reduce) {
                .in-app-notification {
                    transition: none;
                }
            }
            
            /* Mobile responsiveness */
            @media (max-width: 480px) {
                .in-app-notification {
                    width: calc(100vw - 40px);
                    right: 20px;
                    left: 20px;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    // === NOTIFICATION LOGIC ===
    
    shouldNotifyForMessage(message) {
        // Check if notifications are enabled
        if (!this.state.settings.enabled) return false;
        
        // Check if chat is blocked
        if (this.state.settings.blockedChats.includes(message.chatId)) return false;
        
        // Check if chat is muted
        if (this.state.settings.mutedChats.includes(message.chatId)) {
            // Only notify for mentions if mentioned-only mode
            if (this.state.settings.mentionedOnly.includes(message.chatId)) {
                return message.isMention;
            }
            return false;
        }
        
        // Check if low priority group
        if (message.isGroup && this.state.settings.lowPriorityGroups.includes(message.chatId)) {
            return message.isMention;
        }
        
        // Check quiet hours
        if (this.isQuietHours()) {
            return message.isMention || message.data?.priority === 'high';
        }
        
        return true;
    }
    
    getMessagePreview(message) {
        if (!this.state.settings.showPreview) {
            return 'New message';
        }
        
        if (message.hasMedia) {
            if (message.mediaType === 'image') return '📷 Photo';
            if (message.mediaType === 'video') return '🎬 Video';
            if (message.mediaType === 'audio') return '🎵 Voice message';
            if (message.mediaType === 'document') return '📎 Document';
            return '📁 Media';
        }
        
        if (message.isMention) {
            return `@${message.senderName}: ${message.text}`;
        }
        
        // Truncate long messages
        if (message.text && message.text.length > 100) {
            return message.text.substring(0, 100) + '...';
        }
        
        return message.text || 'New message';
    }
    
    getMessagePriority(message) {
        if (message.isMention) return 'high';
        if (message.isGroup && this.state.settings.lowPriorityGroups.includes(message.chatId)) {
            return 'low';
        }
        return 'normal';
    }
    
    isQuietHours() {
        if (!this.state.settings.quietHours.enabled) return false;
        
        const now = new Date();
        const currentDay = now.getDay();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        
        // Check if current day is in quiet hours days
        if (!this.state.settings.quietHours.days.includes(currentDay)) return false;
        
        const [startHour, startMinute] = this.state.settings.quietHours.start.split(':').map(Number);
        const [endHour, endMinute] = this.state.settings.quietHours.end.split(':').map(Number);
        
        const startTime = startHour * 60 + startMinute;
        const endTime = endHour * 60 + endMinute;
        
        // Handle overnight quiet hours
        if (startTime < endTime) {
            return currentTime >= startTime && currentTime < endTime;
        } else {
            return currentTime >= startTime || currentTime < endTime;
        }
    }
    
    getVibrationPattern(type) {
        if (!this.state.settings.vibrate) return [];
        
        const patternName = type === 'call' ? 'default' : this.state.settings.vibrationPattern;
        return this.state.notificationVibrationPatterns.get(patternName) || [200, 100, 200];
    }
    
    getSound(type) {
        if (!this.state.settings.sound) return null;
        
        if (type === 'call') return 'call';
        return this.state.settings.ringtone || 'default';
    }
    
    // === AUDIO & VIBRATION ===
    
    createDefaultSound() {
        if (!this.audioContext) return null;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        const now = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.1, now + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        
        return { oscillator, gainNode, duration: 500 };
    }
    
    createChimeSound() {
        if (!this.audioContext) return null;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = 523.25; // C5
        oscillator.type = 'sine';
        
        const now = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.15, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        
        oscillator.frequency.setValueAtTime(523.25, now);
        oscillator.frequency.linearRampToValueAtTime(659.25, now + 0.8); // E5
        
        return { oscillator, gainNode, duration: 800 };
    }
    
    createPopSound() {
        if (!this.audioContext) return null;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = 1000;
        oscillator.type = 'sine';
        
        const now = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.2, now + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        
        return { oscillator, gainNode, duration: 100 };
    }
    
    createDingSound() {
        if (!this.audioContext) return null;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = 784; // G5
        oscillator.type = 'sine';
        
        const now = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.12, now + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        
        return { oscillator, gainNode, duration: 300 };
    }
    
    createTrillSound() {
        if (!this.audioContext) return null;
        
        // Create two oscillators for trill effect
        const oscillator1 = this.audioContext.createOscillator();
        const oscillator2 = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator1.frequency.value = 660;
        oscillator2.frequency.value = 880;
        oscillator1.type = 'sine';
        oscillator2.type = 'sine';
        
        const now = this.audioContext.currentTime;
        
        // Trill pattern
        for (let i = 0; i < 3; i++) {
            const startTime = now + i * 0.2;
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(0.08, startTime + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
        }
        
        return { oscillator1, oscillator2, gainNode, duration: 600 };
    }
    
    playNotificationSound(soundName) {
        const sound = this.state.notificationSounds.get(soundName);
        if (!sound || !this.audioContext) return;
        
        try {
            // Reset audio context if suspended
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            
            // Clone and play the sound
            if (sound.oscillator) {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.frequency.value = sound.oscillator.frequency.value;
                oscillator.type = sound.oscillator.type;
                
                const now = this.audioContext.currentTime;
                gainNode.gain.setValueAtTime(0, now);
                gainNode.gain.linearRampToValueAtTime(0.1, now + 0.1);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + sound.duration / 1000);
                
                oscillator.start();
                oscillator.stop(now + sound.duration / 1000);
            }
            
        } catch (error) {
            console.warn('Failed to play notification sound:', error);
        }
    }
    
    vibrate(pattern) {
        if (!this.state.settings.vibrate) return;
        if (!('vibrate' in navigator)) return;
        
        try {
            navigator.vibrate(pattern);
        } catch (error) {
            console.warn('Vibration failed:', error);
        }
    }
    
    // === BADGE MANAGEMENT ===
    
    incrementBadgeCount() {
        if (!this.state.settings.badge) return;
        
        this.state.badgeCount++;
        this.updateBadge();
    }
    
    decrementBadgeCount() {
        if (!this.state.settings.badge) return;
        
        this.state.badgeCount = Math.max(0, this.state.badgeCount - 1);
        this.updateBadge();
    }
    
    updateBadgeCount() {
        // In real app, would fetch actual count from server
        // For now, use active notifications count
        this.state.badgeCount = this.state.activeNotifications.size;
        this.updateBadge();
    }
    
    updateBadgeFromServiceWorker(count) {
        this.state.badgeCount = count;
        this.updateBadge();
    }
    
    updateBadge() {
        // Update browser badge
        if ('setAppBadge' in navigator) {
            navigator.setAppBadge(this.state.badgeCount).catch(console.error);
        }
        
        // Update document title
        if (this.state.badgeCount > 0) {
            document.title = `(${this.state.badgeCount}) WhatsApp`;
        } else {
            document.title = 'WhatsApp';
        }
        
        // Update service worker
        if (navigator.serviceWorker?.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'BADGE_UPDATE',
                count: this.state.badgeCount
            });
        }
    }
    
    // === QUEUE MANAGEMENT ===
    
    queueNotification(notificationData) {
        this.state.notificationQueue.push({
            ...notificationData,
            queuedAt: Date.now()
        });
        
        localStorage.setItem(
            'whatsapp_pending_notifications',
            JSON.stringify(this.state.notificationQueue)
        );
        
        if (!this.state.isProcessingQueue) {
            this.processNotificationQueue();
        }
    }
    
    async processNotificationQueue() {
        if (this.state.isProcessingQueue || this.state.notificationQueue.length === 0) {
            return;
        }
        
        this.state.isProcessingQueue = true;
        
        while (this.state.notificationQueue.length > 0) {
            const notification = this.state.notificationQueue.shift();
            
            // Check if notification is still relevant (less than 1 hour old)
            if (Date.now() - notification.queuedAt < 3600000) {
                await this.createNotification(notification);
            }
            
            // Small delay between notifications
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        this.state.isProcessingQueue = false;
        
        // Clear pending storage
        localStorage.removeItem('whatsapp_pending_notifications');
    }
    
    syncPendingNotifications() {
        if (this.state.notificationQueue.length > 0) {
            this.processNotificationQueue();
        }
    }
    
    // === HISTORY ===
    
    addToHistory(notification) {
        this.state.notificationHistory.unshift({
            id: notification.id,
            type: notification.type,
            data: notification.data,
            timestamp: notification.timestamp || Date.now()
        });
        
        // Keep only last 1000 entries
        if (this.state.notificationHistory.length > 1000) {
            this.state.notificationHistory = this.state.notificationHistory.slice(0, 1000);
        }
        
        // Save to localStorage periodically
        this.saveHistory();
    }
    
    saveHistory() {
        try {
            localStorage.setItem(
                'whatsapp_notification_history',
                JSON.stringify(this.state.notificationHistory.slice(0, 100)) // Only save last 100
            );
        } catch (error) {
            console.error('Failed to save notification history:', error);
        }
    }
    
    // === APP STATE HANDLERS ===
    
    onAppBackground() {
        console.log('App moved to background');
        
        // Increase notification frequency
        if (this.state.settings.reminder) {
            this.startReminderNotifications();
        }
    }
    
    onAppForeground() {
        console.log('App moved to foreground');
        
        // Clear all notifications
        this.clearAllNotifications();
        
        // Stop reminder notifications
        this.stopReminderNotifications();
        
        // Reset badge count
        this.state.badgeCount = 0;
        this.updateBadge();
    }
    
    startReminderNotifications() {
        if (this.reminderInterval) clearInterval(this.reminderInterval);
        
        this.reminderInterval = setInterval(() => {
            if (this.state.badgeCount > 0) {
                this.showReminderNotification();
            }
        }, this.state.settings.reminderInterval * 60 * 1000);
    }
    
    stopReminderNotifications() {
        if (this.reminderInterval) {
            clearInterval(this.reminderInterval);
            this.reminderInterval = null;
        }
    }
    
    showReminderNotification() {
        const notification = {
            id: `reminder-${Date.now()}`,
            type: 'reminder',
            title: 'WhatsApp',
            body: `You have ${this.state.badgeCount} unread message${this.state.badgeCount !== 1 ? 's' : ''}`,
            icon: '/icons/icon-192.png',
            tag: 'reminder',
            timestamp: Date.now(),
            data: {
                priority: 'low',
                isReminder: true
            },
            requireInteraction: false,
            renotify: false,
            silent: true,
            badge: '/icons/badge-72.png'
        };
        
        this.createNotification(notification);
    }
    
    clearAllNotifications() {
        // Close all active notifications
        this.state.activeNotifications.forEach((notification, id) => {
            // In real app, would close actual notifications
            console.log('Clearing notification:', id);
        });
        
        this.state.activeNotifications.clear();
    }
    
    showWelcomeNotification() {
        const notification = {
            id: 'welcome-notification',
            type: 'system',
            title: 'WhatsApp',
            body: 'Notifications are now enabled! You\'ll be notified about new messages and calls.',
            icon: '/icons/icon-192.png',
            tag: 'welcome',
            timestamp: Date.now(),
            data: {
                priority: 'low',
                isSystem: true
            },
            requireInteraction: false,
            renotify: false,
            silent: true,
            badge: '/icons/badge-72.png'
        };
        
        this.createNotification(notification);
    }
    
    // === PUBLIC API ===
    
    updateSetting(key, value) {
        if (key in this.state.settings) {
            this.state.settings[key] = value;
            this.saveSettings();
            
            // Notify service worker of settings change
            if (navigator.serviceWorker?.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: 'NOTIFICATION_SETTINGS_UPDATE',
                    key,
                    value
                });
            }
            
            return true;
        }
        return false;
    }
    
    getSettings() {
        return { ...this.state.settings };
    }
    
    getPermission() {
        return this.state.permission;
    }
    
    getBadgeCount() {
        return this.state.badgeCount;
    }
    
    clearBadge() {
        this.state.badgeCount = 0;
        this.updateBadge();
    }
    
    testNotification(type = 'message') {
        const testData = {
            message: {
                id: 'test-message',
                type: 'message',
                title: 'Test Notification',
                body: 'This is a test notification from WhatsApp',
                icon: '/icons/icon-192.png',
                tag: 'test',
                timestamp: Date.now(),
                data: {
                    chatId: 'test-chat',
                    messageId: 'test-message',
                    senderId: 'test-user',
                    priority: 'normal'
                },
                requireInteraction: false,
                renotify: false,
                silent: false,
                badge: '/icons/badge-72.png',
                vibrate: this.getVibrationPattern('message'),
                sound: this.getSound('message')
            },
            call: {
                id: 'test-call',
                type: 'call',
                title: 'Test Call',
                body: 'Incoming test call',
                icon: '/icons/icon-192.png',
                tag: 'test-call',
                timestamp: Date.now(),
                data: {
                    callId: 'test-call',
                    callerId: 'test-user',
                    isVideo: false,
                    priority: 'max'
                },
                requireInteraction: true,
                renotify: true,
                silent: false,
                badge: '/icons/badge-72.png',
                vibrate: [1000, 1000, 1000, 1000, 1000],
                sound: 'call'
            }
        };
        
        this.createNotification(testData[type] || testData.message);
    }
}

// === INITIALIZE NOTIFICATIONS ===
document.addEventListener('DOMContentLoaded', () => {
    // Initialize notifications system
    window.notifications = new WhatsAppNotifications();
    
    console.log('🔔 WhatsApp Notifications initialized');
});
