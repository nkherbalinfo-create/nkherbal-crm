// Standalone SSE broadcaster — imported by both waconversations.js and whatsapp.js
const clients = new Set();

function addClient(res) { clients.add(res); }
function removeClient(res) { clients.delete(res); }

function broadcast(event) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  clients.forEach(res => { try { res.write(payload); } catch {} });
}

module.exports = { addClient, removeClient, broadcast };
