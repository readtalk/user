// === WHATSAPP CALLS HISTORY & VoIP SYSTEM ===
class WhatsAppCalls {
    constructor() {
        this.state = {
            calls: [],
            missedCalls: 0,
            currentCall: null,
            callSettings: {
                audioEnabled: true,
                videoEnabled: false,
                microphoneMuted: false,
                speakerEnabled: false,
                noiseCancellation: true,
                lowDataMode: false,
                callWaiting: true,
                showCallerID: true
            },
            recentContacts: [],
            favorites: [],
            blockedNumbers: [],
            callHistory: [],
            isInCall: false,
            isRinging: false,
            isConnecting: false,
            callDuration: 0,
            callTimer: null,
            ringtone: null,
            vibrationInterval: null,
            lastCallType: null,
            callQuality: 'good'
        };
        
        this.audioContext = null;
        this.mediaStream = null;
        this.peerConnection = null;
        this.dataChannel = null;
        
        this.init();
    }
    
    async init() {
        console.log('📞 WhatsApp Calls initializing...');
        
        // 1. Load call history
        await this.loadCallHistory();
        
        // 2. Setup event listeners
        this.setupEventListeners();
        
        // 3. Setup audio context for ringtones
        this.setupAudioContext();
        
        // 4. Request microphone permissions
        await this.requestMicrophonePermission();
        
        console.log('✅ WhatsApp Calls ready');
    }
    
    async loadCallHistory() {
        try {
            const savedHistory = localStorage.getItem('whatsapp_call_history');
            
            if (savedHistory) {
                const data = JSON.parse(savedHistory);
                this.state.calls = data.calls || [];
                this.state.recentContacts = data.recentContacts || [];
                this.state.favorites = data.favorites || [];
                this.state.blockedNumbers = data.blockedNumbers || [];
                this.state.callSettings = { ...this.state.callSettings, ...data.callSettings };
            } else {
                await this.loadDefaultCalls();
            }
            
            // Calculate missed calls
            this.calculateMissedCalls();
            
        } catch (error) {
            console.error('Failed to load call history:', error);
            await this.loadDefaultCalls();
        }
    }
    
    async loadDefaultCalls() {
        this.state.calls = [
            {
                id: 'call-1',
                contactId: 'c1',
                name: 'Mom',
                avatar: '👩',
                number: '+1234567890',
                type: 'outgoing',
                subtype: 'audio',
                duration: 332, // 5:32 in seconds
                timestamp: Date.now() - 3600000,
                missed: false,
                isVideo: false,
                quality: 'good',
                isConference: false,
                participants: 2,
                notes: 'Birthday call'
            },
            {
                id: 'call-2',
                contactId: 'c2',
                name: 'Dad',
                avatar: '👨',
                number: '+1234567891',
                type: 'incoming',
                subtype: 'video',
                duration: 135, // 2:15 in seconds
                timestamp: Date.now() - 86400000,
                missed: false,
                isVideo: true,
                quality: 'excellent',
                isConference: false,
                participants: 2
            },
            {
                id: 'call-3',
                contactId: null,
                name: 'Unknown',
                avatar: '📞',
                number: '+1234567892',
                type: 'incoming',
                subtype: 'audio',
                duration: 0,
                timestamp: Date.now() - 172800000,
                missed: true,
                isVideo: false,
                quality: 'poor',
                isConference: false,
                participants: 2
            },
            {
                id: 'call-4',
                contactId: 'c3',
                name: 'Work Team',
                avatar: '💼',
                number: 'Group Call',
                type: 'outgoing',
                subtype: 'audio',
                duration: 1860, // 31:00 in seconds
                timestamp: Date.now() - 259200000,
                missed: false,
                isVideo: false,
                quality: 'good',
                isConference: true,
                participants: 8,
                notes: 'Weekly sync'
            }
        ];
        
        this.state.recentContacts = [
            { id: 'c1', name: 'Mom', avatar: '👩', lastCalled: Date.now() - 3600000 },
            { id: 'c2', name: 'Dad', avatar: '👨', lastCalled: Date.now() - 86400000 },
            { id: 'c4', name: 'Sarah', avatar: '👩‍🦰', lastCalled: Date.now() - 604800000 }
        ];
        
        this.state.favorites = ['c1', 'c2'];
        this.state.blockedNumbers = ['+1234567899'];
    }
    
    setupEventListeners() {
        // Calls tab click
        document.addEventListener('tab-change', (e) => {
            if (e.detail.tab === 'calls') {
                this.onCallsTabOpen();
            }
        });
        
        // New call button
        document.addEventListener('new-call', () => {
            this.openCallDialer();
        });
        
        // Call item clicks
        document.addEventListener('click', (e) => {
            const callItem = e.target.closest('.call-item');
            if (callItem) {
                const callId = callItem.dataset.callId;
                this.handleCallItemClick(callId);
            }
            
            const contactItem = e.target.closest('.contact-item');
            if (contactItem) {
                const contactId = contactItem.dataset.contactId;
                this.startCall(contactId);
            }
            
            const callAction = e.target.closest('.call-action');
            if (callAction) {
                const action = callAction.dataset.action;
                this.handleCallAction(action);
            }
        });
        
        // Incoming call simulation (for testing)
        document.addEventListener('simulate-incoming-call', (e) => {
            this.simulateIncomingCall(e.detail);
        });
        
        // Handle call state changes from WebRTC
        this.setupWebRTCEventListeners();
        
        // Handle app visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.state.isInCall) {
                this.showCallInBackground();
            }
        });
        
        // Handle beforeunload during call
        window.addEventListener('beforeunload', (e) => {
            if (this.state.isInCall) {
                e.preventDefault();
                e.returnValue = 'You have an ongoing call. Are you sure you want to leave?';
                return e.returnValue;
            }
        });
    }
    
    setupAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            console.warn('Web Audio API not supported:', error);
        }
    }
    
    async requestMicrophonePermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: true,
                video: false 
            });
            
            // Stop the stream immediately, we just needed permission
            stream.getTracks().forEach(track => track.stop());
            
            this.state.callSettings.audioEnabled = true;
            console.log('Microphone permission granted');
            
        } catch (error) {
            console.warn('Microphone permission denied:', error);
            this.state.callSettings.audioEnabled = false;
        }
    }
    
    // === CALLS TAB ===
    
    onCallsTabOpen() {
        this.updateCallsList();
        this.updateMissedCallsBadge();
    }
    
    updateCallsList() {
        const callsList = document.querySelector('wa-calls-list');
        if (callsList && callsList.shadowRoot) {
            callsList.render();
        }
    }
    
    calculateMissedCalls() {
        this.state.missedCalls = this.state.calls.filter(call => call.missed).length;
        this.updateMissedCallsBadge();
    }
    
    updateMissedCallsBadge() {
        if (window.app) {
            window.app.state.unreadCounts.calls = this.state.missedCalls;
            window.app.calculateUnreadCounts();
        }
    }
    
    // === CALL DIALER ===
    
    openCallDialer() {
        const dialer = document.createElement('div');
        dialer.id = 'callDialer';
        dialer.className = 'call-dialer';
        dialer.innerHTML = this.renderCallDialer();
        
        document.body.appendChild(dialer);
        this.addCallDialerStyles();
        
        // Setup dialer events
        this.setupDialerEvents(dialer);
    }
    
    renderCallDialer() {
        return `
            <div class="call-dialer-container">
                <div class="dialer-header">
                    <button class="dialer-close-btn" onclick="window.calls.closeDialer()">
                        ×
                    </button>
                    <div class="dialer-title">New Call</div>
                    <button class="dialer-settings-btn" onclick="window.calls.openCallSettings()">
                        ⚙️
                    </button>
                </div>
                
                <div class="dialer-content">
                    <!-- Number display -->
                    <div class="number-display" id="numberDisplay">
                        <div class="number-input" contenteditable="true" 
                             placeholder="Enter name or number"></div>
                        <div class="number-hint" id="numberHint"></div>
                    </div>
                    
                    <!-- Recent contacts -->
                    <div class="recent-contacts">
                        <div class="section-title">Recent</div>
                        <div class="contacts-grid" id="recentContactsGrid">
                            ${this.state.recentContacts.slice(0, 6).map(contact => `
                                <div class="contact-item" data-contact-id="${contact.id}">
                                    <div class="contact-avatar">${contact.avatar}</div>
                                    <div class="contact-name">${contact.name}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <!-- Quick actions -->
                    <div class="quick-actions">
                        <button class="quick-action" data-action="add-contact">
                            <span class="action-icon">👤</span>
                            <span class="action-label">Add contact</span>
                        </button>
                        <button class="quick-action" data-action="create-group">
                            <span class="action-icon">👥</span>
                            <span class="action-label">Group call</span>
                        </button>
                    </div>
                </div>
                
                <div class="dialer-footer">
                    <!-- Dial pad -->
                    <div class="dial-pad">
                        ${this.renderDialPad()}
                    </div>
                    
                    <!-- Call buttons -->
                    <div class="call-buttons">
                        <button class="call-btn audio-call" onclick="window.calls.startAudioCall()">
                            <span class="call-icon">📞</span>
                            <span class="call-label">Audio</span>
                        </button>
                        <button class="call-btn video-call" onclick="window.calls.startVideoCall()">
                            <span class="call-icon">📹</span>
                            <span class="call-label">Video</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderDialPad() {
        const keys = [
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
            ['*', '0', '#']
        ];
        
        return `
            <div class="dial-pad-grid">
                ${keys.map(row => `
                    <div class="dial-row">
                        ${row.map(key => `
                            <button class="dial-key" data-key="${key}" 
                                    ontouchstart="window.calls.dialKeyPress('${key}')"
                                    ontouchend="window.calls.dialKeyRelease('${key}')"
                                    onmousedown="window.calls.dialKeyPress('${key}')"
                                    onmouseup="window.calls.dialKeyRelease('${key}')"
                                    onmouseleave="window.calls.dialKeyRelease('${key}')">
                                <div class="key-number">${key}</div>
                                <div class="key-letters">${this.getKeyLetters(key)}</div>
                            </button>
                        `).join('')}
                    </div>
                `).join('')}
                
                <div class="dial-row">
                    <button class="dial-key special" data-action="backspace" 
                            onclick="window.calls.backspace()">
                        ⌫
                    </button>
                    <button class="dial-key special" data-action="add-plus" 
                            onclick="window.calls.addPlus()">
                        +
                    </button>
                    <button class="dial-key special" data-action="paste" 
                            onclick="window.calls.pasteNumber()">
                        📋
                    </button>
                </div>
            </div>
        `;
    }
    
    getKeyLetters(key) {
        const letters = {
            '1': '',
            '2': 'ABC',
            '3': 'DEF',
            '4': 'GHI',
            '5': 'JKL',
            '6': 'MNO',
            '7': 'PQRS',
            '8': 'TUV',
            '9': 'WXYZ',
            '0': '+',
            '*': '',
            '#': ''
        };
        
        return letters[key] || '';
    }
    
    addCallDialerStyles() {
        if (document.getElementById('call-dialer-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'call-dialer-styles';
        styles.textContent = `
            .call-dialer {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: var(--wa-background);
                z-index: 10002;
                animation: dialerSlideUp 0.3s ease;
            }
            
            @keyframes dialerSlideUp {
                from { transform: translateY(100%); }
                to { transform: translateY(0); }
            }
            
            .call-dialer-container {
                position: relative;
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                padding-top: env(safe-area-inset-top, 0);
                padding-bottom: env(safe-area-inset-bottom, 0);
            }
            
            /* Header */
            .dialer-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px;
                background: var(--wa-surface);
                border-bottom: 1px solid var(--wa-border);
            }
            
            .dialer-close-btn, .dialer-settings-btn {
                background: none;
                border: none;
                font-size: 24px;
                color: var(--wa-primary);
                cursor: pointer;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
            }
            
            .dialer-close-btn:hover, .dialer-settings-btn:hover {
                background: var(--wa-border-light);
            }
            
            .dialer-title {
                font-size: 18px;
                font-weight: 500;
                color: var(--wa-text-primary);
            }
            
            /* Content */
            .dialer-content {
                flex: 1;
                padding: 24px;
                overflow-y: auto;
            }
            
            .number-display {
                margin-bottom: 32px;
                text-align: center;
            }
            
            .number-input {
                font-size: 32px;
                font-weight: 300;
                color: var(--wa-text-primary);
                min-height: 48px;
                outline: none;
                border: none;
                background: transparent;
                text-align: center;
                width: 100%;
                caret-color: var(--wa-primary);
            }
            
            .number-input:empty:before {
                content: attr(placeholder);
                color: var(--wa-text-tertiary);
            }
            
            .number-hint {
                font-size: 14px;
                color: var(--wa-text-secondary);
                margin-top: 8px;
                min-height: 20px;
            }
            
            /* Recent contacts */
            .section-title {
                font-size: 14px;
                color: var(--wa-text-secondary);
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 12px;
            }
            
            .contacts-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 16px;
                margin-bottom: 24px;
            }
            
            .contact-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                padding: 12px;
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.2s;
                background: var(--wa-surface);
                border: 1px solid var(--wa-border);
            }
            
            .contact-item:hover {
                background: var(--wa-border-light);
                transform: translateY(-2px);
                box-shadow: var(--wa-shadow-sm);
            }
            
            .contact-avatar {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background: linear-gradient(135deg, var(--wa-primary), var(--wa-primary-light));
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                color: white;
            }
            
            .contact-name {
                font-size: 12px;
                color: var(--wa-text-primary);
                text-align: center;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                width: 100%;
            }
            
            /* Quick actions */
            .quick-actions {
                display: flex;
                gap: 12px;
                margin-bottom: 24px;
            }
            
            .quick-action {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                padding: 16px;
                background: var(--wa-surface);
                border: 1px solid var(--wa-border);
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .quick-action:hover {
                background: var(--wa-border-light);
                transform: translateY(-2px);
            }
            
            .action-icon {
                font-size: 24px;
            }
            
            .action-label {
                font-size: 14px;
                color: var(--wa-text-primary);
            }
            
            /* Footer */
            .dialer-footer {
                background: var(--wa-surface);
                border-top: 1px solid var(--wa-border);
                padding: 24px 16px;
            }
            
            /* Dial pad */
            .dial-pad-grid {
                margin-bottom: 24px;
            }
            
            .dial-row {
                display: flex;
                justify-content: center;
                gap: 16px;
                margin-bottom: 16px;
            }
            
            .dial-key {
                width: 72px;
                height: 72px;
                border-radius: 50%;
                background: var(--wa-surface-secondary);
                border: 1px solid var(--wa-border);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.1s;
                user-select: none;
            }
            
            .dial-key:active {
                background: var(--wa-border);
                transform: scale(0.95);
            }
            
            .key-number {
                font-size: 24px;
                font-weight: 400;
                color: var(--wa-text-primary);
            }
            
            .key-letters {
                font-size: 10px;
                color: var(--wa-text-secondary);
                margin-top: 2px;
                letter-spacing: 0.5px;
            }
            
            .dial-key.special {
                font-size: 20px;
                color: var(--wa-primary);
            }
            
            /* Call buttons */
            .call-buttons {
                display: flex;
                gap: 16px;
            }
            
            .call-btn {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                padding: 20px;
                border: none;
                border-radius: 16px;
                cursor: pointer;
                transition: all 0.2s;
                font-weight: 500;
            }
            
            .call-btn.audio-call {
                background: var(--wa-accent-green);
                color: white;
            }
            
            .call-btn.video-call {
                background: var(--wa-primary);
                color: white;
            }
            
            .call-btn:hover {
                transform: translateY(-2px);
                box-shadow: var(--wa-shadow-md);
            }
            
            .call-btn.audio-call:hover {
                background: #1BC058;
            }
            
            .call-btn.video-call:hover {
                background: var(--wa-primary-dark);
            }
            
            .call-icon {
                font-size: 32px;
            }
            
            .call-label {
                font-size: 16px;
            }
            
            /* Dark mode */
            @media (prefers-color-scheme: dark) {
                .dial-key {
                    background: var(--wa-surface-secondary);
                }
                
                .contact-item, .quick-action {
                    background: var(--wa-surface-secondary);
                }
            }
            
            /* Reduced motion */
            @media (prefers-reduced-motion: reduce) {
                .call-dialer {
                    animation: none;
                }
                
                .contact-item:hover,
                .quick-action:hover,
                .call-btn:hover {
                    transform: none;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    setupDialerEvents(dialer) {
        // Number input events
        const numberInput = dialer.querySelector('.number-input');
        const numberHint = dialer.querySelector('.number-hint');
        
        if (numberInput) {
            numberInput.addEventListener('input', () => {
                this.updateNumberHint(numberInput.textContent);
            });
            
            numberInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.startAudioCall();
                }
            });
            
            // Focus input
            setTimeout(() => {
                numberInput.focus();
                
                // Place cursor at end
                const range = document.createRange();
                const selection = window.getSelection();
                range.selectNodeContents(numberInput);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            }, 100);
        }
    }
    
    updateNumberHint(input) {
        const hint = document.getElementById('numberHint');
        if (!hint) return;
        
        if (!input.trim()) {
            hint.textContent = '';
            return;
        }
        
        // Look for matching contacts
        const matchingContact = this.findContactByNumber(input);
        if (matchingContact) {
            hint.textContent = `Calling ${matchingContact.name}`;
            hint.style.color = 'var(--wa-primary)';
        } else if (this.isValidNumber(input)) {
            hint.textContent = 'Valid number';
            hint.style.color = 'var(--wa-accent-green)';
        } else {
            hint.textContent = 'Enter a valid phone number';
            hint.style.color = 'var(--wa-accent-red)';
        }
    }
    
    findContactByNumber(input) {
        // In real app, would search contacts database
        return this.state.recentContacts.find(contact => 
            contact.name.toLowerCase().includes(input.toLowerCase())
        );
    }
    
    isValidNumber(number) {
        // Simple validation - in real app would use libphonenumber
        const cleaned = number.replace(/[^\d+]/g, '');
        return cleaned.length >= 7 && cleaned.length <= 15;
    }
    
    // === DIAL PAD FUNCTIONS ===
    
    dialKeyPress(key) {
        this.playDTMFTone(key);
        this.addToNumber(key);
        
        // Add pressed state
        const keyElement = document.querySelector(`.dial-key[data-key="${key}"]`);
        if (keyElement) {
            keyElement.classList.add('pressed');
        }
    }
    
    dialKeyRelease(key) {
        const keyElement = document.querySelector(`.dial-key[data-key="${key}"]`);
        if (keyElement) {
            keyElement.classList.remove('pressed');
        }
    }
    
    playDTMFTone(key) {
        if (!this.audioContext) return;
        
        const frequencies = {
            '1': { f1: 697, f2: 1209 },
            '2': { f1: 697, f2: 1336 },
            '3': { f1: 697, f2: 1477 },
            '4': { f1: 770, f2: 1209 },
            '5': { f1: 770, f2: 1336 },
            '6': { f1: 770, f2: 1477 },
            '7': { f1: 852, f2: 1209 },
            '8': { f1: 852, f2: 1336 },
            '9': { f1: 852, f2: 1477 },
            '0': { f1: 941, f2: 1336 },
            '*': { f1: 941, f2: 1209 },
            '#': { f1: 941, f2: 1477 }
        };
        
        const freq = frequencies[key];
        if (!freq) return;
        
        const oscillator1 = this.audioContext.createOscillator();
        const oscillator2 = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator1.frequency.value = freq.f1;
        oscillator2.frequency.value = freq.f2;
        
        oscillator1.type = 'sine';
        oscillator2.type = 'sine';
        
        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Fade in/out
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);
        
        oscillator1.start();
        oscillator2.start();
        
        oscillator1.stop(this.audioContext.currentTime + 0.2);
        oscillator2.stop(this.audioContext.currentTime + 0.2);
    }
    
    addToNumber(key) {
        const input = document.querySelector('.number-input');
        if (input) {
            input.textContent += key;
            this.updateNumberHint(input.textContent);
        }
    }
    
    backspace() {
        const input = document.querySelector('.number-input');
        if (input && input.textContent.length > 0) {
            input.textContent = input.textContent.slice(0, -1);
            this.updateNumberHint(input.textContent);
        }
    }
    
    addPlus() {
        this.addToNumber('+');
    }
    
    async pasteNumber() {
        try {
            const text = await navigator.clipboard.readText();
            const input = document.querySelector('.number-input');
            if (input && text) {
                input.textContent = text.replace(/[^\d+]/g, '');
                this.updateNumberHint(input.textContent);
            }
        } catch (error) {
            console.warn('Failed to read clipboard:', error);
        }
    }
    
    // === CALL MANAGEMENT ===
    
    async startAudioCall(contactId = null) {
        let number = '';
        let name = 'Unknown';
        let avatar = '👤';
        
        if (contactId) {
            const contact = this.findContactById(contactId);
            if (contact) {
                number = contact.number || '';
                name = contact.name;
                avatar = contact.avatar;
            }
        } else {
            const input = document.querySelector('.number-input');
            if (input) {
                number = input.textContent.trim();
            }
        }
        
        if (!number && !contactId) {
            this.showCallError('Please enter a number or select a contact');
            return;
        }
        
        this.state.currentCall = {
            id: `call-${Date.now()}`,
            contactId,
            name,
            avatar,
            number,
            type: 'outgoing',
            subtype: 'audio',
            startTime: Date.now(),
            isVideo: false,
            isConference: false,
            participants: 2,
            status: 'calling'
        };
        
        this.state.isConnecting = true;
        
        // Show calling screen
        this.showCallScreen();
        
        // Simulate call connection
        setTimeout(() => {
            this.answerCall();
        }, 3000);
        
        // Add to recent contacts
        if (contactId) {
            this.addToRecentContacts(contactId);
        }
    }
    
    async startVideoCall(contactId = null) {
        // Request camera permission first
        try {
            await navigator.mediaDevices.getUserMedia({ video: true });
            this.state.callSettings.videoEnabled = true;
        } catch (error) {
            this.showCallError('Camera access is required for video calls');
            return;
        }
        
        // Proceed with audio call logic (same as above but with video)
        await this.startAudioCall(contactId);
        if (this.state.currentCall) {
            this.state.currentCall.subtype = 'video';
            this.state.currentCall.isVideo = true;
        }
    }
    
    findContactById(contactId) {
        // In real app, would fetch from contacts database
        return this.state.recentContacts.find(c => c.id === contactId);
    }
    
    addToRecentContacts(contactId) {
        const contact = this.findContactById(contactId);
        if (!contact) return;
        
        // Remove if already exists
        this.state.recentContacts = this.state.recentContacts.filter(c => c.id !== contactId);
        
        // Add to beginning
        this.state.recentContacts.unshift({
            ...contact,
            lastCalled: Date.now()
        });
        
        // Keep only last 20
        this.state.recentContacts = this.state.recentContacts.slice(0, 20);
        
        this.saveCallHistory();
    }
    
    simulateIncomingCall(details = {}) {
        this.state.currentCall = {
            id: `incoming-${Date.now()}`,
            contactId: details.contactId || null,
            name: details.name || 'Unknown',
            avatar: details.avatar || '📞',
            number: details.number || '+1234567890',
            type: 'incoming',
            subtype: details.isVideo ? 'video' : 'audio',
            startTime: Date.now(),
            isVideo: details.isVideo || false,
            isConference: false,
            participants: 2,
            status: 'ringing'
        };
        
        this.state.isRinging = true;
        
        // Play ringtone
        this.playRingtone();
        
        // Start vibration (if supported)
        this.startVibration();
        
        // Show incoming call screen
        this.showIncomingCallScreen();
        
        // Auto decline after 45 seconds
        setTimeout(() => {
            if (this.state.isRinging) {
                this.declineCall();
            }
        }, 45000);
    }
    
    playRingtone() {
        if (!this.audioContext) return;
        
        // Create simple ringtone
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        // Ring pattern: 1 second on, 2 seconds off
        const now = this.audioContext.currentTime;
        
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.2, now + 0.1);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.9);
        
        oscillator.start();
        
        // Store for later stopping
        this.state.ringtone = { oscillator, gainNode };
        
        // Repeat every 3 seconds
        setInterval(() => {
            if (!this.state.isRinging) return;
            
            const now = this.audioContext.currentTime;
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.2, now + 0.1);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.9);
        }, 3000);
    }
    
    stopRingtone() {
        if (this.state.ringtone) {
            this.state.ringtone.oscillator.stop();
            this.state.ringtone = null;
        }
    }
    
    startVibration() {
        if ('vibrate' in navigator) {
            // Pattern: vibrate for 1 second, pause for 2 seconds
            this.state.vibrationInterval = setInterval(() => {
                if (this.state.isRinging) {
                    navigator.vibrate(1000);
                }
            }, 3000);
            
            // Initial vibration
            navigator.vibrate(1000);
        }
    }
    
    stopVibration() {
        if (this.state.vibrationInterval) {
            clearInterval(this.state.vibrationInterval);
            this.state.vibrationInterval = null;
        }
        
        if ('vibrate' in navigator) {
            navigator.vibrate(0);
        }
    }
    
    // === CALL SCREENS ===
    
    showIncomingCallScreen() {
        const screen = document.createElement('div');
        screen.id = 'incomingCallScreen';
        screen.className = 'call-screen incoming';
        screen.innerHTML = this.renderIncomingCallScreen();
        
        document.body.appendChild(screen);
        this.addCallScreenStyles();
        
        // Prevent screen lock during call
        this.preventScreenLock();
    }
    
    renderIncomingCallScreen() {
        if (!this.state.currentCall) return '';
        
        return `
            <div class="call-screen-container">
                <div class="call-background"></div>
                
                <div class="call-content">
                    <div class="caller-info">
                        <div class="caller-avatar">${this.state.currentCall.avatar}</div>
                        <div class="caller-name">${this.state.currentCall.name}</div>
                        <div class="caller-number">${this.state.currentCall.number}</div>
                        <div class="call-type">
                            ${this.state.currentCall.isVideo ? 'Video call' : 'Audio call'}
                        </div>
                    </div>
                    
                    <div class="call-timer" id="callTimer">00:00</div>
                    
                    <div class="call-controls">
                        <button class="call-control decline" onclick="window.calls.declineCall()">
                            <span class="control-icon">📞</span>
                            <span class="control-label">Decline</span>
                        </button>
                        
                        <button class="call-control answer" onclick="window.calls.answerCall()">
                            <span class="control-icon">${this.state.currentCall.isVideo ? '📹' : '📞'}</span>
                            <span class="control-label">Answer</span>
                        </button>
                    </div>
                    
                    <div class="call-actions">
                        <button class="call-action" onclick="window.calls.sendMessageInstead()">
                            <span class="action-icon">💬</span>
                            <span class="action-label">Message</span>
                        </button>
                        
                        <button class="call-action" onclick="window.calls.remindMeLater()">
                            <span class="action-icon">⏰</span>
                            <span class="action-label">Remind me</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    showCallScreen() {
        const screen = document.createElement('div');
        screen.id = 'callScreen';
        screen.className = 'call-screen active';
        screen.innerHTML = this.renderCallScreen();
        
        document.body.appendChild(screen);
        this.addCallScreenStyles();
        
        // Start call timer
        this.startCallTimer();
        
        // Prevent screen lock
        this.preventScreenLock();
    }
    
    renderCallScreen() {
        if (!this.state.currentCall) return '';
        
        return `
            <div class="call-screen-container">
                <div class="call-background"></div>
                
                <div class="call-content">
                    <div class="caller-info">
                        <div class="caller-avatar">${this.state.currentCall.avatar}</div>
                        <div class="caller-name">${this.state.currentCall.name}</div>
                        <div class="call-status" id="callStatus">
                            ${this.state.isConnecting ? 'Calling...' : 'Connected'}
                        </div>
                    </div>
                    
                    <div class="call-timer" id="callTimer">00:00</div>
                    
                    <div class="call-controls">
                        <button class="call-control mute" 
                                onclick="window.calls.toggleMute()"
                                ${this.state.callSettings.microphoneMuted ? 'data-active="true"' : ''}>
                            <span class="control-icon">🎤</span>
                            <span class="control-label">Mute</span>
                        </button>
                        
                        <button class="call-control speaker" 
                                onclick="window.calls.toggleSpeaker()"
                                ${this.state.callSettings.speakerEnabled ? 'data-active="true"' : ''}>
                            <span class="control-icon">🔊</span>
                            <span class="control-label">Speaker</span>
                        </button>
                        
                        ${this.state.currentCall.isVideo ? `
                            <button class="call-control video" 
                                    onclick="window.calls.toggleVideo()"
                                    ${!this.state.callSettings.videoEnabled ? 'data-active="true"' : ''}>
                                <span class="control-icon">📹</span>
                                <span class="control-label">Video</span>
                            </button>
                        ` : ''}
                        
                        <button class="call-control end-call" onclick="window.calls.endCall()">
                            <span class="control-icon">📞</span>
                            <span class="control-label">End</span>
                        </button>
                    </div>
                    
                    <div class="call-actions">
                        <button class="call-action" onclick="window.calls.addParticipant()">
                            <span class="action-icon">👥</span>
                            <span class="action-label">Add</span>
                        </button>
                        
                        <button class="call-action" onclick="window.calls.openKeypad()">
                            <span class="action-icon">🔢</span>
                            <span class="action-label">Keypad</span>
                        </button>
                        
                        <button class="call-action" onclick="window.calls.holdCall()">
                            <span class="action-icon">⏸️</span>
                            <span class="action-label">Hold</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    addCallScreenStyles() {
        if (document.getElementById('call-screen-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'call-screen-styles';
        styles.textContent = `
            .call-screen {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: #000;
                z-index: 10003;
                animation: callScreenFadeIn 0.3s ease;
            }
            
            @keyframes callScreenFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            .call-screen-container {
                position: relative;
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                padding: 48px 24px;
                padding-top: calc(48px + env(safe-area-inset-top, 0));
                padding-bottom: calc(48px + env(safe-area-inset-bottom, 0));
            }
            
            .call-background {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, #111B21, #005C4B);
                opacity: 0.9;
            }
            
            .call-content {
                position: relative;
                z-index: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                color: white;
                text-align: center;
            }
            
            /* Caller info */
            .caller-info {
                margin-bottom: 32px;
            }
            
            .caller-avatar {
                width: 120px;
                height: 120px;
                border-radius: 50%;
                background: linear-gradient(135deg, var(--wa-primary), var(--wa-primary-light));
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 48px;
                margin: 0 auto 24px;
                border: 4px solid rgba(255, 255, 255, 0.2);
            }
            
            .caller-name {
                font-size: 32px;
                font-weight: 500;
                margin-bottom: 8px;
            }
            
            .caller-number {
                font-size: 18px;
                opacity: 0.8;
                margin-bottom: 8px;
            }
            
            .call-type, .call-status {
                font-size: 16px;
                opacity: 0.7;
            }
            
            /* Call timer */
            .call-timer {
                font-size: 48px;
                font-weight: 300;
                margin: 32px 0;
                font-feature-settings: "tnum";
                font-variant-numeric: tabular-nums;
            }
            
            /* Call controls */
            .call-controls {
                display: flex;
                gap: 32px;
                margin: 32px 0;
            }
            
            .call-control {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                background: rgba(255, 255, 255, 0.1);
                border: 2px solid rgba(255, 255, 255, 0.2);
                color: white;
                width: 80px;
                height: 80px;
                border-radius: 50%;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .call-control:hover {
                background: rgba(255, 255, 255, 0.2);
                transform: scale(1.05);
            }
            
            .call-control[data-active="true"] {
                background: rgba(255, 255, 255, 0.3);
                border-color: white;
            }
            
            .call-control.decline {
                background: #F44336;
                border-color: #F44336;
            }
            
            .call-control.answer {
                background: #4CAF50;
                border-color: #4CAF50;
            }
            
            .call-control.end-call {
                background: #F44336;
                border-color: #F44336;
            }
            
            .control-icon {
                font-size: 24px;
            }
            
            .control-label {
                font-size: 12px;
                opacity: 0.9;
            }
            
            /* Call actions */
            .call-actions {
                display: flex;
                gap: 24px;
                margin-top: 32px;
            }
            
            .call-action {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                color: white;
                padding: 12px 16px;
                border-radius: 20px;
                cursor: pointer;
                transition: all 0.2s;
                min-width: 80px;
            }
            
            .call-action:hover {
                background: rgba(255, 255, 255, 0.1);
            }
            
            .action-icon {
                font-size: 20px;
            }
            
            .action-label {
                font-size: 12px;
                opacity: 0.8;
            }
            
            /* Incoming call specific */
            .call-screen.incoming .call-controls {
                margin-top: 48px;
            }
            
            /* Reduced motion */
            @media (prefers-reduced-motion: reduce) {
                .call-screen {
                    animation: none;
                }
                
                .call-control:hover {
                    transform: none;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    // === CALL CONTROLS ===
    
    answerCall() {
        if (!this.state.currentCall) return;
        
        this.stopRingtone();
        this.stopVibration();
        this.state.isRinging = false;
        this.state.isConnecting = false;
        this.state.isInCall = true;
        this.state.currentCall.status = 'connected';
        this.state.currentCall.startTime = Date.now();
        
        // Update call screen
        const incomingScreen = document.getElementById('incomingCallScreen');
        if (incomingScreen) {
            incomingScreen.remove();
        }
        
        this.showCallScreen();
        
        // Start WebRTC connection
        this.startWebRTCConnection();
    }
    
    declineCall() {
        if (this.state.currentCall) {
            this.state.currentCall.status = 'missed';
            this.state.currentCall.missed = true;
            this.state.currentCall.duration = 0;
            this.addCallToHistory(this.state.currentCall);
        }
        
        this.endCall();
    }
    
    endCall() {
        // Stop all call-related activities
        this.stopRingtone();
        this.stopVibration();
        this.stopCallTimer();
        
        if (this.state.currentCall) {
            const duration = Math.floor((Date.now() - this.state.currentCall.startTime) / 1000);
            this.state.currentCall.duration = duration;
            this.state.currentCall.status = 'ended';
            
            if (this.state.currentCall.type === 'outgoing' && duration > 0) {
                this.addCallToHistory(this.state.currentCall);
            }
        }
        
        // Remove call screens
        ['incomingCallScreen', 'callScreen'].forEach(id => {
            const screen = document.getElementById(id);
            if (screen) screen.remove();
        });
        
        // Close dialer if open
        this.closeDialer();
        
        // Reset state
        this.state.isInCall = false;
        this.state.isRinging = false;
        this.state.isConnecting = false;
        this.state.currentCall = null;
        this.state.callDuration = 0;
        
        // Stop WebRTC
        this.stopWebRTCConnection();
        
        // Update missed calls count
        this.calculateMissedCalls();
        
        // Allow screen lock again
        this.allowScreenLock();
    }
    
    toggleMute() {
        this.state.callSettings.microphoneMuted = !this.state.callSettings.microphoneMuted;
        
        // Update UI
        const muteButton = document.querySelector('.call-control.mute');
        if (muteButton) {
            muteButton.dataset.active = this.state.callSettings.microphoneMuted;
        }
        
        // In real app, would mute audio track
        if (this.mediaStream) {
            this.mediaStream.getAudioTracks().forEach(track => {
                track.enabled = !this.state.callSettings.microphoneMuted;
            });
        }
    }
    
    toggleSpeaker() {
        this.state.callSettings.speakerEnabled = !this.state.callSettings.speakerEnabled;
        
        // Update UI
        const speakerButton = document.querySelector('.call-control.speaker');
        if (speakerButton) {
            speakerButton.dataset.active = this.state.callSettings.speakerEnabled;
        }
        
        // In real app, would switch audio output
    }
    
    toggleVideo() {
        this.state.callSettings.videoEnabled = !this.state.callSettings.videoEnabled;
        
        // Update UI
        const videoButton = document.querySelector('.call-control.video');
        if (videoButton) {
            videoButton.dataset.active = !this.state.callSettings.videoEnabled;
        }
        
        // In real app, would enable/disable video track
        if (this.mediaStream) {
            this.mediaStream.getVideoTracks().forEach(track => {
                track.enabled = this.state.callSettings.videoEnabled;
            });
        }
    }
    
    // === CALL TIMER ===
    
    startCallTimer() {
        this.stopCallTimer();
        
        this.state.callTimer = setInterval(() => {
            if (!this.state.currentCall || !this.state.currentCall.startTime) return;
            
            const elapsed = Math.floor((Date.now() - this.state.currentCall.startTime) / 1000);
            this.state.callDuration = elapsed;
            
            const timerElement = document.getElementById('callTimer');
            if (timerElement) {
                const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
                const seconds = (elapsed % 60).toString().padStart(2, '0');
                timerElement.textContent = `${minutes}:${seconds}`;
            }
        }, 1000);
    }
    
    stopCallTimer() {
        if (this.state.callTimer) {
            clearInterval(this.state.callTimer);
            this.state.callTimer = null;
        }
    }
    
    // === CALL HISTORY ===
    
    addCallToHistory(call) {
        const callRecord = {
            id: call.id,
            contactId: call.contactId,
            name: call.name,
            avatar: call.avatar,
            number: call.number,
            type: call.type,
            subtype: call.subtype,
            duration: call.duration,
            timestamp: call.startTime,
            missed: call.missed || false,
            isVideo: call.isVideo,
            quality: this.state.callQuality,
            isConference: call.isConference,
            participants: call.participants,
            notes: call.notes
        };
        
        // Add to beginning of calls list
        this.state.calls.unshift(callRecord);
        
        // Keep only last 100 calls
        if (this.state.calls.length > 100) {
            this.state.calls = this.state.calls.slice(0, 100);
        }
        
        this.saveCallHistory();
        this.updateCallsList();
    }
    
    saveCallHistory() {
        try {
            const data = {
                calls: this.state.calls,
                recentContacts: this.state.recentContacts,
                favorites: this.state.favorites,
                blockedNumbers: this.state.blockedNumbers,
                callSettings: this.state.callSettings
            };
            
            localStorage.setItem('whatsapp_call_history', JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save call history:', error);
        }
    }
    
    // === WEBRTC (Simplified) ===
    
    setupWebRTCEventListeners() {
        // WebRTC event handlers would go here
    }
    
    async startWebRTCConnection() {
        try {
            // Get user media
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: this.state.currentCall?.isVideo || false
            });
            
            // Create peer connection
            const configuration = {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            };
            
            this.peerConnection = new RTCPeerConnection(configuration);
            
            // Add local stream
            this.mediaStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.mediaStream);
            });
            
            // Create data channel for signaling
            this.dataChannel = this.peerConnection.createDataChannel('whatsapp-call');
            this.setupDataChannel();
            
            // Create offer
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            
            // In real app, would send offer to signaling server
            console.log('WebRTC offer created');
            
        } catch (error) {
            console.error('WebRTC setup failed:', error);
            this.showCallError('Failed to start call');
            this.endCall();
        }
    }
    
    setupDataChannel() {
        if (!this.dataChannel) return;
        
        this.dataChannel.onopen = () => {
            console.log('Data channel opened');
        };
        
        this.dataChannel.onmessage = (event) => {
            console.log('Data channel message:', event.data);
        };
        
        this.dataChannel.onclose = () => {
            console.log('Data channel closed');
        };
    }
    
    stopWebRTCConnection() {
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        
        if (this.dataChannel) {
            this.dataChannel.close();
            this.dataChannel = null;
        }
        
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
    }
    
    // === HELPER FUNCTIONS ===
    
    handleCallItemClick(callId) {
        const call = this.state.calls.find(c => c.id === callId);
        if (call) {
            if (call.contactId) {
                this.startAudioCall(call.contactId);
            } else {
                this.openCallDialer();
                const input = document.querySelector('.number-input');
                if (input) {
                    input.textContent = call.number;
                    this.updateNumberHint(call.number);
                }
            }
        }
    }
    
    handleCallAction(action) {
        switch(action) {
            case 'call-back':
                this.startAudioCall();
                break;
            case 'send-message':
                this.sendMessageInstead();
                break;
            case 'view-contact':
                this.viewContact();
                break;
            case 'delete-call':
                this.deleteCall();
                break;
        }
    }
    
    sendMessageInstead() {
        if (this.state.currentCall) {
            console.log('Redirecting to chat with:', this.state.currentCall.name);
            // In real app, would open chat
            this.endCall();
        }
    }
    
    remindMeLater() {
        // Create reminder
        const reminderTime = Date.now() + (5 * 60 * 1000); // 5 minutes later
        
        console.log('Reminder set for:', new Date(reminderTime).toLocaleTimeString());
        this.showToast('Reminder set for 5 minutes', 'info');
        
        this.endCall();
    }
    
    addParticipant() {
        console.log('Add participant clicked');
        // In real app, would open contact picker
    }
    
    openKeypad() {
        console.log('Keypad opened');
        // In real app, would show DTMF keypad
    }
    
    holdCall() {
        console.log('Call hold toggled');
        // In real app, would put call on hold
    }
    
    showCallInBackground() {
        // In real app, would show call in PIP or notification
        console.log('Call moved to background');
    }
    
    preventScreenLock() {
        if ('wakeLock' in navigator) {
            navigator.wakeLock.request('screen').then(wakeLock => {
                this.state.wakeLock = wakeLock;
            }).catch(console.error);
        }
    }
    
    allowScreenLock() {
        if (this.state.wakeLock) {
            this.state.wakeLock.release();
            this.state.wakeLock = null;
        }
    }
    
    showCallError(message) {
        this.showToast(message, 'error');
    }
    
    showToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `call-toast ${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'error' ? '#F44336' : '#2196F3'};
            color: white;
            padding: 12px 24px;
            border-radius: 24px;
            z-index: 10004;
            animation: toastSlideDown 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'toastSlideUp 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    closeDialer() {
        const dialer = document.getElementById('callDialer');
        if (dialer) {
            dialer.style.animation = 'dialerSlideDown 0.3s ease';
            setTimeout(() => {
                dialer.remove();
            }, 300);
        }
    }
    
    openCallSettings() {
        console.log('Open call settings');
        // In real app, would open settings page
    }
}

// === INITIALIZE CALLS ===
document.addEventListener('DOMContentLoaded', () => {
    // Initialize calls system
    window.calls = new WhatsAppCalls();
    
    console.log('📞 WhatsApp Calls initialized');
});
