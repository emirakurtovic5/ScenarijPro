const { Sequelize } = require('sequelize');


const sequelize = new Sequelize('wt26', 'root', '', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false, 
  define: {
    timestamps: false 
  }
});


async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('Konekcija sa bazom uspješno uspostavljena.');
  } catch (error) {
    console.error('Greška pri povezivanju sa bazom:', error);
  }
}

testConnection();

module.exports = sequelize;