const Filter = require('bad-words');
const filter = new Filter();

const word1 = 'badword';
const word2 = 'shit'; // more likely to be in the list

console.log(`'${word1}' is profane:`, filter.isProfane(word1));
console.log(`'${word1}' cleaned:`, filter.clean(word1));

console.log(`'${word2}' is profane:`, filter.isProfane(word2));
console.log(`'${word2}' cleaned:`, filter.clean(word2));
