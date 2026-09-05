const generateSocietyCode = () => {
  const letters = Array.from({ length: 3 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  ).join('');
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `${letters}${digits}`;
};

const generateUniqueSocietyCode = async () => {
  const Society = require('../models/Society');

  let code;
  let isUnique = false;

  while (!isUnique) {
    code = generateSocietyCode();
    const existingSociety = await Society.findOne({ societyCode: code });
    isUnique = !existingSociety;
  }

  return code;
};

module.exports = { generateSocietyCode, generateUniqueSocietyCode };