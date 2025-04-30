const fs = require('fs');
const path = require('path');


function fetchLoteriaJson() {
  try {
    const filePath = path.join(__dirname, 'dados.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('❌ Erro ao ler dados locais:', error.message);
    return null;
  }
}

module.exports = fetchLoteriaJson;