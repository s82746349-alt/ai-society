// Персонажи
let characters = [
    { id: 'zero', name: 'Zero', color: '#ff4444', prompt: 'Ты Zero — дерзкий гений-стратег. Говори коротко, уверенно. Предлагай идеи. Спорь если не согласен.', active: true },
    { id: 'nova', name: 'Nova', color: '#44ff44', prompt: 'Ты Nova — творческая, мечтательная. Придумывай красивые концепции. Поддерживай идеи других.', active: true },
    { id: 'atlas', name: 'Atlas', color: '#4488ff', prompt: 'Ты Atlas — логик и аналитик. Проверяй факты. Находи слабые места в аргументах.', active: true },
    { id: 'vega', name: 'Vega', color: '#ff88cc', prompt: 'Ты Vega — эмпатичная, добрая. Следи чтобы общение было уважительным. Поддерживай.', active: true },
    { id: 'axel', name: 'Axel', color: '#ffaa44', prompt: 'Ты Axel — циник-реалист. Находи проблемы. Будь скептиком. Но не токсичным.', active: true },
];

let GROQ_KEY = localStorage.getItem('ai_society_key') || '';
let running = false;
let conversationTimer = null;
let topic = '';

// Загрузка настроек
try {
    const saved = localStorage.getItem('ai_society_chars');
    if (saved) characters = JSON.parse(saved);
} catch(e) {}

if (GROQ_KEY) document.getElementById('apiKey').value = GROQ_KEY;

function renderCharacters() {
    const div = document.getElementById('characters');
    div.innerHTML = characters.map((c, i) => `
        <div class="char-row">
            <input value="${c.name}" onchange="updateChar(${i},'name',this.value)" style="width:80px">
            <input value="${c.prompt}" onchange="updateChar(${i},'prompt',this.value)" style="flex:1">
            <button onclick="removeChar(${i})">✕</button>
        </div>
    `).join('');
}

function updateChar(i, key, value) {
    characters[i][key] = value;
    saveAll();
}

function removeChar(i) {
    characters.splice(i, 1);
    saveAll();
    renderCharacters();
}

function addCharacter() {
    characters.push({
        id: 'char' + Date.now(),
        name: 'Новый',
        color: '#' + Math.floor(Math.random()*16777215).toString(16),
        prompt: 'Ты новый персонаж.',
        active: true
    });
    saveAll();
    renderCharacters();
}

function saveAll() {
    localStorage.setItem('ai_society_chars', JSON.stringify(characters));
}

function saveSettings() {
    GROQ_KEY = document.getElementById('apiKey').value;
    localStorage.setItem('ai_society_key', GROQ_KEY);
    toggleSettings();
}

function toggleSettings() {
    const s = document.getElementById('settings');
    s.style.display = s.style.display === 'none' ? 'block' : 'none';
    if (s.style.display === 'block') renderCharacters();
}

function addMessage(char, text) {
    const chat = document.getElementById('chat');
    const div = document.createElement('div');
    div.className = `msg ${char === 'user' ? 'user' : characters.find(c => c.name === char)?.id || ''}`;
    if (char !== 'user') {
        div.innerHTML = `<div class="name" style="color:${characters.find(c => c.name === char)?.color || '#fff'}">${char}</div>${text}`;
    } else {
        div.innerHTML = text;
    }
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
}

async function callGroq(prompt, history = []) {
    if (!GROQ_KEY) {
        addMessage('Система', '⚠️ Введи API ключ в настройках');
        return '';
    }
    
    const msgs = [
        { role: 'system', content: prompt + ' Отвечай на русском. Максимум 2-3 предложения. Не используй markdown.' },
        ...history.slice(-4),
        { role: 'user', content: topic || 'Придумай тему для обсуждения.' }
    ];
    
    try {
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: msgs,
                temperature: 0.8,
                max_tokens: 150
            })
        });
        
        if (r.status === 200) {
            const data = await r.json();
            return data.choices[0].message.content;
        }
        return '';
    } catch(e) {
        return '';
    }
}

async function runConversation() {
    if (!running) return;
    
    const active = characters.filter(c => c.active);
    if (active.length === 0) return;
    
    const speaker = active[Math.floor(Math.random() * active.length)];
    const history = [];
    
    const reply = await callGroq(speaker.prompt, history);
    if (reply) {
        addMessage(speaker.name, reply);
        history.push({ role: 'assistant', content: `${speaker.name}: ${reply}` });
    }
    
    conversationTimer = setTimeout(runConversation, 2000 + Math.random() * 3000);
}

function startConversation() {
    if (!GROQ_KEY) {
        addMessage('Система', '⚠️ Введи API ключ в настройках (шестерёнка)');
        return;
    }
    if (!running) {
        running = true;
        topic = 'Обсудите что угодно. Будьте интересными.';
        addMessage('Система', '▶ Разговор начался');
        runConversation();
    }
}

function stopConversation() {
    running = false;
    clearTimeout(conversationTimer);
    addMessage('Система', '⏸ Пауза');
}

function clearChat() {
    document.getElementById('chat').innerHTML = '';
    addMessage('Система', '💬 Чат очищен');
}

async function sendMessage() {
    const input = document.getElementById('userInput');
    const text = input.value.trim();
    if (!text) return;
    
    addMessage('user', text);
    input.value = '';
    topic = text;
    
    // Ответ от случайного персонажа
    const active = characters.filter(c => c.active);
    if (active.length > 0 && GROQ_KEY) {
        const speaker = active[Math.floor(Math.random() * active.length)];
        const reply = await callGroq(speaker.prompt, []);
        if (reply) addMessage(speaker.name, reply);
    }
}

// Установка PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    });
}

// Кнопка установки
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.installPrompt = e;
});

// Сохранение при закрытии
window.addEventListener('beforeunload', saveAll);
