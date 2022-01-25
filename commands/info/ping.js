exports.run = async(client, message, args) => {
    const pingMessage = await message.channel.send(`Loading...`);
    const ping = pingMessage.createdTimestamp - message.createdTimestamp;
    return pingMessage.edit(`Response time: ${ping}ms, Discord Gateway Ping: ${Math.round(client.ws.ping)}ms`);
};
exports.help = {
    name: "ping",
    description: "Ping the bot",
    usage: ["ping"],
    example: ["ping"]
};

exports.conf = {
    aliases: [],
    cooldown: 2,
};