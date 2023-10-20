import puppeteer from 'puppeteer';
import fs from 'fs';


async function scrapeHouses() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  const baseURL = 'https://www.immoscoop.be/zoeken/te-koop/2440-geel/alle'
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36');
  await page.goto(baseURL, { waitUntil: 'networkidle0' });

  const pageTitle = await page.$eval('h1', (element) => element.textContent.trim());
  const totalPages = await page.$eval('nav[data-component="pagination"]', (element) => {
    return element.getAttribute('data-page-count');
  });
 
  
  const houses = []

  for (let pageCounter = 1; pageCounter <= parseInt(totalPages); pageCounter++) {
    if (pageCounter > 1) {      
      await page.goto(`${baseURL}?page=${pageCounter}`, { waitUntil: 'networkidle0' });
    }
    
   const newHouses =  await page.$$eval('.card_card__coq1t', (rows) => {
        return rows.map((row) => {     
          const title = row.querySelector('h3').textContent.trim();
          //Reclame skippen
          if (title.includes('droomhuis')||title.includes('nieuwste panden')) {
            return  null          
          }
          let city
          let street
          const priceText = row.querySelector('.card_price__Bn4cO');
          const address = row.querySelector('address div');
          const epcLabels = row.querySelectorAll('.epc-icon_label__PJapZ');

          // Search for the EPC score by filtering the epcLabels array
          
  
          let score = 'Niet bekend';
         if (epcLabels.length > 1) {
          score = epcLabels[1].textContent.trim();
        }
          if (address.textContent.startsWith(2440)) {
            city = address.textContent.trim() 
            street = "Niet bekend"
          }else{
           city = address.textContent.substring(address.textContent.length-9, address.textContent.length)
           street = address.textContent.substring(0, address.textContent.length-9)

          }
            return {
              titel: row.querySelector('.card_title__8Em2M').textContent.trim(),
              prijs: priceText ? priceText.textContent.replace(/\./g, '').replace(/\€/g, '').trim() : 'N/A',
              stad : city,
              straat: street,
              EPC: score,
            };
          });
    });
    houses.push(...newHouses)
  }
  const filteredHouses = houses.filter((house) => {
    if (house === null || house === undefined) {
      return false; // Filter out null and undefined values
    }
    if(house.EPC.includes('F') || house.EPC.includes('E') || house.EPC.includes('D') || house.EPC.includes('Niet bekend') ){
      return false;
    }
    if (!house.titel.toLowerCase().includes('huis')) {
      return false; //
    }
  
    if (house.prijs.toLowerCase().includes('contact')) {
      return true; // Include listings with "contact" in the price
    }
    
    // Extract the numerical part of the price
    const priceMatch = house.prijs.match(/\d+/);
  
    if (priceMatch) {
      // Convert the extracted price to a number
      const price = parseInt(priceMatch[0]);
  
      if (price <= 500000) {
        if (house.prijs.includes('Vanaf')) {
          // If "Vanaf" is present, keep it in the output
          house.prijs = `Vanaf ${price.toLocaleString()}`; // You can format the price as needed
        }
        return true;
      }
    }
  
    return false;
  });
  

  
  console.log(pageTitle);  
  console.log(JSON.stringify(filteredHouses, null, 2));
 fs.writeFileSync('houses.json', JSON.stringify(filteredHouses, null, 2));
  await browser.close();

}

export { scrapeHouses };
