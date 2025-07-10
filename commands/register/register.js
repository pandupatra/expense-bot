// commands/register.js
const { SlashCommandBuilder } = require('discord.js');
const { User } = require('../../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('register')
    .setDescription('Link your personal Google Sheet for expense tracking')
    .addStringOption(option =>
      option.setName('sheet_url')
        .setDescription('The shareable URL of your Google Sheet')
        .setRequired(true)),
    
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const sheetUrl = interaction.options.getString('sheet_url');
      const sheetId = extractSheetId(sheetUrl);
      
      // Upsert user record
      const [user, created] = await User.upsert({
        discordId: interaction.user.id,
        sheetId: sheetId
      });

      await interaction.editReply(
        created ? '✅ Your personal expense sheet has been registered!' 
               : '✅ Updated your expense sheet link!'
      );
    } catch (error) {
      console.error('Registration error:', error);
      await interaction.editReply(
        '❌ Failed to register your sheet. Please ensure:\n' +
        '1. You provided a valid Google Sheets URL\n' +
        '2. You\'ve shared the sheet with the bot\'s service account\n' +
        '3. The sheet has the required columns (A-H)'
      );
    }
  }
};

function extractSheetId(url) {
  const matches = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!matches || matches.length < 2) {
    throw new Error('Invalid Google Sheets URL');
  }
  return matches[1];
}