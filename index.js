const puppeteer = require('puppeteer');

//taking from : https://gist.github.com/marcelo-ribeiro/abd651b889e4a20e0bab558a05d38d77#file-javascript-remove-accents-js
//replace accent letters .. 
function slugify (str) {
  var map = {
      '-' : ' ',
      '-' : '_',
      'a' : 'á|à|ã|â|À|Á|Ã|Â',
      'e' : 'é|è|ê|É|È|Ê',
      'i' : 'í|ì|î|Í|Ì|Î',
      'o' : 'ó|ò|ô|õ|Ó|Ò|Ô|Õ',
      'u' : 'ú|ù|û|ü|Ú|Ù|Û|Ü',
      'c' : 'ç|Ç',
      'n' : 'ñ|Ñ'
  };  
  for (var pattern in map) {
      str = str.replace(new RegExp(map[pattern], 'g'), pattern);
  };
  return str;
};

//Extract all the text inside in a array of HTML text and flat it.. 
function ExtractMessage(messages){
  let finalText='';
  for(let i=0;i<messages.length;i++){   
    let array = messages[i].match(/>(.*?)</gm);
    if(array){
      for(let j=0;j<array.length;j++){
        if(array[j].length > 3){
          array[j] = array[j].replace(/<|>/gm, ' ');                
          finalText += slugify(array[j]);          
        }
      }
  }else{
    finalText += messages[i];
  }
  }
  return finalText.toLowerCase();
}

//Compare the message captured with our keywords list ..
//************************************************************
function Interes(mensaje){
  //this my list of keywords..  you can set here a DB query, file, etc .. 
  let intereses = ['carro','motocicleta','aros','robado','seguridad','moto','gps','vehiculo','nave','toyota','honda','hiunday','llantas','carroceria','pickup','motor','4x4','gasolina','diesel','repuestos','rtv','mecanica','nissan'];

  let array = mensaje.split(' ');
  let coincidencias = 0;
  //recorremos el arreglo
  for(let i=0;i<array.length;i++){
    for(let j=0;j<intereses.length;j++){
      if(array[i].trim() == intereses[j].trim()) coincidencias++;
    }
  }
  //we return a value ..
  return coincidencias/array.length*100;
}

//SCROLl the page.. 
async function AutoScroll(page){
  await page.evaluate(async () => {
      await new Promise((resolve, reject) => {
          var totalHeight = 0;
          var distance = 100;
          var cantidad = 300; // 300 scroll medium... 1000 long scroll..
          var timer = setInterval(() => {
            var scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;
            cantidad--;
            //if(totalHeight >= scrollHeight){
            if(cantidad <= 0){
                clearInterval(timer);
                resolve();
            }
        }, 100);
    });
});
}

//Principal function..
async function Liker(){

try {
  const browser = await puppeteer.launch({
      headless: false,
      args : ['--no-sandbox', '--disable-notifications']
  });

  const page = await browser.newPage();
  await page.setDefaultNavigationTimeout(1000000);
  await page.setViewport({ width: 1000, height: 1200 });
  //go to facebook ..
  await page.goto('https://www.facebook.com');
  await page.waitForSelector('#email');
  //here you need to write your facebook credentials.. 
  await page.type('#email', 'YOUR_EMAIL');
  await page.type('#pass', 'YOUR_PASSWORD');

  await page.click(`[type="submit"]`);
  await page.waitForNavigation();

  //scroll the page..!
  await AutoScroll(page,100);

  //find all the feeds...
  let el =await page.$$('div[role="feed"] div[data-pagelet]');

  for(let i=0;i<el.length;i++){
  
      // click on "view more" for more text ..
      await el[i].$$eval('div[data-ad-preview="message"] div[role="button"]', els =>
        els.map( e => e.click())
      );
      
      //get all the text of the feeds...
      var  mensajes = await el[i].$$eval('div[data-ad-preview="message"]', els =>
        els.map( e => e.innerHTML)
      );
      
      //No encontramos nada..!
      if(mensajes.length == 0){
        mensajes = await el[i].$$eval('div[role="article"]', els =>
          els.map( e => e.innerHTML)
        );
      }

      //Obtenemos el mensaje del post ..
      let texto = ExtractMessage(mensajes);
      //Analizamos el mensaje del post y revisamos si nos interesa..
      let puntuacion = Interes(texto);

      //if we get a match with our keywords.. 
      if(puntuacion > 0){
        // finally  : I Like..! replace "Me gusta" with "I Like" 
        await el[i].$$eval('span div[aria-label="Me gusta"]', els =>
          els.map( e => e.click())
        );
      }
  }
  }catch(Exception){
    console.log('This not work..sorry,',Exception);
  }
}

//Execute the rutine..
Liker();
