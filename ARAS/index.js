const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
require('dotenv').config();

// Bot configuration
const CONFIG = require('./config.json');
const BAN_LIST_FILE = 'aras_Users.json';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

let bannedUsers = new Set();

// Load the banned users list from the file (if it exists)
if (fs.existsSync(BAN_LIST_FILE)) {
    try {
        const data = fs.readFileSync(BAN_LIST_FILE, 'utf8');
        bannedUsers = new Set(JSON.parse(data));
        console.log(`Loaded ${bannedUsers.size} banned users from file.`);
    } catch (error) {
        console.error("Error loading banned users list:", error);
    }
} else {
    console.warn(`Warning: ${BAN_LIST_FILE} not found. Creating a new one...`);
    fs.writeFileSync(BAN_LIST_FILE, '[]', 'utf8');
}

// Event: Bot is ready
client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}. Monitoring servers for banned users...`);
    startAutoBanCheck();
});

// Function to check for banned users every 5 seconds
function startAutoBanCheck() {
    setInterval(async () => {
        for (const guild of client.guilds.cache.values()) {
            try {
                const members = await guild.members.fetch();
                
                for (const member of members.values()) {
                    if (bannedUsers.has(member.id)) {
                        console.log(`⚠️ Detected banned user: ${member.user.tag} (${member.id}) in ${guild.name}`);
                        
                        try {
                            await member.ban({ reason: 'User is in the global ban list.' });
                            console.log(`✅ Successfully banned ${member.user.tag} from ${guild.name}`);
                        } catch (banError) {
                            console.error(`❌ Failed to ban ${member.user.tag} in ${guild.name}:`, banError);
                        }
                    }
                }
            } catch (fetchError) {
                console.error(`❌ Failed to fetch members in ${guild.name}:`, fetchError);
            }
        }
    }, 5000); // Check every 5 seconds
}

// Log in to Discord
client.login(CONFIG.token).catch(err => {
    console.error("❌ Failed to login. Check your bot token:", err);
});
