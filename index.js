// app.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const sessionMap = new Map();

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/get-pair-code', async (req, res) => {
  const number = req.body.number?.trim();
  if (!number) return res.status(400).send('❌ Number is required');

  const sessionFolder = path.join(__dirname, 'auth_info_baileys', number);
  fs.mkdirSync(sessionFolder, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);

  try {
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
    });

    const pairCode = await sock.requestPairingCode(number);
    sessionMap.set(number, { sock, saveCreds });
    res.json({ code: pairCode });
  } catch (err) {
    console.error(err);
    res.status(500).send('❌ Failed to generate pair code');
  }
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.post('/send-message', async (req, res) => {
  const { number, target, message, delay } = req.body;
  if (!number || !target || !message) return res.status(400).send('Missing fields');

  const session = sessionMap.get(number);
  if (!session) return res.status(400).send('Session not found');

  try {
    await session.sock.sendMessage(target + '@s.whatsapp.net', { text: message });
    res.send('✅ Message sent');
  } catch (err) {
    console.error(err);
    res.status(500).send('❌ Failed to send message');
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

