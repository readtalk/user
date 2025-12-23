// === PLATFORM DETECTION ===
// ... (tetap sama)

class WAHeader extends HTMLElement {
    // ... constructor & render tetap
    render() {
        const isDesktop = PlatformDetector.isDesktop();
        
        this.shadowRoot.innerHTML = `
            <style>
                :host { display: block; background: #c0392b; color: white; }
                .header { padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; font-size: 19px; font-weight: 600; }
                .tabs { display: flex; gap: 32px; }
                .tab { opacity: 0.7; transition: opacity 0.2s; cursor: pointer; }
                .tab.active { opacity: 1; font-weight: 600; }
                .actions { display: flex; gap: 20px; font-size: 22px; }
                .action-btn { cursor: pointer; opacity: 0.8; transition: opacity 0.2s; }
                .action-btn:hover { opacity: 1; }
            </style>
            <div class="header">
                <div class="title">WhatsApp</div>
                <div class="tabs">
                    <div class="tab active" data-tab="chats">CHATS</div>
                    <div class="tab" data-tab="status">STATUS</div>
                    <div class="tab" data-tab="calls">CALLS</div>
                </div>
                <div class="actions">
                    🔍 ${isDesktop ? `💬 ⋮` : `📷 🔍 ⋮`}
                </div>
            </div>
        `;
        // ... setupEventListeners tetap
    }
}

// WAChatList (CSS diperbaharui mirip WhatsApp)
class WAChatList extends HTMLElement {
    // ... loadChats tetap
    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host { display: block; flex: 1; overflow-y: auto; }
                .chat-item { display: flex; padding: 12px 16px; border-bottom: 1px solid #f0f0f0; cursor: pointer; transition: background 0.2s; }
                .chat-item:hover { background: #f5f5f5; }
                .avatar { width: 49px; height: 49px; border-radius: 50%; background: #ddd; margin-right: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; position: relative; }
                .online-indicator { position: absolute; bottom: 0; right: 0; width: 14px; height: 14px; background: #00ff00; border: 3px solid #efeae2; border-radius: 50%; }
                .info { flex: 1; min-width: 0; }
                .name { font-size: 17px; font-weight: 500; color: #111; display: flex; align-items: center; gap: 6px; }
                .muted { opacity: 0.6; font-size: 14px; }
                .last-message { font-size: 14px; color: #666; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .meta { display: flex; flex-direction: column; align-items: flex-end; font-size: 12px; color: #999; }
                .time { margin-bottom: 4px; }
                .unread { background: #c0392b; color: white; min-width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; }
                .empty { text-align: center; padding: 80px 20px; color: #667781; }
            </style>
            <div id="chatList"></div>
        `;
    }
    // renderChats & handleChatClick tetap
}

// Komponen lain (WABottomNav, WASidebar, WAFab) CSS diperbaharui mirip
class WABottomNav extends HTMLElement {
    // ... 
    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host { display: block; background: #c0392b; }
                .nav { display: flex; justify-content: space-around; padding: 8px 0; }
                .nav-item { color: rgba(255,255,255,0.7); text-align: center; font-size: 10px; cursor: pointer; }
                .nav-item.active { color: white; }
                .icon { font-size: 24px; display: block; }
            </style>
            <div class="nav">
                <div class="nav-item active"><span class="icon">💬</span>Chats</div>
                <div class="nav-item"><span class="icon">🟢</span>Status</div>
                <div class="nav-item"><span class="icon">📞</span>Calls</div>
            </div>
        `;
        // ... setup tetap
    }
}

class WAFab extends HTMLElement {
    render() {
        this.shadowRoot.innerHTML = `
            <style>
                .fab { position: fixed; bottom: 20px; right: 20px; width: 56px; height: 56px; background: #c0392b; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 30px; box-shadow: 0 4px 12px rgba(192,57,43,0.5); cursor: pointer; z-index: 10; }
            </style>
            <div class="fab">+</div>
        `;
        // ... event tetap
    }
}

// Register tetap sama
