// room.js - JavaScript untuk aplikasi Room

// ===== 1. ANIMASI LOADING =====
const text = "READTalk to Talk with Trust";
const typewriterEl = document.getElementById('typewriter');
let i = 0;
function typeWriter() {
    if (i < text.length) {
        typewriterEl.innerHTML += text.charAt(i);
        i++;
        setTimeout(typeWriter, 120);
    }
}

// Mulai typewriter setelah delay
setTimeout(() => { typeWriter(); }, 1500);

// Transisi dari loading ke aplikasi utama
setTimeout(() => {
    const loadingEl = document.getElementById('loading');
    loadingEl.classList.add('fade-out');
    
    setTimeout(() => {
        document.getElementById('mainApp').style.display = 'flex';
        loadingEl.remove();
    }, 800);
}, 5000);

// ===== 2. LOGIKA APLIKASI ROOM (WhatsApp UI) =====
// ... (SALIN SELURUH KODE JAVASCRIPT DARI FILE ASLI DI SINI)
// Mulai dari "// ===== DATA STRUCTURE =====" hingga akhir file
