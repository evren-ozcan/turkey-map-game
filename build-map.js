const fs = require('fs');
const content = fs.readFileSync('node_modules/turkey-map-react/lib/data/index.js', 'utf8');

const jsonStr = content.replace('export var cities =', '').trim().replace(/;$/, '');
const cities = eval(jsonStr);

let svgPaths = '';
let cityData = [];

cities.forEach(city => {
    svgPaths += `    <path id="tr-${city.plateNumber.toString().padStart(2, '0')}" class="province" data-name="${city.name}" data-plate="${city.plateNumber}" d="${city.path}" />\n`;
    cityData.push({ id: `tr-${city.plateNumber.toString().padStart(2, '0')}`, plate: city.plateNumber, name: city.name });
});

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1050 600" width="100%" height="100%">
${svgPaths}
</svg>`;

fs.writeFileSync('turkey.svg', svgContent);
fs.writeFileSync('cities.js', `const cities = ${JSON.stringify(cityData, null, 2)};`);
console.log('Successfully generated turkey.svg and cities.js');
