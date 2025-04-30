const axios = require('axios');
const fs = require('fs');

async function salvarJsonLocal() {
  try {
    const url = process.env.URL;
    const response = await axios.get(url);
    fs.writeFileSync('dados.json', JSON.stringify(response.data, null, 2));
    console.log('✅ Dados salvos em dados.json');
  } catch (error) {
    console.error('❌ Erro ao salvar dados:', error.message);
  }
}

salvarJsonLocal();
