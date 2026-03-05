const fs = require('fs');
const https = require('https');
const path = require('path');

const images = [
    { name: 'peter-pan.png', url: 'https://static.wikia.nocookie.net/disney/images/2/27/Profile_-_Peter_Pan.jpeg' },
    { name: 'pippi.png', url: 'https://m.media-amazon.com/images/S/pv-target-images/05ff19728a554209df3269550302844ca76104e76d9f8df20a325049380b33f3.jpg' },
    { name: 'paddington.png', url: 'https://m.media-amazon.com/images/M/MV5BMjA5OTc3Nzg5Nl5BMl5BanBnXkFtZTgwOTIyMzAyMzE@._V1_.jpg' },
    { name: 'pooh.png', url: 'https://static.wikia.nocookie.net/disney/images/b/be/Winnie_the_Pooh_new.png' },
    { name: 'dogman.png', url: 'https://images.squarespace-cdn.com/content/v1/55b93d39e4b008d5045610bc/1515598144215-HTRCH7DRD6IP2QIKX66S/Dog+Man+Logo.png' },
    { name: 'charlotte.png', url: 'https://static.wikia.nocookie.net/p__/images/6/69/Charlotte_Web.png/revision/latest?cb=20210214154425&path-prefix=protagonist' },
    { name: 'wilbur.png', url: 'https://static.wikia.nocookie.net/p__/images/b/bc/Wilbur_Web.png/revision/latest?cb=20210214154443&path-prefix=protagonist' },
    { name: 'stuart-little.png', url: 'https://static.wikia.nocookie.net/p__/images/6/6d/Stuart_Little.png/revision/latest?cb=20210214154502&path-prefix=protagonist' },
    { name: 'cat-hat.png', url: 'https://static.wikia.nocookie.net/p__/images/0/05/Cat_in_the_Hat.png/revision/latest?cb=20210214154518&path-prefix=protagonist' },
    { name: 'horton.png', url: 'https://static.wikia.nocookie.net/p__/images/7/7b/Horton.png/revision/latest?cb=20210214154536&path-prefix=protagonist' },
    { name: 'captain-underpants.png', url: 'https://static.wikia.nocookie.net/p__/images/4/4e/Captain_Underpants.png/revision/latest?cb=20210214154555&path-prefix=protagonist' },
    { name: 'auggie.png', url: 'https://m.media-amazon.com/images/M/MV5BMjA5OTc3Nzg5Nl5BMl5BanBnXkFtZTgwOTIyMzAyMzE@._V1_.jpg' }, // Fallback to something similar
    { name: 'ivan.png', url: 'https://m.media-amazon.com/images/M/MV5BMjA5OTc3Nzg5Nl5BMl5BanBnXkFtZTgwOTIyMzAyMzE@._V1_.jpg' }, // Fallback
    { name: 'mercy-watson.png', url: 'https://m.media-amazon.com/images/I/51e3l9vE7RL.jpg' },
    { name: 'junie-b-jones.png', url: 'https://m.media-amazon.com/images/I/51e3l9vE7RL.jpg' }, // Fallback
    { name: 'geronimo-stilton.png', url: 'https://static.wikia.nocookie.net/geronimo-stilton/images/0/03/Geronimo_Stilton.png' },
    { name: 'ms-frizzle.png', url: 'https://static.wikia.nocookie.net/magicschoolbus/images/c/c5/Ms-frizzle.png' },
    { name: 'arthur.png', url: 'https://static.wikia.nocookie.net/arthur/images/3/3a/Arthur_Read.png' },
    { name: 'clifford.png', url: 'https://static.wikia.nocookie.net/clifford/images/2/2d/Clifford_the_Big_Red_Dog.png' },
    { name: 'curious-george.png', url: 'https://static.wikia.nocookie.net/curiousgeorge/images/1/1a/Curious_George.png' }
];

const destDir = path.join(__dirname, 'public', 'assets', 'books');
if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

images.forEach(img => {
    const filePath = path.join(destDir, img.name);
    const file = fs.createWriteStream(filePath);
    https.get(img.url, response => {
        response.pipe(file);
        file.on('finish', () => {
            file.close();
            console.log(`Downloaded ${img.name}`);
        });
    }).on('error', err => {
        fs.unlink(filePath, () => { });
        console.error(`Error downloading ${img.name}: ${err.message}`);
    });
});
