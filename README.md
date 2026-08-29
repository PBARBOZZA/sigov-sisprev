# SIGOV SISPREV

Aplicacao TanStack Start com build Nitro para servidor Node.js em VPS.

## Desenvolvimento local

```bash
npm install
npm run dev
```

## Producao em VPS

```bash
npm install
npm run build
npm run start
```

O comando `npm run start` executa o build em `.output/server/index.mjs`. Por padrao, o servidor escuta em `127.0.0.1:3001`. Se `PORT` estiver definido no ambiente, esse valor e usado no lugar da porta padrao.

## PM2

```bash
pm2 start npm --name sigov -- start
```

Com Caddy, configure o reverse proxy para encaminhar as requisicoes para `127.0.0.1:3001`, ou para a porta definida em `PORT`.
