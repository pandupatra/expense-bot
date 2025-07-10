const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { authClient, initializeGoogleAuth } = require('../../utils/googleAuth');
const { google } = require('googleapis');
const { User } = require('../../utils/database');

const SPREADSHEET_ID = '1taivZy8UE2V6XTRiNrIdeyFF6mhWJoppzIpfBnRKXjM';

// The sheet name and range where data will be written
const SHEET_NAME = 'Expenses';
const RANGE = 'A:H'; // Updated to cover 8 columns

async function addExpenseToSheet(expenseData, sheetId) {

  const authClient = await initializeGoogleAuth()
  const sheets = google.sheets({ version: 'v4', auth: authClient });

  // Get current data to find the next empty row
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${SHEET_NAME}!${RANGE}`,
  });

  const rows = response.data.values || [];
    
  // Find first row where column B (date) is empty
  let firstEmptyRow = 2; // Start from row 2 (after header)
  for (; firstEmptyRow <= rows.length + 1; firstEmptyRow++) {
    // Check if date column (B) is empty
    if (!rows[firstEmptyRow - 1] || !rows[firstEmptyRow - 1][1]) {
      break;
    }
  }

  // Prepare the new row data
  const newRow = [
    false, // Checkbox (column A)
    expenseData.date || new Date().toLocaleDateString('en-GB'), // DD/MM/YYYY format (column B)
    expenseData.month || new Date().toLocaleString('id-ID', { month: 'long' }), // Full month name (column C)
    expenseData.transaction || "Cash", // Column D
    expenseData.description, // Column E
    expenseData.category || 'Uncategorized', // Column F
    expenseData.bank || "TUNAI", // Column G
    expenseData.amount.toLocaleString('id-ID'), // Format with Indonesian thousands separator (column H)
  ];

  // Update the sheet
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `Expenses!A${firstEmptyRow}:H${firstEmptyRow}`,
    valueInputOption: 'USER_ENTERED',
    resource: {
      values: [newRow],
    },
  });

  console.log('Expense added to sheet');
}

module.exports = {
  data: new SlashCommandBuilder()
  .setName('expense')
  .setDescription('Record a new expense')
  .addNumberOption(option =>
    option.setName('amount')
      .setDescription('The amount spent')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('description')
      .setDescription('What you spent money on')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('category')
      .setDescription('Expense category')
      .setRequired(true)
      .addChoices(
        { name: 'Makanan', value: 'Makanan' },
        { name: 'Transportasi', value: 'Transportasi' },
        { name: 'Hiburan', value: 'Hiburan' },
        { name: 'Belanja', value: 'Belanja' },
        { name: 'Lainnya', value: 'Lainnya' }
      ))
  .addStringOption(option =>
    option.setName('bank')
      .setDescription('Payment method')
      .setRequired(true)
      .addChoices(
        { name: 'TUNAI', value: 'TUNAI' },
        { name: 'BCA', value: 'BCA' },
        { name: 'Mandiri', value: 'Mandiri' },
        { name: 'BNI', value: 'BNI' }
      ))
  .addStringOption(option =>
    option.setName('transaction')
      .setDescription('Transaction type')
      .setRequired(false)
      .addChoices(
        { name: 'Cash', value: 'Cash' },
        { name: 'Transfer', value: 'Transfer' },
        { name: 'Card', value: 'Card' }
      ))
  .addStringOption(option =>
    option.setName('date')
      .setDescription('Date of expense (DD/MM/YYYY)')
      .setRequired(false)),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    // interaction.user is the object representing the User who ran the command
		// interaction.member is the GuildMember object, which represents the user in the specific guild
		try {
      const user = await User.findOne({
        where: { discordId: interaction.user.id }
      });

      if (!user) {
        return interaction.editReply(
          '❌ You need to register a sheet first with `/register`'
        );
      }

      const amount = interaction.options.getNumber('amount');
      const description = interaction.options.getString('description');
      const category = interaction.options.getString('category');
      const bank = interaction.options.getString('bank');
      const transaction = interaction.options.getString('transaction') || 'Cash';
      const date = interaction.options.getString('date');

      const expenseData = {
        amount,
        description,
        category,
        bank,
        transaction,
        date
      };

      const rowNumber = await addExpenseToSheet(expenseData, user.sheetId);

      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ Expense Recorded')
        .addFields(
          { name: 'Amount', value: `Rp ${amount.toLocaleString('id-ID')}`, inline: true },
          { name: 'Description', value: description, inline: true },
          { name: 'Category', value: category, inline: true },
          { name: 'Payment Method', value: `${bank} (${transaction})`, inline: true },
          { name: 'Location', value: `Sheet row ${rowNumber}`, inline: true }
        )
        .setFooter({ text: 'View your sheet: https://docs.google.com/spreadsheets/d/' + user.sheetId });
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error processing expense:', error);
      await await interaction.editReply({
        content: '❌ Failed to record expense. ' + 
                 (error.message.includes('permission') 
                  ? 'Please check if you shared your sheet with the bot.'
                  : 'Please try again later.'),
        flags: MessageFlags.Ephemeral
      });
    }
  }
}