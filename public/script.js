// ===== DATA STRUCTURE (SAMA DENGAN chat.html) =====
function emailToUser(email){
    const [name] = email.split('@');
    const displayName = name.split('.').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
    return { name: displayName, username: '@' + name, email: email };
}

const userEmail = localStorage.getItem('userEmail') || 'john.doe@example.com';
const user = emailToUser(userEmail);

document.getElementById('userAvatar').textContent = user.name.split(' ').map(n => n[0]).join('').substring(0, 2);
document.getElementById('userName').textContent = user.name;
document.getElementById('userUsername').textContent = user.username;

let rooms = [
    {
        id: 'self',
        name: user.name,
        username: user.username,
        avatar: '',
        last: 'Catatan pribadi 😊',
        time: 'Hari ini',
        unread: 0,
        online: true,
        archived: false,
        muted: false
    },
    {
        id: 'user_1',
        name: 'Red Business',
        username: '@red_biz',
        avatar: '',
        last: 'Hanya RED yang bisa mengirim pesan',
        time: 'Kemarin',
        unread: 0,
        online: true,
        archived: false,
        muted: true
    },
    {
        id: 'user_2',
        name: 'Bapak Qu',
        username: '@bapakqu',
        avatar: '',
        last: 'Telepon tak terjawab 😅',
        time: '11/12',
        unread: 2,
        online: false,
        archived: false,
        muted: false
    },
    {
        id: 'user_3',
        name: 'Cikal',
        username: '@cikal',
        avatar: '',
        last: 'Foto dikirim 📸',
        time: '09/12',
        unread: 0,
        online: true,
        archived: true,
        muted: false
    },
    {
        id: 'user_4',
        name: 'Support Team',
        username: '@support',
        avatar: '',
        last: 'Terima kasih telah menghubungi kami',
        time: '08/12',
        unread: 1,
        online: false,
        archived: false,
        muted: false
    },
    {
        id: 'user_5',
        name: 'Development',
        username: '@dev',
        avatar: '',
        last: 'Meeting jam 14.00 WIB',
        time: '07/12',
        unread: 0,
        online: false,
        archived: false,
        muted: true
    }
];

function sortRooms() {
    const timeOrder = { 'Hari ini': 0, 'Kemarin': 1 };
    return rooms.sort((a, b) => {
        if (a.unread > 0 && b.unread === 0) return -1;
        if (a.unread === 0 && b.unread > 0) return 1;
        
        const timeA = timeOrder[a.time] !== undefined ? timeOrder[a.time] : 100;
        const timeB = timeOrder[b.time] !== undefined ? timeOrder[b.time] : 100;
        
        if (timeA !== timeB) return timeA - timeB;
        
        return a.name.localeCompare(b.name);
    });
}

const roomList = document.getElementById('roomList');
const roomListContainer = document.getElementById('roomListContainer');
const emptyState = document.getElementById('emptyState');
const archivedHeader = document.getElementById('archivedHeader');
const searchInput = document.getElementById('searchInput');

function renderRooms(filter = '') {
    const filteredRooms = rooms.filter(room => 
        room.name.toLowerCase().includes(filter.toLowerCase()) ||
        room.username.toLowerCase().includes(filter.toLowerCase()) ||
        room.last.toLowerCase().includes(filter.toLowerCase())
    );
    
    const activeRooms = filteredRooms.filter(room => !room.archived);
    const archivedRooms = filteredRooms.filter(room => room.archived);
    
    roomList.innerHTML = '';
    
    if (filteredRooms.length === 0) {
        emptyState.style.display = 'flex';
        archivedHeader.style.display = 'none';
        return;
    } else {
        emptyState.style.display = 'none';
    }
    
    activeRooms.forEach(room => {
        const li = createRoomElement(room);
        roomList.appendChild(li);
    });
    
    if (archivedRooms.length > 0) {
        archivedHeader.style.display = 'block';
        archivedRooms.forEach(room => {
            const li = createRoomElement(room);
            roomList.appendChild(li);
        });
    } else {
        archivedHeader.style.display = 'none';
    }
}

function createRoomElement(room) {
    const li = document.createElement('li');
    li.className = 'room' + (room.unread > 0 ? ' unread' : '');
    
    const avatarText = room.avatar || room.name.split(' ').map(n => n[0]).join('').substring(0, 2);
    
    const timeText = formatTime(room.time);
    
    li.innerHTML = `
        <div class="avatar">
            ${avatarText}
            ${room.online ? '<div class="online-indicator"></div>' : ''}
        </div>
        <div class="room-content">
            <div class="room-top">
                <div class="room-name">
                    ${room.name} 
                    <span style="font-weight:400;color:var(--whatsapp-text-secondary);">${room.username}</span>
                    ${room.muted ? ' <span style="font-size:12px;color:#888;">🔇</span>' : ''}
                </div>
                <div class="room-time">${timeText}</div>
            </div>
            <div class="room-preview">
                ${room.last}
            </div>
        </div>
        ${room.unread > 0 ? `<div class="badge">${room.unread}</div>` : ''}
        <div class="options" onclick="toggleDropdown(event, '${room.id}')">⋮</div>
        <div class="dropdown" id="dropdown-${room.id}">
            <button onclick="viewProfile(event, '${room.id}')">
                <span>👤</span> View Profile
            </button>
            <button onclick="toggleMute(event, '${room.id}')">
                <span>${room.muted ? '🔊' : '🔇'}</span> ${room.muted ? 'Unmute' : 'Mute'}
            </button>
            <button onclick="archiveChat(event, '${room.id}')">
                <span>${room.archived ? '📂' : '📁'}</span> ${room.archived ? 'Unarchive' : 'Archive'}
            </button>
            <button onclick="deleteChat(event, '${room.id}')" style="color:#e53935;">
                <span>🗑️</span> Delete Chat
            </button>
        </div>
    `;
    
    li.addEventListener('click', (e) => {
        if (!e.target.closest('.options') && !e.target.closest('.dropdown')) {
            window.location.href = 'room.html?room=' + room.id;
        }
    });
    
    return li;
}

function formatTime(timeStr) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (timeStr === 'Hari ini') {
        return today.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } else if (timeStr === 'Kemarin') {
        return 'Kemarin';
    } else if (timeStr.includes('/')) {
        return timeStr;
    }
    return timeStr;
}

rooms = sortRooms();
renderRooms();

searchInput.addEventListener('input', (e) => {
    renderRooms(e.target.value);
});

searchInput.addEventListener('focus', () => {
    searchInput.parentElement.style.boxShadow = '0 0 0 2px rgba(229, 57, 53, 0.1)';
});

searchInput.addEventListener('blur', () => {
    searchInput.parentElement.style.boxShadow = 'none';
});

function toggleDropdown(event, roomId) {
    event.stopPropagation();
    
    document.querySelectorAll('.dropdown').forEach(dropdown => {
        if (dropdown.id !== `dropdown-${roomId}`) {
            dropdown.style.display = 'none';
        }
    });
    
    const dropdown = document.getElementById(`dropdown-${roomId}`);
    dropdown.style.display = dropdown.style.display === 'flex' ? 'none' : 'flex';
    
    const rect = dropdown.getBoundingClientRect();
    if (rect.bottom > window.innerHeight) {
        dropdown.style.top = `${rect.top - dropdown.offsetHeight - 10}px`;
    }
}

document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown').forEach(dropdown => {
        dropdown.style.display = 'none';
    });
});

function viewProfile(event, roomId) {
    event.stopPropagation();
    const room = rooms.find(r => r.id === roomId);
    alert(`Profile: ${room.name}\nUsername: ${room.username}\nStatus: ${room.online ? 'Online' : 'Offline'}`);
    document.getElementById(`dropdown-${roomId}`).style.display = 'none';
}

function toggleMute(event, roomId) {
    event.stopPropagation();
    const room = rooms.find(r => r.id === roomId);
    room.muted = !room.muted;
    alert(`${room.name} ${room.muted ? 'dimute' : 'tidak dimute'}`);
    renderRooms(searchInput.value);
    document.getElementById(`dropdown-${roomId}`).style.display = 'none';
}

function archiveChat(event, roomId) {
    event.stopPropagation();
    const room = rooms.find(r => r.id === roomId);
    room.archived = !room.archived;
    alert(`Chat ${room.name} ${room.archived ? 'diarsipkan' : 'dipindahkan dari arsip'}`);
    rooms = sortRooms();
    renderRooms(searchInput.value);
    document.getElementById(`dropdown-${roomId}`).style.display = 'none';
}

function deleteChat(event, roomId) {
    event.stopPropagation();
    if (confirm('Hapus percakapan ini? Pesan akan dihapus dari perangkat ini.')) {
        rooms = rooms.filter(r => r.id !== roomId);
        renderRooms(searchInput.value);
    }
    document.getElementById(`dropdown-${roomId}`).style.display = 'none';
}

function openCamera() {
    alert('Kamera (dalam pengembangan)');
}

function openNewChat() {
    const newContact = prompt('Masukkan nama atau username kontak baru:');
    if (newContact && newContact.trim()) {
        const newId = 'new_' + Date.now();
        rooms.unshift({
            id: newId,
            name: newContact,
            username: '@new',
            avatar: '',
            last: 'Mulai percakapan baru',
            time: 'Hari ini',
            unread: 0,
            online: true,
            archived: false,
            muted: false
        });
        rooms = sortRooms();
        renderRooms(searchInput.value);
        alert(`Chat baru dengan ${newContact} dibuat`);
    }
}

function openSettings() {
    alert('Pengaturan (dalam pengembangan)');
}

function createNewChat() {
    openNewChat();
}

document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
    }
    
    if (e.key === 'Escape' && document.activeElement === searchInput) {
        searchInput.value = '';
        renderRooms('');
    }
});

setInterval(() => {
    rooms.forEach(room => {
        if (room.id !== 'self' && Math.random() > 0.7) {
            room.online = !room.online;
        }
    });
    
    document.querySelectorAll('.room').forEach((roomEl, index) => {
        const room = rooms[index];
        if (room) {
            const onlineIndicator = roomEl.querySelector('.online-indicator');
            if (onlineIndicator) {
                onlineIndicator.style.display = room.online ? 'block' : 'none';
            }
        }
    });
}, 30000);

window.toggleDropdown = toggleDropdown;
window.viewProfile = viewProfile;
window.toggleMute = toggleMute;
window.archiveChat = archiveChat;
window.deleteChat = deleteChat;
window.openCamera = openCamera;
window.openNewChat = openNewChat;
window.openSettings = openSettings;
window.createNewChat = createNewChat;
