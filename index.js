const { Client, Collection } = require("discord.js");
const client = new Client({ partials: ["REACTION", "MESSAGE", "CHANNEL"] });
const ReactionsModel = require("./models/reactionrole");
const glob = require("glob");
client.on("ready", () => {
  console.log(`${client.user.username} is now ready to make reaction roles!`);
});
const { token, mongo } = require("./config.json");
client.commands = new Collection();
const prefix = "r!";
const commandFiles = glob.sync("./commands/**/*.js");
for (const file of commandFiles) {
  const command = require(file);
  client.commands.set(command.name, command);
}
client.on("message", (message) => {
  if (message.channel.type === "dm") return;
  if (message.author.bot) return;

  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift();
  const command = client.commands.get(commandName);

  if (!command) return;
  if (command) {
    try {
      command.run(client, message, args);
    } catch (error) {
      message.channel.send(
        "An error has occured please contact the developer for this issue"
      );
      console.log(error);
    }
  }
});
const mongoose = require("mongoose");
mongoose.connect(mongo, {
  useFindAndModify: false,
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
client.on("messageReactionAdd", async (react, user) => {
  if (user.bot) return;
  const { guild } = react.message;
  if (!guild.me.hasPermission("MANAGE_MESSAGES")) return;
  if (!guild) return;
  const member = guild.members.cache.get(user.id);
  if (!member) return;

  const dbReaction = await ReactionsModel.findOne({
    guild_id: guild.id,
    message_id: react.message.id,
  });
  if (!dbReaction) return;
  const reaction = dbReaction.reactions.find(
    (r) => r.emoji === react.emoji.toString()
  );
  if (!reaction) return;

  if (!member.roles.cache.has(reaction.role_id)) {
    member.roles.add(reaction.role_id);
  } else {
    member.roles.remove(reaction.role_id);
  }

  let channel = guild.channels.cache.get(dbReaction.channel_id);
  if (!channel) return;

  const msg = await channel.messages.fetch(dbReaction.message_id);
  msg.reactions.resolve(react.emoji.toString()).users.remove(user.id);
});
client.login(token);
