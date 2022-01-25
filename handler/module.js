const fs = require('fs')

module.exports = async client => {
    fs.readdir("./commands/", (err, categories) => {
        if (err) console.error(err);
        console.log(`Found total ${categories.length} categories.`);
        categories.forEach(category => {
            let moduleConf = require(`../commands/${category}/module.json`);
            if (!moduleConf) return;
            moduleConf.path = `./commands/${category}`;
            moduleConf.cmds = [];
            client.helps.set(moduleConf.name, moduleConf);

            fs.readdir(`./commands/${category}`, (err, files) => {
                console.log(`Found total ${files.length - 1} command(s) from ${category}.`);
                if (err) console.log(err);
                files.forEach(file => {
                    if (!file.endsWith(".js")) return;
                    let prop = sync.require(`../commands/${category}/${file}`);
                    client.commands.set(prop.help.name, prop);
                    prop.conf.aliases.forEach(alias => {
                        client.aliases.set(alias, prop.help.name);
                    });
                    client.helps.get(moduleConf.name).cmds.push({ name: prop.help.name, desc: prop.help.description });
                });
            });
        })
    });
};