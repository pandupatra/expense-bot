const { Client, Events, GatewayIntentBits, Collection, MessageFlags, EmbedBuilder, REST, Routes } = require('discord.js');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const { initializeGoogleAuth } = require('./utils/googleAuth');
const Sequelize = require('sequelize');
const { initializeDatabase } = require('./utils/database');

// Discord bot setup
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

// // Construct and prepare an instance of the REST module
// const rest = new REST().setToken(token);

// (async () => {
// 	try {
// 		console.log(`Started refreshing ${client.commands.length} application (/) commands.`);

// 		// The put method is used to fully refresh all commands in the guild with the current set
// 		const data = await rest.put(
// 			Routes.applicationGuildCommands(clientId, guildId),
// 			{ body: client.commands },
// 		);

// 		console.log(`Successfully reloaded ${data.length} application (/) commands.`);
// 	} catch (error) {
// 		// And of course, make sure you catch and log any errors!
// 		console.error(error);
// 	}
// })();

// Google Sheets setup
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

// Verify credentials file exists
if (!fs.existsSync(CREDENTIALS_PATH)) {
  console.error('Credentials file not found at:', CREDENTIALS_PATH);
  console.error('Please download your service account credentials from Google Cloud Console');
  console.error('and save them as credentials.json in your project root.');
  process.exit(1);
}

// Register slash commands
// async function registerCommands() {
//   const commands = [expenseCommand];
  
//   // Note: In production, you'd only register commands once
//   // This is for development/testing purposes
//   await client.application?.commands.set(commands);
//   console.log('Slash commands registered');
// }

// Discord bot events
client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
	initializeDatabase().catch(console.error);
  initializeGoogleAuth().catch(console.error);
});

// client.on(Events.InteractionCreate, async interaction => {
//   if (!interaction.isChatInputCommand()) return;

// 	const command = interaction.client.commands.get(interaction.commandName);

// 	if (!command) {
// 		console.error(`No command matching ${interaction.commandName} was found.`);
// 		return;
// 	}

// 	try {
// 		await command.execute(interaction);
// 	} catch (error) {
// 		console.error(error);
// 		if (interaction.replied || interaction.deferred) {
// 			await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
// 		} else {
// 			await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
// 		}
// 	}
// });

// Start the bot
client.login(config.token);