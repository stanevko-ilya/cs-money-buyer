const rp = require('request-promise');
const vk_io = require('vk-io');
const config = require('./config.json');

async function getExchangeRate() {
    const request = await rp('https://iss.moex.com/iss/statistics/engines/currency/markets/selt/rates.json?iss.meta=off', { json: true, resolveWithFullResponse: true });
    const json = request.body;
    return json.cbrf.data[0][json.cbrf.columns.indexOf('CBRF_USD_LAST')];
}

async function getItems(offset=0) {
    const rub_usd = await getExchangeRate();
    // https://cs.money/1.0/market/sell-orders?limit=60&offset=0&minPrice=5.780346820809249&isStatTrak=false&hasKeychains=false&isSouvenir=false&rarity=Industrial%20Grade&rarity=Mil-Spec%20Grade&rarity=Restricted&rarity=Classified&rarity=Covert&order=desc&sort=discount
    const url = `https://cs.money/1.0/market/sell-orders?limit=${config.requestLimit}&offset=${offset}&minPrice=${config.priceRUB.min/rub_usd}&maxPrice=${config.priceRUB.max/rub_usd}&type=2&type=13&type=5&type=6&type=3&type=4&type=7&type=8&isStatTrak=false&hasKeychains=false&isSouvenir=false&rarity=Mil-Spec Grade&rarity=Restricted&rarity=Classified&rarity=Covert&order=desc&sort=discount`;
    const request = await rp(url, { json: true });
    return request?.items || [];
}

const vk = new vk_io.VK({ token: 'vk1.a.CTTzO9VQmJ1SSGr9Sr3J7CAhPAxx3xSDTESeTaHj55uBtK9kcyYJco5bFwpSZEvyojCsifukGNEoKy6yge5IxwalIa8GoxC1dVvlEnVwHi3s4cUStnT1MsbdN8ULGX17RmAc-Xb5bCv5UdqZHPQtjXL3s18OGDuvh7RP6X0fDhjiycoLwbLyI84q6YY8Lvvq3J-Hll3UuRd3EjHjdD0toQ' });
const ids = [];

async function check() {
    const items = await getItems();
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.pricing.discount > config.disscount_percent/100 && !ids.includes(item.id)) {
            ids.push(item.id);
            const image = await vk.upload.messagePhoto({ source: { value: item.asset.images.steam } });
            const send = await vk.api.messages.send({
                random_id: 0,
                chat_id: 1,
                message: `
                    📄${item.asset.names.full}
                    💰Текущая цена: ${item.pricing.computed}$ (-${(item.pricing.discount*100).toFixed(0)}%)
                    📊Рекомендуемая цена: ${item.pricing.basePrice}$
                    🆔Идентификатор товара: ${item.id}
                    ⚙Флоат: ${item.asset.float}
                `,
                attachment: image.toString()
            });
            console.log(item, send);            
        }
    }
}

async function run() {
    check()
}
run();
