# Jouer en ligne avec des amis

Trois options selon ce que tu veux.

## Option 1 — LAN (même WiFi)

**Setup en 30 secondes**, pas de compte requis. Tes amis doivent être chez toi
ou sur le même réseau WiFi.

1. Lance le serveur :
   ```
   npm run server:dev
   ```
2. Lance le client (dans un autre terminal) :
   ```
   npm run client:dev
   ```
3. Trouve ton IP locale (sur Windows : `ipconfig`, sur Mac/Linux : `ifconfig`).
   Cherche une ligne du type `192.168.x.y` ou `10.0.x.y`.
4. Tes amis ouvrent : `http://TON_IP:5173` (par exemple `http://192.168.1.217:5173`)
5. Le client s'auto-configure pour parler au serveur via la même IP, port 3001.

**Important** : ton firewall peut bloquer les ports 5173 et 3001. Si tes amis
n'arrivent pas à se connecter, autorise ces ports dans Windows Defender ou ton
firewall.

## Option 2 — Tunnel temporaire (n'importe où via internet)

Pour jouer avec des amis loins, sans déployer. Setup en 5 min.

### Avec Cloudflare Tunnel (gratuit, pas de compte)

```bash
# Installe cloudflared (Windows : winget install --id Cloudflare.cloudflared)
# Puis dans un terminal, lance les deux tunnels :

# Terminal 1 : serveur
npm run server:dev

# Terminal 2 : client
npm run client:dev

# Terminal 3 : tunnel pour le client
cloudflared tunnel --url http://localhost:5173
# Te donne une URL type https://xxx-yyy-zzz.trycloudflare.com

# Terminal 4 : tunnel pour le serveur
cloudflared tunnel --url http://localhost:3001
# Te donne une autre URL type https://aaa-bbb-ccc.trycloudflare.com
```

Puis tu dois dire au client d'utiliser la 2e URL pour le serveur. Le plus simple :
ouvre la console F12 sur la page (l'URL du client) et tape :
```js
window.__SERVER_URL__ = "https://aaa-bbb-ccc.trycloudflare.com";
location.reload();
```

Tes amis ouvrent la 1ère URL (celle du client) et font la même manip.

## Option 3 — Déploiement permanent (gratuit, URL stable)

Pour avoir une vraie URL `mahjong.xxx.app` à partager. ~30 min.

### Serveur sur Render (free tier)

1. Crée un compte sur [render.com](https://render.com)
2. Nouveau service → "Web Service" → connecte ton repo GitHub
3. Settings :
   - Build Command : `npm install && npm run engine:build && npm run server:build`
   - Start Command : `npm --workspace @mjwz/server run start`
   - Environment : Node
4. Render te donne une URL type `https://mjwz-server.onrender.com`

### Client sur Vercel (free)

1. Compte [vercel.com](https://vercel.com)
2. Import du repo GitHub
3. Settings :
   - Framework : Vite
   - Root Directory : `packages/client`
   - Environment Variables : `VITE_SERVER_URL=https://mjwz-server.onrender.com`
4. Vercel te donne une URL type `https://mjwz.vercel.app`

Partage l'URL Vercel à tes amis. Ils peuvent jouer 24/7.

**Note Render free** : le serveur s'endort après 15 min d'inactivité.
Premier appel peut prendre 30s à wake up.
