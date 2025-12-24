// === WHATSAPP ADVANCED SEARCH SYSTEM ===
class WhatsAppSearch {
    constructor() {
        this.searchIndex = {
            chats: [],
            messages: [],
            contacts: [],
            media: [],
            documents: []
        };
        
        this.searchHistory = [];
        this.searchFilters = {
            unread: false,
            groups: false,
            contacts: false,
            media: false,
            links: false,
            documents: false,
            audio: false,
            dateFrom: null,
            dateTo: null
        };
        
        this.currentResults = [];
        this.isSearching = false;
        
        this.init();
    }
    
    async init() {
        console.log('🔍 WhatsApp Search initializing...');
        
        // 1. Build search index
        await this.buildSearchIndex();
        
        // 2. Setup event listeners
        this.setupEventListeners();
        
        // 3. Load search history
        await this.loadSearchHistory();
        
        console.log('✅ WhatsApp Search ready');
    }
    
    async buildSearchIndex() {
        if (!window.app) return;
        
        // Index chats
        this.searchIndex.chats = window.app.state.chats.map(chat => ({
            id: chat.id,
            type: 'chat',
            name: chat.name,
            avatar: chat.avatar,
            lastMessage: chat.lastMessage,
            timestamp: chat.timestamp,
            unread: chat.unread,
            isGroup: chat.isGroup,
            isArchived: chat.isArchived,
            isMuted: chat.isMuted,
            participants: chat.participants
        }));
        
        // Simulate message indexing (in real app, would index from IndexedDB)
        this.searchIndex.messages = [
            {
                id: 'msg1',
                chatId: '1',
                type: 'message',
                sender: 'You',
                content: 'Dinner at 7! 🍽️',
                timestamp: Date.now() - 3600000,
                hasMedia: false,
                hasLinks: false
            },
            {
                id: 'msg2',
                chatId: '2',
                type: 'message',
                sender: 'Mom',
                content: 'Call me when you\'re free ❤️',
                timestamp: Date.now() - 7200000,
                hasMedia: false,
                hasLinks: false
            },
            {
                id: 'msg3',
                chatId: '3',
                type: 'message',
                sender: 'Work Team',
                content: 'Meeting moved to 3 PM https://meet.google.com/abc-defg-hij',
                timestamp: Date.now() - 86400000,
                hasMedia: false,
                hasLinks: true
            }
        ];
        
        // Index contacts (simulated)
        this.searchIndex.contacts = [
            { id: 'c1', type: 'contact', name: 'Mom', phone: '+1234567890' },
            { id: 'c2', type: 'contact', name: 'Dad', phone: '+1234567891' },
            { id: 'c3', type: 'contact', name: 'Sarah Miller', phone: '+1234567892' }
        ];
    }
    
    setupEventListeners() {
        // Search input events
        const searchInput = document.getElementById('searchInput');
        const searchClear = document.querySelector('.search-clear');
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearchInput(e.target.value);
            });
            
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch(e.target.value);
                }
                
                if (e.key === 'Escape') {
                    this.closeSearch();
                }
            });
            
            searchInput.addEventListener('focus', () => {
                this.showSearchSuggestions();
            });
        }
        
        if (searchClear) {
            searchClear.addEventListener('click', () => {
                this.clearSearch();
            });
        }
        
        // Filter buttons
        document.querySelectorAll('.search-filter').forEach(button => {
            button.addEventListener('click', (e) => {
                const filter = e.currentTarget.dataset.filter;
                this.toggleFilter(filter);
            });
        });
        
        // Search result clicks
        document.addEventListener('click', (e) => {
            const resultItem = e.target.closest('.search-result-item');
            if (resultItem) {
                const resultId = resultItem.dataset.resultId;
                const resultType = resultItem.dataset.resultType;
                this.handleResultClick(resultId, resultType);
            }
        });
    }
    
    async loadSearchHistory() {
        try {
            const history = localStorage.getItem('whatsapp_search_history');
            if (history) {
                this.searchHistory = JSON.parse(history);
            }
        } catch (error) {
            console.warn('Failed to load search history:', error);
        }
    }
    
    async saveSearchHistory() {
        try {
            // Keep only last 50 searches
            if (this.searchHistory.length > 50) {
                this.searchHistory = this.searchHistory.slice(-50);
            }
            
            localStorage.setItem('whatsapp_search_history', JSON.stringify(this.searchHistory));
        } catch (error) {
            console.warn('Failed to save search history:', error);
        }
    }
    
    handleSearchInput(query) {
        const searchClear = document.querySelector('.search-clear');
        
        if (searchClear) {
            searchClear.hidden = !query.trim();
        }
        
        if (query.trim().length >= 2) {
            this.showSearchSuggestions(query);
        } else {
            this.showRecentSearches();
        }
    }
    
    showRecentSearches() {
        const resultsContainer = document.getElementById('searchResults');
        if (!resultsContainer) return;
        
        if (this.searchHistory.length === 0) {
            resultsContainer.innerHTML = `
                <div class="search-empty">
                    <div class="search-empty-icon">🔍</div>
                    <h4>Search messages, contacts, or chats</h4>
                    <p class="search-empty-hint">
                        Try searching for a contact name, chat, or message content
                    </p>
                </div>
            `;
            return;
        }
        
        resultsContainer.innerHTML = `
            <div class="search-section">
                <div class="section-header">
                    <span>Recent searches</span>
                    <button class="clear-history" onclick="window.search.clearHistory()">Clear all</button>
                </div>
                <div class="recent-searches">
                    ${this.searchHistory.map((search, index) => `
                        <div class="recent-search-item" data-query="${search.query}">
                            <span class="recent-search-icon">🔍</span>
                            <span class="recent-search-query">${search.query}</span>
                            <span class="recent-search-time">${this.formatTimeAgo(search.timestamp)}</span>
                            <button class="recent-search-remove" data-index="${index}">×</button>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="search-section">
                <div class="section-header">Quick filters</div>
                <div class="quick-filters">
                    <button class="quick-filter" data-filter="unread">
                        <span class="filter-icon">🔔</span>
                        <span>Unread messages</span>
                    </button>
                    <button class="quick-filter" data-filter="media">
                        <span class="filter-icon">📷</span>
                        <span>Photos & videos</span>
                    </button>
                    <button class="quick-filter" data-filter="links">
                        <span class="filter-icon">🔗</span>
                        <span>Links</span>
                    </button>
                    <button class="quick-filter" data-filter="documents">
                        <span class="filter-icon">📎</span>
                        <span>Documents</span>
                    </button>
                </div>
            </div>
        `;
        
        // Add event listeners to recent searches
        resultsContainer.querySelectorAll('.recent-search-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('recent-search-remove')) {
                    const query = item.dataset.query;
                    document.getElementById('searchInput').value = query;
                    this.performSearch(query);
                }
            });
        });
        
        resultsContainer.querySelectorAll('.recent-search-remove').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(button.dataset.index);
                this.removeFromHistory(index);
            });
        });
        
        resultsContainer.querySelectorAll('.quick-filter').forEach(button => {
            button.addEventListener('click', (e) => {
                const filter = e.currentTarget.dataset.filter;
                this.applyQuickFilter(filter);
            });
        });
    }
    
    showSearchSuggestions(query = '') {
        if (!query.trim()) {
            this.showRecentSearches();
            return;
        }
        
        const resultsContainer = document.getElementById('searchResults');
        if (!resultsContainer) return;
        
        // Get suggestions from all indexes
        const suggestions = this.getSuggestions(query);
        
        if (suggestions.length === 0) {
            resultsContainer.innerHTML = `
                <div class="search-empty">
                    <div class="search-empty-icon">🔍</div>
                    <h4>No results for "${query}"</h4>
                    <p class="search-empty-hint">
                        Try different keywords or check your search filters
                    </p>
                </div>
            `;
            return;
        }
        
        // Group suggestions by type
        const grouped = this.groupSuggestions(suggestions);
        
        resultsContainer.innerHTML = `
            <div class="search-suggestions">
                ${Object.entries(grouped).map(([type, items]) => `
                    <div class="suggestion-section">
                        <div class="section-header">${this.getSectionTitle(type)}</div>
                        <div class="suggestion-items">
                            ${items.map(item => this.renderSuggestionItem(item)).join('')}
                        </div>
                    </div>
                `).join('')}
                
                <div class="search-actions">
                    <button class="search-all-btn" onclick="window.search.performSearch('${query}')">
                        🔍 Search all for "${query}"
                    </button>
                </div>
            </div>
        `;
    }
    
    getSuggestions(query) {
        const normalizedQuery = query.toLowerCase().trim();
        const suggestions = [];
        
        // Search in chats
        this.searchIndex.chats.forEach(chat => {
            if (chat.name.toLowerCase().includes(normalizedQuery) ||
                chat.lastMessage.toLowerCase().includes(normalizedQuery)) {
                suggestions.push({
                    type: 'chat',
                    data: chat,
                    relevance: this.calculateRelevance(chat, normalizedQuery)
                });
            }
        });
        
        // Search in messages
        this.searchIndex.messages.forEach(message => {
            if (message.content.toLowerCase().includes(normalizedQuery)) {
                suggestions.push({
                    type: 'message',
                    data: message,
                    relevance: this.calculateRelevance(message, normalizedQuery)
                });
            }
        });
        
        // Search in contacts
        this.searchIndex.contacts.forEach(contact => {
            if (contact.name.toLowerCase().includes(normalizedQuery) ||
                contact.phone.includes(normalizedQuery)) {
                suggestions.push({
                    type: 'contact',
                    data: contact,
                    relevance: this.calculateRelevance(contact, normalizedQuery)
                });
            }
        });
        
        // Sort by relevance
        return suggestions.sort((a, b) => b.relevance - a.relevance).slice(0, 10);
    }
    
    calculateRelevance(item, query) {
        let relevance = 0;
        const queryWords = query.split(' ');
        
        if (item.name && item.name.toLowerCase().includes(query)) {
            relevance += 100;
        }
        
        if (item.content && item.content.toLowerCase().includes(query)) {
            relevance += 50;
        }
        
        // Exact match bonus
        queryWords.forEach(word => {
            if (item.name && item.name.toLowerCase() === word) {
                relevance += 30;
            }
            if (item.content && item.content.toLowerCase() === word) {
                relevance += 20;
            }
        });
        
        // Recency bonus for messages
        if (item.timestamp) {
            const age = Date.now() - item.timestamp;
            const daysOld = age / (1000 * 60 * 60 * 24);
            if (daysOld < 7) relevance += 20; // Recent items
            if (daysOld < 1) relevance += 30; // Today's items
        }
        
        // Unread bonus
        if (item.unread && item.unread > 0) {
            relevance += 25;
        }
        
        return relevance;
    }
    
    groupSuggestions(suggestions) {
        const groups = {
            chats: [],
            messages: [],
            contacts: [],
            media: [],
            documents: []
        };
        
        suggestions.forEach(suggestion => {
            if (groups[suggestion.type]) {
                groups[suggestion.type].push(suggestion);
            }
        });
        
        // Remove empty groups
        Object.keys(groups).forEach(key => {
            if (groups[key].length === 0) {
                delete groups[key];
            }
        });
        
        return groups;
    }
    
    getSectionTitle(type) {
        const titles = {
            chats: 'Chats',
            messages: 'Messages',
            contacts: 'Contacts',
            media: 'Media',
            documents: 'Documents'
        };
        
        return titles[type] || type;
    }
    
    renderSuggestionItem(suggestion) {
        const { type, data } = suggestion;
        
        switch(type) {
            case 'chat':
                return `
                    <div class="suggestion-item" data-result-id="${data.id}" data-result-type="chat">
                        <div class="suggestion-avatar">${data.avatar}</div>
                        <div class="suggestion-content">
                            <div class="suggestion-title">${data.name}</div>
                            <div class="suggestion-subtitle">${data.lastMessage}</div>
                        </div>
                        ${data.unread > 0 ? `<span class="suggestion-badge">${data.unread}</span>` : ''}
                    </div>
                `;
                
            case 'message':
                const chat = this.searchIndex.chats.find(c => c.id === data.chatId);
                return `
                    <div class="suggestion-item" data-result-id="${data.id}" data-result-type="message">
                        <div class="suggestion-icon">💬</div>
                        <div class="suggestion-content">
                            <div class="suggestion-title">${chat ? chat.name : 'Unknown'}</div>
                            <div class="suggestion-subtitle">${data.content}</div>
                        </div>
                        <div class="suggestion-time">${this.formatTimeAgo(data.timestamp)}</div>
                    </div>
                `;
                
            case 'contact':
                return `
                    <div class="suggestion-item" data-result-id="${data.id}" data-result-type="contact">
                        <div class="suggestion-avatar">👤</div>
                        <div class="suggestion-content">
                            <div class="suggestion-title">${data.name}</div>
                            <div class="suggestion-subtitle">${data.phone}</div>
                        </div>
                    </div>
                `;
                
            default:
                return '';
        }
    }
    
    async performSearch(query) {
        if (!query.trim()) {
            this.showRecentSearches();
            return;
        }
        
        this.isSearching = true;
        console.log('🔍 Performing search:', query);
        
        // Add to search history
        this.addToHistory(query);
        
        // Show loading state
        const resultsContainer = document.getElementById('searchResults');
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="search-loading">
                    <div class="loading-spinner"></div>
                    <div>Searching...</div>
                </div>
            `;
        }
        
        // Simulate search delay
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Perform actual search
        this.currentResults = this.searchAllIndexes(query);
        
        // Apply filters
        this.applyCurrentFilters();
        
        // Display results
        this.displaySearchResults();
        
        this.isSearching = false;
    }
    
    searchAllIndexes(query) {
        const normalizedQuery = query.toLowerCase().trim();
        const results = [];
        
        // Search chats
        this.searchIndex.chats.forEach(chat => {
            const matches = [];
            
            if (chat.name.toLowerCase().includes(normalizedQuery)) {
                matches.push('name');
            }
            
            if (chat.lastMessage.toLowerCase().includes(normalizedQuery)) {
                matches.push('lastMessage');
            }
            
            if (matches.length > 0) {
                results.push({
                    type: 'chat',
                    data: chat,
                    matches,
                    relevance: this.calculateRelevance(chat, normalizedQuery)
                });
            }
        });
        
        // Search messages
        this.searchIndex.messages.forEach(message => {
            if (message.content.toLowerCase().includes(normalizedQuery)) {
                const chat = this.searchIndex.chats.find(c => c.id === message.chatId);
                results.push({
                    type: 'message',
                    data: message,
                    chat: chat,
                    matches: ['content'],
                    relevance: this.calculateRelevance(message, normalizedQuery)
                });
            }
        });
        
        // Search contacts
        this.searchIndex.contacts.forEach(contact => {
            if (contact.name.toLowerCase().includes(normalizedQuery) ||
                contact.phone.includes(normalizedQuery)) {
                results.push({
                    type: 'contact',
                    data: contact,
                    matches: contact.name.toLowerCase().includes(normalizedQuery) ? ['name'] : ['phone'],
                    relevance: this.calculateRelevance(contact, normalizedQuery)
                });
            }
        });
        
        // Sort by relevance
        return results.sort((a, b) => b.relevance - a.relevance);
    }
    
    applyCurrentFilters() {
        if (!this.areFiltersActive()) return;
        
        this.currentResults = this.currentResults.filter(result => {
            // Unread filter
            if (this.searchFilters.unread && result.type === 'chat') {
                return result.data.unread > 0;
            }
            
            // Groups filter
            if (this.searchFilters.groups && result.type === 'chat') {
                return result.data.isGroup;
            }
            
            // Media filter
            if (this.searchFilters.media && result.type === 'message') {
                return result.data.hasMedia;
            }
            
            // Links filter
            if (this.searchFilters.links && result.type === 'message') {
                return result.data.hasLinks;
            }
            
            // Date range filter
            if (this.searchFilters.dateFrom && result.data.timestamp) {
                if (result.data.timestamp < this.searchFilters.dateFrom) {
                    return false;
                }
            }
            
            if (this.searchFilters.dateTo && result.data.timestamp) {
                if (result.data.timestamp > this.searchFilters.dateTo) {
                    return false;
                }
            }
            
            return true;
        });
    }
    
    areFiltersActive() {
        return Object.values(this.searchFilters).some(value => 
            value !== false && value !== null
        );
    }
    
    displaySearchResults() {
        const resultsContainer = document.getElementById('searchResults');
        if (!resultsContainer) return;
        
        if (this.currentResults.length === 0) {
            resultsContainer.innerHTML = `
                <div class="search-empty">
                    <div class="search-empty-icon">🔍</div>
                    <h4>No results found</h4>
                    <p class="search-empty-hint">
                        Try different keywords or adjust your search filters
                    </p>
                    <button class="clear-filters-btn" onclick="window.search.clearFilters()">
                        Clear all filters
                    </button>
                </div>
            `;
            return;
        }
        
        // Group results by type
        const groupedResults = {};
        this.currentResults.forEach(result => {
            if (!groupedResults[result.type]) {
                groupedResults[result.type] = [];
            }
            groupedResults[result.type].push(result);
        });
        
        resultsContainer.innerHTML = `
            <div class="search-results-header">
                <div class="results-count">
                    ${this.currentResults.length} result${this.currentResults.length !== 1 ? 's' : ''}
                    ${this.areFiltersActive() ? ' (filtered)' : ''}
                </div>
                <div class="results-filters">
                    ${this.renderActiveFilters()}
                </div>
            </div>
            
            <div class="search-results-list">
                ${Object.entries(groupedResults).map(([type, items]) => `
                    <div class="results-section">
                        <div class="section-header">${this.getSectionTitle(type)} (${items.length})</div>
                        <div class="results-items">
                            ${items.map(item => this.renderResultItem(item)).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    renderResultItem(result) {
        const { type, data, chat, matches } = result;
        
        switch(type) {
            case 'chat':
                return `
                    <div class="search-result-item" data-result-id="${data.id}" data-result-type="chat">
                        <div class="result-avatar">${data.avatar}</div>
                        <div class="result-content">
                            <div class="result-header">
                                <div class="result-title">${this.highlightMatches(data.name, matches, 'name')}</div>
                                <div class="result-meta">
                                    ${this.formatTimeAgo(data.timestamp)}
                                    ${data.unread > 0 ? `<span class="result-unread">${data.unread}</span>` : ''}
                                </div>
                            </div>
                            <div class="result-preview">
                                ${this.highlightMatches(data.lastMessage, matches, 'lastMessage')}
                            </div>
                            <div class="result-tags">
                                ${data.isGroup ? '<span class="result-tag group">Group</span>' : ''}
                                ${data.isArchived ? '<span class="result-tag archived">Archived</span>' : ''}
                                ${data.isMuted ? '<span class="result-tag muted">Muted</span>' : ''}
                            </div>
                        </div>
                    </div>
                `;
                
            case 'message':
                return `
                    <div class="search-result-item" data-result-id="${data.id}" data-result-type="message">
                        <div class="result-icon">💬</div>
                        <div class="result-content">
                            <div class="result-header">
                                <div class="result-title">${chat ? chat.name : 'Unknown'}</div>
                                <div class="result-meta">
                                    ${this.formatTimeAgo(data.timestamp)}
                                </div>
                            </div>
                            <div class="result-preview">
                                ${this.highlightMatches(data.content, matches, 'content')}
                            </div>
                            <div class="result-context">
                                <span class="result-sender">From: ${data.sender}</span>
                            </div>
                        </div>
                    </div>
                `;
                
            case 'contact':
                return `
                    <div class="search-result-item" data-result-id="${data.id}" data-result-type="contact">
                        <div class="result-avatar">👤</div>
                        <div class="result-content">
                            <div class="result-title">
                                ${this.highlightMatches(data.name, matches, 'name')}
                            </div>
                            <div class="result-subtitle">
                                ${this.highlightMatches(data.phone, matches, 'phone')}
                            </div>
                        </div>
                        <button class="result-action" onclick="window.search.startChat('${data.id}')">
                            Message
                        </button>
                    </div>
                `;
                
            default:
                return '';
        }
    }
    
    highlightMatches(text, matches, field) {
        if (!matches || !matches.includes(field) || !text) {
            return text;
        }
        
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return text;
        
        const query = searchInput.value.toLowerCase();
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        
        return text.replace(regex, '<mark>$1</mark>');
    }
    
    renderActiveFilters() {
        const activeFilters = [];
        
        Object.entries(this.searchFilters).forEach(([key, value]) => {
            if (value !== false && value !== null) {
                let label = '';
                
                switch(key) {
                    case 'unread':
                        label = 'Unread';
                        break;
                    case 'groups':
                        label = 'Groups';
                        break;
                    case 'media':
                        label = 'Media';
                        break;
                    case 'links':
                        label = 'Links';
                        break;
                    case 'dateFrom':
                        label = `From ${new Date(value).toLocaleDateString()}`;
                        break;
                    case 'dateTo':
                        label = `To ${new Date(value).toLocaleDateString()}`;
                        break;
                    default:
                        label = key;
                }
                
                activeFilters.push(`
                    <span class="active-filter" data-filter="${key}">
                        ${label}
                        <button class="remove-filter" onclick="window.search.removeFilter('${key}')">×</button>
                    </span>
                `);
            }
        });
        
        return activeFilters.length > 0 ? activeFilters.join('') : '';
    }
    
    toggleFilter(filter) {
        this.searchFilters[filter] = !this.searchFilters[filter];
        this.updateFilterUI();
        
        if (this.isSearching) {
            this.applyCurrentFilters();
            this.displaySearchResults();
        }
    }
    
    removeFilter(filter) {
        this.searchFilters[filter] = filter.startsWith('date') ? null : false;
        this.updateFilterUI();
        
        if (this.isSearching) {
            this.applyCurrentFilters();
            this.displaySearchResults();
        }
    }
    
    updateFilterUI() {
        document.querySelectorAll('.search-filter').forEach(button => {
            const filter = button.dataset.filter;
            button.classList.toggle('active', this.searchFilters[filter]);
        });
    }
    
    applyQuickFilter(filter) {
        switch(filter) {
            case 'unread':
                this.searchFilters.unread = true;
                break;
            case 'media':
                this.searchFilters.media = true;
                break;
            case 'links':
                this.searchFilters.links = true;
                break;
            case 'documents':
                this.searchFilters.documents = true;
                break;
        }
        
        this.updateFilterUI();
        const searchInput = document.getElementById('searchInput');
        if (searchInput.value.trim()) {
            this.performSearch(searchInput.value);
        }
    }
    
    clearFilters() {
        Object.keys(this.searchFilters).forEach(key => {
            this.searchFilters[key] = key.startsWith('date') ? null : false;
        });
        
        this.updateFilterUI();
        
        if (this.isSearching) {
            this.applyCurrentFilters();
            this.displaySearchResults();
        }
    }
    
    handleResultClick(resultId, resultType) {
        console.log('Result clicked:', resultId, resultType);
        
        switch(resultType) {
            case 'chat':
                if (window.app) {
                    window.app.openChat(resultId);
                }
                break;
                
            case 'message':
                // Find the chat for this message
                const result = this.currentResults.find(r => r.data.id === resultId);
                if (result && result.chat && window.app) {
                    window.app.openChat(result.chat.id);
                }
                break;
                
            case 'contact':
                this.startChat(resultId);
                break;
        }
        
        this.closeSearch();
    }
    
    startChat(contactId) {
        const contact = this.searchIndex.contacts.find(c => c.id === contactId);
        if (contact && window.app) {
            window.app.createNewChatWithContact(contact);
            this.closeSearch();
        }
    }
    
    addToHistory(query) {
        const existingIndex = this.searchHistory.findIndex(item => 
            item.query.toLowerCase() === query.toLowerCase()
        );
        
        if (existingIndex !== -1) {
            this.searchHistory.splice(existingIndex, 1);
        }
        
        this.searchHistory.push({
            query,
            timestamp: Date.now()
        });
        
        this.saveSearchHistory();
    }
    
    removeFromHistory(index) {
        this.searchHistory.splice(index, 1);
        this.saveSearchHistory();
        this.showRecentSearches();
    }
    
    clearHistory() {
        if (confirm('Clear all search history?')) {
            this.searchHistory = [];
            this.saveSearchHistory();
            this.showRecentSearches();
        }
    }
    
    clearSearch() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
        }
        
        const searchClear = document.querySelector('.search-clear');
        if (searchClear) {
            searchClear.hidden = true;
        }
        
        this.showRecentSearches();
    }
    
    closeSearch() {
        if (window.app) {
            window.app.state.isSearching = false;
            window.app.toggleSearch();
        }
    }
    
    formatTimeAgo(timestamp) {
        if (!timestamp) return '';
        
        const now = Date.now();
        const diff = now - timestamp;
        
        if (diff < 60000) { // Less than 1 minute
            return 'Just now';
        } else if (diff < 3600000) { // Less than 1 hour
            const minutes = Math.floor(diff / 60000);
            return `${minutes}m ago`;
        } else if (diff < 86400000) { // Less than 1 day
            const hours = Math.floor(diff / 3600000);
            return `${hours}h ago`;
        } else if (diff < 604800000) { // Less than 1 week
            const days = Math.floor(diff / 86400000);
            return `${days}d ago`;
        } else {
            return new Date(timestamp).toLocaleDateString();
        }
    }
}

// === INITIALIZE SEARCH ===
document.addEventListener('DOMContentLoaded', () => {
    // Initialize search system
    window.search = new WhatsAppSearch();
    
    // Add CSS for search
    const searchStyles = document.createElement('style');
    searchStyles.textContent = `
        /* Search Results Styles */
        .search-results {
            flex: 1;
            overflow-y: auto;
            padding: var(--wa-space-md);
        }
        
        .search-empty {
            text-align: center;
            padding: var(--wa-space-xxl) var(--wa-space-lg);
            color: var(--wa-text-secondary);
        }
        
        .search-empty-icon {
            font-size: 48px;
            margin-bottom: var(--wa-space-md);
            opacity: 0.5;
        }
        
        .search-empty-hint {
            font-size: var(--wa-font-size-sm);
            color: var(--wa-text-tertiary);
            margin-top: var(--wa-space-xs);
        }
        
        .search-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: var(--wa-space-xxl);
            color: var(--wa-text-secondary);
        }
        
        .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--wa-border);
            border-top-color: var(--wa-primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: var(--wa-space-md);
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        /* Search Sections */
        .search-section {
            margin-bottom: var(--wa-space-xl);
        }
        
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: var(--wa-space-sm) 0;
            color: var(--wa-text-secondary);
            font-size: var(--wa-font-size-sm);
            font-weight: var(--wa-font-weight-medium);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1px solid var(--wa-border);
            margin-bottom: var(--wa-space-sm);
        }
        
        .clear-history {
            background: none;
            border: none;
            color: var(--wa-primary);
            font-size: var(--wa-font-size-xs);
            cursor: pointer;
        }
        
        /* Recent Searches */
        .recent-searches {
            display: flex;
            flex-direction: column;
            gap: var(--wa-space-xs);
        }
        
        .recent-search-item {
            display: flex;
            align-items: center;
            gap: var(--wa-space-md);
            padding: var(--wa-space-sm);
            border-radius: var(--wa-radius-md);
            cursor: pointer;
            transition: background-color var(--wa-transition-fast);
        }
        
        .recent-search-item:hover {
            background: var(--wa-border-light);
        }
        
        .recent-search-icon {
            font-size: 16px;
            opacity: 0.7;
        }
        
        .recent-search-query {
            flex: 1;
            color: var(--wa-text-primary);
        }
        
        .recent-search-time {
            font-size: var(--wa-font-size-xs);
            color: var(--wa-text-tertiary);
        }
        
        .recent-search-remove {
            background: none;
            border: none;
            color: var(--wa-text-tertiary);
            font-size: 18px;
            cursor: pointer;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
        }
        
        .recent-search-remove:hover {
            background: var(--wa-border);
            color: var(--wa-text-secondary);
        }
        
        /* Quick Filters */
        .quick-filters {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: var(--wa-space-sm);
        }
        
        .quick-filter {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: var(--wa-space-xs);
            padding: var(--wa-space-md);
            background: var(--wa-surface-secondary);
            border: 1px solid var(--wa-border);
            border-radius: var(--wa-radius-md);
            cursor: pointer;
            transition: all var(--wa-transition-fast);
        }
        
        .quick-filter:hover {
            background: var(--wa-border-light);
            transform: translateY(-2px);
        }
        
        .filter-icon {
            font-size: 24px;
            margin-bottom: var(--wa-space-xs);
        }
        
        /* Search Suggestions */
        .search-suggestions {
            display: flex;
            flex-direction: column;
            gap: var(--wa-space-xl);
        }
        
        .suggestion-section {
            margin-bottom: var(--wa-space-lg);
        }
        
        .suggestion-items {
            display: flex;
            flex-direction: column;
            gap: var(--wa-space-xs);
        }
        
        .suggestion-item {
            display: flex;
            align-items: center;
            gap: var(--wa-space-md);
            padding: var(--wa-space-sm);
            border-radius: var(--wa-radius-md);
            cursor: pointer;
            transition: background-color var(--wa-transition-fast);
        }
        
        .suggestion-item:hover {
            background: var(--wa-border-light);
        }
        
        .suggestion-avatar, .suggestion-icon {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: var(--wa-surface-secondary);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            flex-shrink: 0;
        }
        
        .suggestion-content {
            flex: 1;
            min-width: 0;
        }
        
        .suggestion-title {
            font-size: var(--wa-font-size-md);
            font-weight: var(--wa-font-weight-medium);
            color: var(--wa-text-primary);
            margin-bottom: 2px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .suggestion-subtitle {
            font-size: var(--wa-font-size-sm);
            color: var(--wa-text-secondary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .suggestion-time {
            font-size: var(--wa-font-size-xs);
            color: var(--wa-text-tertiary);
            white-space: nowrap;
        }
        
        .suggestion-badge {
            background: var(--wa-accent-green);
            color: white;
            font-size: var(--wa-font-size-xs);
            padding: 2px 6px;
            border-radius: var(--wa-radius-full);
            font-weight: var(--wa-font-weight-bold);
        }
        
        .search-actions {
            margin-top: var(--wa-space-xl);
            text-align: center;
        }
        
        .search-all-btn {
            background: var(--wa-primary);
            color: white;
            border: none;
            padding: var(--wa-space-md) var(--wa-space-xl);
            border-radius: var(--wa-radius-lg);
            font-weight: var(--wa-font-weight-medium);
            cursor: pointer;
            transition: background-color var(--wa-transition-fast);
        }
        
        .search-all-btn:hover {
            background: var(--wa-primary-dark);
        }
        
        /* Search Results */
        .search-results-header {
            margin-bottom: var(--wa-space-lg);
            padding-bottom: var(--wa-space-md);
            border-bottom: 1px solid var(--wa-border);
        }
        
        .results-count {
            font-size: var(--wa-font-size-md);
            font-weight: var(--wa-font-weight-medium);
            color: var(--wa-text-primary);
            margin-bottom: var(--wa-space-sm);
        }
        
        .results-filters {
            display: flex;
            flex-wrap: wrap;
            gap: var(--wa-space-xs);
        }
        
        .active-filter {
            display: inline-flex;
            align-items: center;
            gap: var(--wa-space-xs);
            background: var(--wa-surface-secondary);
            border: 1px solid var(--wa-border);
            border-radius: var(--wa-radius-full);
            padding: 4px 12px;
            font-size: var(--wa-font-size-sm);
            color: var(--wa-text-secondary);
        }
        
        .remove-filter {
            background: none;
            border: none;
            color: var(--wa-text-tertiary);
            font-size: 16px;
            cursor: pointer;
            padding: 0;
            width: 16px;
            height: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .remove-filter:hover {
            color: var(--wa-text-secondary);
        }
        
        .results-section {
            margin-bottom: var(--wa-space-xl);
        }
        
        .results-items {
            display: flex;
            flex-direction: column;
            gap: var(--wa-space-sm);
        }
        
        .search-result-item {
            display: flex;
            align-items: center;
            gap: var(--wa-space-md);
            padding: var(--wa-space-md);
            border-radius: var(--wa-radius-md);
            cursor: pointer;
            transition: all var(--wa-transition-fast);
            border: 1px solid transparent;
        }
        
        .search-result-item:hover {
            background: var(--wa-border-light);
            border-color: var(--wa-border);
        }
        
        .result-avatar, .result-icon {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: var(--wa-surface-secondary);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            flex-shrink: 0;
        }
        
        .result-icon {
            background: var(--wa-primary-light);
            color: white;
        }
        
        .result-content {
            flex: 1;
            min-width: 0;
        }
        
        .result-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: var(--wa-space-xs);
        }
        
        .result-title {
            font-size: var(--wa-font-size-md);
            font-weight: var(--wa-font-weight-medium);
            color: var(--wa-text-primary);
        }
        
        .result-meta {
            display: flex;
            align-items: center;
            gap: var(--wa-space-xs);
            font-size: var(--wa-font-size-xs);
            color: var(--wa-text-tertiary);
            white-space: nowrap;
        }
        
        .result-unread {
            background: var(--wa-accent-green);
            color: white;
            font-size: 10px;
            padding: 2px 6px;
            border-radius: var(--wa-radius-full);
            font-weight: var(--wa-font-weight-bold);
        }
        
        .result-preview {
            font-size: var(--wa-font-size-sm);
            color: var(--wa-text-secondary);
            margin-bottom: var(--wa-space-xs);
            line-height: 1.4;
        }
        
        .result-preview mark {
            background: rgba(255, 235, 59, 0.3);
            color: inherit;
            padding: 1px 3px;
            border-radius: 2px;
        }
        
        .result-tags {
            display: flex;
            gap: var(--wa-space-xs);
            flex-wrap: wrap;
        }
        
        .result-tag {
            font-size: var(--wa-font-size-xs);
            padding: 2px 6px;
            border-radius: var(--wa-radius-sm);
            font-weight: var(--wa-font-weight-medium);
        }
        
        .result-tag.group {
            background: rgba(37, 211, 102, 0.1);
            color: var(--wa-accent-green);
        }
        
        .result-tag.archived {
            background: rgba(158, 158, 158, 0.1);
            color: var(--wa-text-tertiary);
        }
        
        .result-tag.muted {
            background: rgba(244, 67, 54, 0.1);
            color: var(--wa-accent-red);
        }
        
        .result-context {
            font-size: var(--wa-font-size-xs);
            color: var(--wa-text-tertiary);
            display: flex;
            align-items: center;
            gap: var(--wa-space-xs);
        }
        
        .result-sender {
            font-style: italic;
        }
        
        .result-subtitle {
            font-size: var(--wa-font-size-sm);
            color: var(--wa-text-secondary);
            margin-top: 2px;
        }
        
        .result-action {
            background: var(--wa-primary);
            color: white;
            border: none;
            padding: var(--wa-space-xs) var(--wa-space-md);
            border-radius: var(--wa-radius-md);
            font-size: var(--wa-font-size-sm);
            font-weight: var(--wa-font-weight-medium);
            cursor: pointer;
            transition: background-color var(--wa-transition-fast);
            flex-shrink: 0;
        }
        
        .result-action:hover {
            background: var(--wa-primary-dark);
        }
        
        .clear-filters-btn {
            background: var(--wa-surface-secondary);
            color: var(--wa-text-secondary);
            border: 1px solid var(--wa-border);
            padding: var(--wa-space-sm) var(--wa-space-lg);
            border-radius: var(--wa-radius-md);
            font-size: var(--wa-font-size-sm);
            cursor: pointer;
            margin-top: var(--wa-space-md);
            transition: all var(--wa-transition-fast);
        }
        
        .clear-filters-btn:hover {
            background: var(--wa-border-light);
            color: var(--wa-text-primary);
        }
        
        /* Dark mode adjustments */
        @media (prefers-color-scheme: dark) {
            .quick-filter, .search-result-item, .recent-search-item, .suggestion-item {
                background: var(--wa-surface-secondary);
            }
            
            .quick-filter:hover, .search-result-item:hover, .recent-search-item:hover, .suggestion-item:hover {
                background: var(--wa-border);
            }
            
            .result-preview mark {
                background: rgba(255, 235, 59, 0.2);
            }
        }
    `;
    document.head.appendChild(searchStyles);
    
    console.log('🔍 WhatsApp Search initialized');
});
