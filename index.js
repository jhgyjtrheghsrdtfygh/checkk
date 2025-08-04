const express = require('express');
const fs = require('fs');
const path = require('path');
const pino = require('pino');
const { makeWASocket, useMultiFileAuthState, delay, DisconnectReason } = require("@whiskeysockets/baileys");
const multer = require('multer');
const qrcode = require('qrcode');

const app = express();
const port = 5000;

let MznKing;
let messages = null;
let targetNumbers = [];
let groupUIDs = [];
let intervalTime = null;
let haterName = null;
let lastSentIndex = 0;
let isConnected = false;
let pairCodeCache = null;
let groupDetails = []; // Stores group names and their corresponding UIDs

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Initialize WhatsApp connection
const setupBaileys = async () => {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

  const connectToWhatsApp = async () => {
    MznKing = makeWASocket({
      logger: pino({ level: 'silent' }),
      auth: state,
    });

    MznKing.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (connection === 'open') {
        console.log('WhatsApp connected successfully.');
        isConnected = true;

        // Fetch group metadata
        const chats = await MznKing.groupFetchAllParticipating();
        groupDetails = Object.values(chats).map(group => ({
          name: group.subject,
          uid: group.id,
        }));
      } else if (connection === 'close' && lastDisconnect?.error) {
        const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
        if (shouldReconnect) {
          console.log('Reconnecting...');
          await connectToWhatsApp();
        }
      }

      if (qr) {
        pairCodeCache = generatePairCode(qr);
      }
    });

    MznKing.ev.on('creds.update', saveCreds);
    return MznKing;
  };

  await connectToWhatsApp();
};

setupBaileys();

// Function to generate a pair code from a QR code
function generatePairCode(qr) {
  // This is a placeholder function. You need to implement the actual logic to generate a pair code from the QR code.
  // For example, you can use a library or a custom algorithm to convert the QR code data into a pair code.
  return 'PAIRCODE1234';
}

// Serve the main page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>SarFu Rullex BoY</title>
      <style>
        body { font-family: Arial, sans-serif; background-color: #f0f0f0; color: #333; }
        h1 { text-align: center; color: #4CAF50; }
        #pairCodeBox { width: 200px; height: 200px; margin: 20px auto; display: flex; justify-content: center; align-items: center; border: 2px solid #4CAF50; }
        #pairCodeBox p { font-size: 1.5em; }
        form { margin: 20px auto; max-width: 500px; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        input, select, button { width: 100%; margin: 10px 0; padding: 10px; border-radius: 5px; border: 1px solid #ccc; }
        button { background-color: #4CAF50; color: white; border: none; cursor: pointer; }
        button:hover { background-color: #45a049; }
      </style>
      <script>
        function toggleFields() {
          const targetOption = document.getElementById("targetOption").value;
          if (targetOption === "1") {
            document.getElementById("numbersField").style.display = "block";
            document.getElementById("groupUIDsField").style.display = "none";
          } else if (targetOption === "2") {
            document.getElementById("numbersField").style.display = "none";
            document.getElementById("groupUIDsField").style.display = "block";
          }
        }

        document.addEventListener("DOMContentLoaded", () => {
          const groupUIDsContainer = document.getElementById("groupUIDsContainer");
          const groupDetails = ${JSON.stringify(groupDetails)};
          groupUIDsContainer.innerHTML = groupDetails.map(group =>
            \<label><input type="checkbox" name="groupUIDs" value="${group.uid}"> ${group.name}</label><br>\
          ).join('');
        });
      </script>
    </head>
    <body>
      <h1>SarFu Rullex boY</h1>
      ${isConnected ? `
        <form action="/send-messages" method="post" enctype="multipart/form-data">
          <label for="targetOption">Select Target Option:</label>
          <select name="targetOption" id="targetOption" onchange="toggleFields()" required>
            <option value="1">Send to Target Number</option>
            <option value="2">Send to WhatsApp Group</option>
          </select>

          <div id="numbersField" style="display:block;">
            <label for="numbers">Enter Target Numbers (comma separated):</label>
            <input type="text" id="numbers" name="numbers">
          </div>

          <div id="groupUIDsField" style="display:none;">
            <label for="groupUIDsContainer">Select Group(s):</label>
            <div id="groupUIDsContainer"></div>
          </div>

          <label for="messageFile">Upload Your Message File:</label>
          <input type="file" id="messageFile" name="messageFile" required>

          <label for="haterNameInput">Enter Hater's Name:</label>
          <input type="text" id="haterNameInput" name="haterNameInput" required>

          <label for="delayTime">Enter Message Delay (in seconds):</label>
          <input type="number" id="delayTime" name="delayTime" required>

          <button type="submit">Start Sending Messages</button>
        </form>
      ` : `
        <h2>ENTER YOUR WHATSAPP NUMBER</h2>
        <form action="/generate-pair-code" method="post">
          <label for="whatsappNumber">WhatsApp Number:</label>
          <input type="text" id="whatsappNumber" name="whatsappNumber" required>
          <button type="submit">Generate Pair Code</button>
        </form>
      `}
    </body>
    </html>
  `);
});

// Handle WhatsApp number submission to generate pair code
app.post('/generate-pair-code', express.urlencoded({ extended: true }), async (req, res) => {
  const { whatsappNumber } = req.body;
  // Here you would generate the pair code based on the WhatsApp number
  // For example: const pairCode = generatePairCodeFromNumber(whatsappNumber);
  const pairCode = 'PAIRCODE1234'; // Placeholder pair code
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Pair Code</title>
      <style>
        body { font-family: Arial, sans-serif; background-color: #f0f0f0; color: #333; }
        h1 { text-align: center; color: #4CAF50; }
        #pairCodeBox { width: 200px; height: 200px; margin: 20px auto; display: flex; justify-content: center; align-items: center; border: 2px solid #4CAF50; }
        #pairCodeBox p { font-size: 1.5em; }
        form { margin: 20px auto; max-width: 500px; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        input, button { width: 100%; margin: 10px 0; padding: 10px; border-radius: 5px; border: 1px solid #ccc; }
        button { background-color: #4CAF50; color: white; border: none; cursor: pointer; }
        button:hover { background-color: #45a049; }
      </style>
    </head>
    <body>
      <h1>Your Pair Code</h1>
      <div id="pairCodeBox">
        <p>${pairCode}</p>
      </div>
      <form action="/pair-code" method="post">
        <label for="pairCodeInput">Enter Pair Code:</label>
        <input type="text" id="pairCodeInput" name="pairCodeInput" required>
        <button type="submit">Submit Pair Code</button>
      </form>
    </body>
    </html>
  `);
});

// Handle pair code submission
app.post('/pair-code', express.urlencoded({ extended: true }), async (req, res) => {
  const { pairCodeInput } = req.body;
  // Here you would validate the pair code and proceed with the connection
  // For example: if (validatePairCode(pairCodeInput)) {
  //   // Proceed with connection
  // } else {
  //   res.send({ status: 'error', message: 'Invalid pair code' });
  // }
  res.send({ status: 'success', message: 'Pair code submitted successfully!' });
});

// Process message sending
app.post('/send-messages', upload.single('messageFile'), async (req, res) => {
  try {
    const { targetOption, numbers, groupUIDs: groupUIDsRaw, delayTime, haterNameInput } = req.body;

    haterName = haterNameInput;
    intervalTime = parseInt(delayTime, 10);

    if (req.file) {
      messages = req.file.buffer.toString('utf-8').split('\n').filter(Boolean);
    } else {
      throw new Error('No message file uploaded');
    }

    if (targetOption === "1") {
      targetNumbers = numbers.split(',');
    } else if (targetOption === "2") {
      groupUIDs = Array.isArray(groupUIDsRaw) ? groupUIDsRaw : [groupUIDsRaw];
    }

    res.send({ status: 'success', message: 'Message sending initiated!' });
    await sendMessages();
  } catch (error) {
    res.send({ status: 'error', message: error.message });
  }
});

// Message sending logic
const sendMessages = async () => {
  while (true) {
    for (let i = lastSentIndex; i < messages.length; i++) {
      try {
        const fullMessage = ${haterName} ${messages[i]};

        if (targetNumbers.length > 0) {
          for (const target of targetNumbers) {
            await MznKing.sendMessage(${target}@c.us, { text: fullMessage });
          }
        } else {
          for (const group of groupUIDs) {
            await MznKing.sendMessage(group, { text: fullMessage });
          }
        }

        await delay(intervalTime * 1000);
      } catch (err) {
        console.error(Error sending message: ${err.message});
        lastSentIndex = i;
        await delay(5000);
      }
    }
    lastSentIndex = 0;
  }
};

// Start the server
app.listen(port, () => {
  console.log(Server running on http://localhost:${port});
});
