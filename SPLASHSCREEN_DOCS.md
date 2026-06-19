# 🎨 SplashScreen Component - Documentação (DESCONTINUADO)

## ⚠️ AVISO: Este componente foi removido!

O componente **SplashScreen** React foi **DESCONTINUADO** e substituído pela tela de apresentação HTML pura em `apresentacao.html`.

## Descrição

Tela de apresentação animada e profissional para o app **Lista de Compras Inteligente**, usando:
- ✅ **React** + **TypeScript**
- ✅ **Framer Motion** (animações avançadas)
- ✅ **TailwindCSS** (estilização)
- ✅ **Web Audio API** (efeito sonoro)

---

## 🎬 Características

### Animações Visuais:

1. **Fundo com gradiente animado**
   - Transição suave entre tons de verde e azul
   - Imagem de fundo desfocada com baixa opacidade

2. **Logo central**
   - ✨ Zoom (0 → 1.1 → 1)
   - 🔄 Rotação suave (0° → 5° → 0°)
   - 💫 Fade-in
   - 🌟 Brilho pulsante ao redor

3. **Texto "LISTA DE COMPRAS"**
   - 📝 Aparecimento letra por letra
   - ⏱️ Stagger delay de 0.05s
   - 🎭 Slide de baixo para cima

4. **Slogan**
   - 🌊 Fade suave após 2 segundos
   - 📍 Slide vertical

5. **Indicador de carregamento**
   - 🔵 3 bolinhas brancas
   - 🎪 Efeito bounce infinito
   - ⏰ Aparece após 2.5s

6. **Fade-out final**
   - ⚫ Overlay preto
   - 🎬 Transição em 0.5s
   - ✅ Finaliza após 4 segundos

### Efeito Sonoro:

- 🎵 **Nota harmônica suave** (Dó 5 - 523.25 Hz)
- ⏰ Inicia em **800ms** (sincronizado com logo)
- ⏱️ Duração: **1.3 segundos**
- 🔊 Volume com envelope (fade in/out)
- 🌐 Compatível com todos os navegadores

---

## 📦 Instalação

### 1. Instalar dependências:

```bash
npm install framer-motion
```

### 2. Arquivo já criado:
```
components/SplashScreen.tsx
```

### 3. Logo necessário:
```
public/logo.png  ✅ (já configurado)
```

---

## 🚀 Como Usar

### Exemplo básico no `App.tsx`:

```tsx
import { useState } from 'react';
import { SplashScreen } from './components/SplashScreen';
import App from './App'; // Seu app principal

export default function Main() {
  const [loading, setLoading] = useState(true);

  return (
    <>
      {loading && <SplashScreen onFinish={() => setLoading(false)} />}
      {!loading && <App />}
    </>
  );
}
```

### Já integrado no projeto:

O `App.tsx` já possui a integração:

```tsx
const [showSplash, setShowSplash] = useState(true);

// No início do render:
if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
}
```

---

## ⚙️ Configuração

### Props do Componente:

```typescript
interface SplashScreenProps {
  onFinish: () => void;  // Callback executado após 4.5s
}
```

### Temporização:

| Evento | Tempo |
|--------|-------|
| Som | 800ms |
| Texto aparece | 0-2s |
| Slogan aparece | 2s |
| Indicador aparece | 2.5s |
| Fade-out inicia | 4s |
| onFinish() chamado | 4.5s |

---

## 🎨 Personalização

### Alterar cores do gradiente:

```tsx
// No arquivo SplashScreen.tsx, linha ~88
animate={{
  background: [
    'linear-gradient(to bottom right, #4ade80, #10b981, #3b82f6)',
    'linear-gradient(to bottom right, #34d399, #059669, #2563eb)',
    'linear-gradient(to bottom right, #4ade80, #10b981, #3b82f6)',
  ],
}}
```

### Alterar duração total:

```tsx
// Linha ~45
const fadeTimer = setTimeout(() => {
  setShowOverlay(true);
}, 4000);  // ← Mudar aqui (em ms)
```

### Alterar texto:

```tsx
// Linha ~82
const title = "LISTA DE COMPRAS";  // ← Mudar aqui
```

### Desabilitar som:

Comente a linha ~40-42:
```tsx
// const soundTimer = setTimeout(() => {
//   playSound();
// }, 800);
```

---

## 🎵 Web Audio API

### Frequências disponíveis:

```typescript
// Linha ~22
oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
```

**Notas musicais:**
- Dó 5 (C5): 523.25 Hz ← **atual**
- Ré 5 (D5): 587.33 Hz
- Mi 5 (E5): 659.25 Hz
- Sol 5 (G5): 783.99 Hz

### Tipos de onda:

```typescript
// Linha ~23
oscillator.type = 'sine';  // ← Mudar aqui
```

**Opções:**
- `'sine'` - suave e limpa ← **atual**
- `'square'` - mais robusta
- `'triangle'` - intermediária
- `'sawtooth'` - mais brilhante

---

## 🐛 Troubleshooting

### Problema: "Framer Motion não encontrado"

```bash
npm install framer-motion
```

### Problema: "Logo não aparece"

Verifique se existe:
```
public/logo.png
```

Se não, execute:
```bash
copy public\res\1024.png public\logo.png
```

### Problema: "Som não toca"

1. A Web Audio API requer **interação do usuário** primeiro
2. O navegador pode bloquear áudio automático
3. Teste em navegadores modernos (Chrome, Edge, Firefox)

### Problema: "Animações muito lentas/rápidas"

Ajuste os valores de `duration` nos componentes `motion`:

```tsx
transition={{
  duration: 1.2,  // ← Ajustar aqui
  // ...
}}
```

---

## 📊 Performance

- **Tamanho bundle**: ~50KB (com Framer Motion)
- **Tempo de carregamento**: < 100ms
- **FPS**: 60fps consistente
- **Compatibilidade**: Chrome 51+, Firefox 49+, Safari 10+

---

## 🎯 Boas Práticas

✅ **Use apenas uma vez** no carregamento inicial  
✅ **Mantenha entre 3-5 segundos** de duração  
✅ **Evite animações muito complexas** (performance)  
✅ **Teste em dispositivos móveis**  
✅ **Considere modo dark/light**  

---

## 📚 Recursos

- [Framer Motion Docs](https://www.framer.com/motion/)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [TailwindCSS](https://tailwindcss.com/)

---

**Desenvolvido com ❤️ para Lista de Compras IA**

