const Sequelize = require('sequelize');

const sequelize = new Sequelize('database', 'user', 'password', {
	host: 'localhost',
	dialect: 'sqlite',
	logging: false,
	// SQLite only
	storage: './data/database.sqlite',
});

// Define User model
const User = sequelize.define('User', {
  discordId: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true
  },
  sheetId: {
    type: Sequelize.STRING,
    allowNull: false
  },
  sheetName: {
    type: Sequelize.STRING,
    defaultValue: 'Expenses'
  },
  createdAt: {
    type: Sequelize.DATE,
    defaultValue: Sequelize.NOW
  }
});

// Initialize database
async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    await sequelize.sync(); // Creates tables if they don't exist
    console.log('Database connection established');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

module.exports = { sequelize, User, initializeDatabase };