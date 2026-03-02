const axios = require('axios');

async function testApi() {
    try {
        console.log("Fetching cities for SP...");
        const citiesRes = await axios.get('https://servicodados.ibge.gov.br/api/v1/localidades/estados/SP/municipios');
        const saoPaulo = citiesRes.data.find(c => c.nome === 'São Paulo');
        console.log("São Paulo ID:", saoPaulo.id);

        console.log("Fetching subdistritos for São Paulo...");
        const subRes = await axios.get(`https://servicodados.ibge.gov.br/api/v1/localidades/municipios/${saoPaulo.id}/subdistritos`);
        console.log(`Found ${subRes.data.length} subdistritos`);
        console.log("First 5:", subRes.data.slice(0, 5).map(s => s.nome));

        console.log("Fetching distritos for São Paulo...");
        const distRes = await axios.get(`https://servicodados.ibge.gov.br/api/v1/localidades/municipios/${saoPaulo.id}/distritos`);
        console.log(`Found ${distRes.data.length} distritos`);
        console.log("First 5:", distRes.data.slice(0, 5).map(s => s.nome));
    } catch (e) {
        console.error(e);
    }
}

testApi();
