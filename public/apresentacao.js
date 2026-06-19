// ========================================
// Lista de Compras - Script de Apresentação
// ========================================

// Configuração do canvas de partículas
const canvas = document.getElementById('particles-canvas');
const ctx = canvas.getContext('2d');

// Ajustar tamanho do canvas
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Classe Partícula
class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 3 + 1;
        this.speedX = Math.random() * 0.5 - 0.25;
        this.speedY = Math.random() * 0.5 - 0.25;
        this.opacity = Math.random() * 0.5 + 0.2;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;

        // Voltar para o outro lado quando sair da tela
        if (this.x > canvas.width) this.x = 0;
        if (this.x < 0) this.x = canvas.width;
        if (this.y > canvas.height) this.y = 0;
        if (this.y < 0) this.y = canvas.height;
    }

    draw() {
        ctx.fillStyle = `rgba(78, 205, 196, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Criar partículas
const particlesArray = [];
const numberOfParticles = 80;

for (let i = 0; i < numberOfParticles; i++) {
    particlesArray.push(new Particle());
}

// Animar partículas
function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update();
        particlesArray[i].draw();
    }
    
    requestAnimationFrame(animateParticles);
}

animateParticles();

// ========================================
// Efeito de brilho ao passar o mouse sobre o logo
// ========================================
const logo = document.getElementById('logo');
const logoContainer = document.querySelector('.logo-container');

logo.addEventListener('mouseenter', () => {
    logoContainer.style.transform = 'scale(1.1) rotate(5deg)';
});

logo.addEventListener('mouseleave', () => {
    logoContainer.style.transform = 'scale(1) rotate(0deg)';
});

logoContainer.style.transition = 'transform 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)';

// ========================================
// Criar efeito de brilho ao clicar no logo
// ========================================
logo.addEventListener('click', () => {
    createSparkles(logoContainer);
});

function createSparkles(element) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    for (let i = 0; i < 12; i++) {
        const sparkle = document.createElement('div');
        sparkle.className = 'sparkle';
        sparkle.style.left = centerX + 'px';
        sparkle.style.top = centerY + 'px';
        
        const angle = (Math.PI * 2 * i) / 12;
        const distance = 80;
        const translateX = Math.cos(angle) * distance;
        const translateY = Math.sin(angle) * distance;
        
        sparkle.style.setProperty('--translate-x', translateX + 'px');
        sparkle.style.setProperty('--translate-y', translateY + 'px');
        
        document.body.appendChild(sparkle);
        
        setTimeout(() => sparkle.remove(), 2000);
    }
}

// ========================================
// Botão Entrar - Transição para index.html
// ========================================
const enterButton = document.getElementById('enter-button');
const transitionOverlay = document.getElementById('transition-overlay');
const mainContainer = document.getElementById('main-container');

enterButton.addEventListener('click', () => {
    // Tocar som (opcional - Web Audio API)
    playClickSound();
    
    // Animação de saída
    mainContainer.classList.add('fade-out');
    transitionOverlay.classList.add('active');
    
    // Redirecionar após animação
    setTimeout(() => {
        // Marcar que já viu a apresentação
        localStorage.setItem('hasSeenPresentation', 'true');
        
        // Redirecionar para o app principal
        // No Capacitor, usar caminho absoluto
        if (window.Capacitor) {
            window.location.href = '/index.html';
        } else {
            window.location.href = './index.html';
        }
    }, 1000);
});

// ========================================
// Som de clique usando Web Audio API
// ========================================
function playClickSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Tom agradável (Mi 5)
        oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime);
        oscillator.type = 'sine';

        // Envelope de volume
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
        console.log('Web Audio API não disponível:', error);
    }
}

// ========================================
// Efeito hover no botão - criar ondas
// ========================================
enterButton.addEventListener('mouseenter', () => {
    enterButton.style.transform = 'translateY(-5px) scale(1.05)';
});

enterButton.addEventListener('mouseleave', () => {
    enterButton.style.transform = 'translateY(0) scale(1)';
});

// ========================================
// Easter egg: Pressionar Enter também entra
// ========================================
document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        enterButton.click();
    }
});

// ========================================
// Animação de partículas ao mover o mouse
// ========================================
document.addEventListener('mousemove', (event) => {
    if (Math.random() > 0.95) {
        const sparkle = document.createElement('div');
        sparkle.className = 'sparkle';
        sparkle.style.left = event.clientX + 'px';
        sparkle.style.top = event.clientY + 'px';
        sparkle.style.background = `hsl(${Math.random() * 60 + 160}, 70%, 60%)`;
        document.body.appendChild(sparkle);
        
        setTimeout(() => sparkle.remove(), 2000);
    }
});

// ========================================
// Console log amigável
// ========================================
console.log('%c🛒 Lista de Compras IA ', 'background: #4ECDC4; color: #1a1a2e; font-size: 20px; padding: 10px; border-radius: 5px; font-weight: bold;');
console.log('%cBem-vindo ao melhor app de lista de compras com IA! 🎉', 'color: #6BCB77; font-size: 14px;');
console.log('%cDesenvolvido com ❤️', 'color: #FFD93D; font-size: 12px;');

// ========================================
// Debug - Verificar estado
// ========================================
console.log('🎨 Apresentação carregada');
console.log('📱 Capacitor:', window.Capacitor !== undefined);
console.log('💾 hasSeenPresentation:', localStorage.getItem('hasSeenPresentation'));

// ========================================
// Pré-carregar index.html para transição suave
// ========================================
const link = document.createElement('link');
link.rel = 'prefetch';
link.href = 'index.html';
document.head.appendChild(link);

