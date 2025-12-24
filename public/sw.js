// === WHATSAPP PWA SERVICE WORKER ===
const CACHE_NAME = 'whatsapp-lobby-v2';
const APP_VERSION = '2.0.0';

// Cache strategies
const CACHE_STRATEGIES = {
    STATIC: 'static',
    API: 'api',
    MEDIA: 'media'
};

// Cache configurations
const CACHE_CONFIGS = {
    [CACHE_STRATEGIES.STATIC]: {
        files: [
            '/',
            '/index.html',
            '/app.css',
            '/dark.css',
            '/splash.css',
            '/app.js',
            '/components.js',
            '/search.js',
            '/gestures.js',
            '/status.js',
            '/calls.js',
            '/notifications.js',
            '/manifest.json',
            // Icons
            '/icons/icon-192.png',
            '/icons/icon-512.png',
            '/icons/icon-180.png',
            '/icons/icon-mask.svg',
            '/icons/splash-640x1136.png',
            '/icons/splash-750x1294.png',
            '/icons/splash-1242x2148.png'
        ],
        strategy: 'CacheFirst'
    },
    [CACHE_STRATEGIES.API]: {
        files: [],
        strategy: 'NetworkFirst'
    },
    [CACHE_STRATEGIES.MEDIA]: {
        files: [],
        strategy: 'StaleWhileRevalidate'
    }
};

// Push notification configuration
const NOTIFICATION_CONFIG = {
    badge: '/icons/icon-72.png',
    icon: '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    requireInteraction: false,
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
};

// === INSTALL EVENT ===
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing version:', APP_VERSION);
    
    event.waitUntil(
        (async () => {
            // Create cache for static assets
            const staticCache = await caches.open(`${CACHE_NAME}-static`);
            await staticCache.addAll(CACHE_CONFIGS[CACHE_STRATEGIES.STATIC].files);
            
            // Skip waiting to activate immediately
            self.skipWaiting();
            
            console.log('[Service Worker] Installation complete');
        })()
    );
});

// === ACTIVATE EVENT ===
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating version:', APP_VERSION);
    
    event.waitUntil(
        (async () => {
            // Clean up old caches
            const cacheKeys = await caches.keys();
            await Promise.all(
                cacheKeys.map(key => {
                    if (key !== CACHE_NAME && !key.startsWith(`${CACHE_NAME}-`)) {
                        console.log('[Service Worker] Deleting old cache:', key);
                        return caches.delete(key);
                    }
                })
            );
            
            // Claim clients immediately
            await self.clients.claim();
            
            console.log('[Service Worker] Activation complete');
            
            // Notify all clients about update
            const clients = await self.clients.matchAll();
            clients.forEach(client => {
                client.postMessage({
                    type: 'SW_UPDATE',
                    version: APP_VERSION
                });
            });
        })()
    );
});

// === FETCH EVENT (Intelligent Caching) ===
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;
    
    // Skip Chrome extensions and external resources
    if (url.protocol === 'chrome-extension:' || 
        !url.hostname.includes(location.hostname) && 
        !url.hostname.includes('whatsapp.com')) {
        return;
    }
    
    // Determine cache strategy based on request
    const strategy = getCacheStrategy(event.request);
    
    switch(strategy) {
        case CACHE_STRATEGIES.STATIC:
            event.respondWith(cacheFirst(event.request));
            break;
        case CACHE_STRATEGIES.API:
            event.respondWith(networkFirst(event.request));
            break;
        case CACHE_STRATEGIES.MEDIA:
            event.respondWith(staleWhileRevalidate(event.request));
            break;
        default:
            event.respondWith(networkOnly(event.request));
    }
});

// === CACHE STRATEGIES ===

// Cache First (for static assets)
async function cacheFirst(request) {
    const cache = await caches.open(`${CACHE_NAME}-static`);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        // Update cache in background
        event.waitUntil(
            fetch(request)
                .then(networkResponse => {
                    if (networkResponse.ok) {
                        cache.put(request, networkResponse.clone());
                    }
                })
                .catch(() => {}) // Silent fail
        );
        
        return cachedResponse;
    }
    
    // If not in cache, fetch from network
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        // If both cache and network fail, return offline page
        if (request.headers.get('accept').includes('text/html')) {
            return cache.match('/');
        }
        
        throw error;
    }
}

// Network First (for API calls)
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(`${CACHE_NAME}-api`);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        // Fallback to cache
        const cache = await caches.open(`${CACHE_NAME}-api`);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline response for API
        return new Response(
            JSON.stringify({ 
                error: 'You are offline',
                cached: true,
                timestamp: Date.now()
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

// Stale While Revalidate (for media)
async function staleWhileRevalidate(request) {
    const cache = await caches.open(`${CACHE_NAME}-media`);
    const cachedResponse = await cache.match(request);
    
    // Return cached response immediately
    const fetchPromise = fetch(request)
        .then(networkResponse => {
            if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
        })
        .catch(() => {}); // Silent fail
    
    return cachedResponse || fetchPromise;
}

// Network Only (for real-time data)
async function networkOnly(request) {
    return fetch(request);
}

// === PUSH NOTIFICATIONS ===
self.addEventListener('push', (event) => {
    console.log('[Service Worker] Push received');
    
    if (!event.data) return;
    
    const data = event.data.json();
    const options = {
        body: data.body || 'New message',
        icon: NOTIFICATION_CONFIG.icon,
        badge: NOTIFICATION_CONFIG.badge,
        vibrate: NOTIFICATION_CONFIG.vibrate,
        timestamp: data.timestamp || Date.now(),
        data: {
            url: data.url || '/',
            chatId: data.chatId,
            sender: data.sender,
            messageId: data.messageId,
            type: data.type || 'message'
        },
        tag: data.chatId ? `chat-${data.chatId}` : undefined,
        renotify: true,
        requireInteraction: NOTIFICATION_CONFIG.requireInteraction,
        actions: data.type === 'message' ? NOTIFICATION_CONFIG.actions : []
    };
    
    // Add image if available
    if (data.image) {
        options.image = data.image;
    }
    
    event.waitUntil(
        self.registration.showNotification(
            data.title || 'WhatsApp',
            options
        )
    );
});

// === NOTIFICATION CLICK ===
self.addEventListener('notificationclick', (event) => {
    console.log('[Service Worker] Notification click:', event.action);
    
    event.notification.close();
    
    const notificationData = event.notification.data;
    
    // Handle action buttons
    if (event.action === 'reply') {
        // Open chat with reply interface
        openChatWithReply(notificationData.chatId);
        return;
    }
    
    if (event.action === 'mark-read') {
        // Mark as read via background sync
        markAsRead(notificationData.messageId);
        return;
    }
    
    // Default: Open the app
    event.waitUntil(
        (async () => {
            const clients = await self.clients.matchAll({
                type: 'window',
                includeUncontrolled: true
            });
            
            // Focus existing window
            for (const client of clients) {
                if (client.url === '/' && 'focus' in client) {
                    await client.focus();
                    
                    // Send message to open specific chat
                    if (notificationData.chatId) {
                        client.postMessage({
                            type: 'OPEN_CHAT',
                            chatId: notificationData.chatId
                        });
                    }
                    
                    return;
                }
            }
            
            // Open new window if none exists
            if (self.clients.openWindow) {
                const url = notificationData.url || '/';
                const newClient = await self.clients.openWindow(url);
                
                // Wait for window to load, then send message
                if (newClient && notificationData.chatId) {
                    setTimeout(() => {
                        newClient.postMessage({
                            type: 'OPEN_CHAT',
                            chatId: notificationData.chatId
                        });
                    }, 1000);
                }
            }
        })()
    );
});

// === BACKGROUND SYNC ===
self.addEventListener('sync', (event) => {
    console.log('[Service Worker] Background sync:', event.tag);
    
    switch(event.tag) {
        case 'sync-messages':
            event.waitUntil(syncPendingMessages());
            break;
        case 'sync-read-receipts':
            event.waitUntil(syncReadReceipts());
            break;
        case 'sync-status':
            event.waitUntil(syncStatusUpdates());
            break;
    }
});

// === PERIODIC SYNC ===
self.addEventListener('periodicsync', (event) => {
    console.log('[Service Worker] Periodic sync:', event.tag);
    
    if (event.tag === 'update-presence') {
        event.waitUntil(updateOnlinePresence());
    }
});

// === MESSAGE HANDLER (Client to Service Worker) ===
self.addEventListener('message', (event) => {
    console.log('[Service Worker] Message received:', event.data.type);
    
    switch(event.data.type) {
        case 'GET_CACHE_STATUS':
            event.ports[0].postMessage({
                cacheName: CACHE_NAME,
                version: APP_VERSION,
                isOnline: navigator.onLine
            });
            break;
            
        case 'CLEAR_CACHE':
            caches.delete(CACHE_NAME)
                .then(() => {
                    event.ports[0].postMessage({ success: true });
                })
                .catch(error => {
                    event.ports[0].postMessage({ success: false, error: error.message });
                });
            break;
            
        case 'PREFETCH_RESOURCES':
            prefetchResources(event.data.urls);
            break;
            
        case 'UPDATE_NOTIFICATION_SETTINGS':
            updateNotificationSettings(event.data.settings);
            break;
    }
});

// === HELPER FUNCTIONS ===

function getCacheStrategy(request) {
    const url = new URL(request.url);
    
    // Static assets
    if (url.pathname.match(/\.(css|js|json|png|jpg|svg|woff2)$/)) {
        return CACHE_STRATEGIES.STATIC;
    }
    
    // API endpoints
    if (url.pathname.includes('/api/') || url.pathname.includes('/graphql')) {
        return CACHE_STRATEGIES.API;
    }
    
    // Media files
    if (url.pathname.match(/\.(mp3|mp4|webm|ogg|wav)$/)) {
        return CACHE_STRATEGIES.MEDIA;
    }
    
    // HTML pages
    if (request.headers.get('accept').includes('text/html')) {
        return CACHE_STRATEGIES.STATIC;
    }
    
    return null;
}

async function syncPendingMessages() {
    console.log('[Service Worker] Syncing pending messages');
    
    // Get pending messages from IndexedDB
    const pendingMessages = await getPendingMessages();
    
    for (const message of pendingMessages) {
        try {
            await sendMessageToServer(message);
            await markMessageAsSent(message.id);
        } catch (error) {
            console.error('[Service Worker] Failed to sync message:', error);
        }
    }
}

async function syncReadReceipts() {
    console.log('[Service Worker] Syncing read receipts');
    
    const readReceipts = await getPendingReadReceipts();
    
    for (const receipt of readReceipts) {
        try {
            await sendReadReceipt(receipt);
            await markReceiptAsSynced(receipt.id);
        } catch (error) {
            console.error('[Service Worker] Failed to sync read receipt:', error);
        }
    }
}

async function syncStatusUpdates() {
    console.log('[Service Worker] Syncing status updates');
    
    const statusUpdates = await getPendingStatusUpdates();
    
    for (const status of statusUpdates) {
        try {
            await uploadStatus(status);
            await markStatusAsSynced(status.id);
        } catch (error) {
            console.error('[Service Worker] Failed to sync status:', error);
        }
    }
}

async function updateOnlinePresence() {
    if (!navigator.onLine) return;
    
    console.log('[Service Worker] Updating online presence');
    
    try {
        await fetch('/api/presence', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                lastSeen: Date.now(),
                status: 'online'
            })
        });
    } catch (error) {
        console.error('[Service Worker] Failed to update presence:', error);
    }
}

async function prefetchResources(urls) {
    const cache = await caches.open(`${CACHE_NAME}-prefetch`);
    
    for (const url of urls) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                cache.put(url, response);
            }
        } catch (error) {
            console.warn('[Service Worker] Failed to prefetch:', url);
        }
    }
}

function updateNotificationSettings(settings) {
    // Store notification preferences
    console.log('[Service Worker] Updated notification settings:', settings);
}

function openChatWithReply(chatId) {
    // Implementation would open chat with reply interface
    console.log('[Service Worker] Open chat with reply:', chatId);
}

function markAsRead(messageId) {
    // Implementation would mark message as read
    console.log('[Service Worker] Mark as read:', messageId);
}

// === INDEXEDDB HELPERS (Placeholders) ===

async function getPendingMessages() {
    // In real app, would query IndexedDB
    return [];
}

async function sendMessageToServer(message) {
    // In real app, would send to server
    return Promise.resolve();
}

async function markMessageAsSent(messageId) {
    // In real app, would update IndexedDB
    return Promise.resolve();
}

async function getPendingReadReceipts() {
    return [];
}

async function sendReadReceipt(receipt) {
    return Promise.resolve();
}

async function markReceiptAsSynced(receiptId) {
    return Promise.resolve();
}

async function getPendingStatusUpdates() {
    return [];
}

async function uploadStatus(status) {
    return Promise.resolve();
}

async function markStatusAsSynced(statusId) {
    return Promise.resolve();
}

// === ERROR HANDLING ===
self.addEventListener('error', (event) => {
    console.error('[Service Worker] Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('[Service Worker] Unhandled rejection:', event.reason);
});

// === SERVICE WORKER LIFE CYCLE ===
console.log('[Service Worker] Loaded version:', APP_VERSION);

// Send ready message to all clients
self.addEventListener('activate', () => {
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({
                type: 'SW_READY',
                version: APP_VERSION
            });
        });
    });
});
