module.exports = async(client, invite) => {
    const resolvedInvite = await client.db.invites.findOne({
        inviteID: invite.code
    });
    if (!resolvedInvite) {
        if (!invite.inviterId) return;
        if (!invite.inviter) return;
        let fake = false;
        const { createdTimestamp } = invite.inviter;
        if ((Date.now() - createdTimestamp) < client.config.fakeTimeoutMs) fake = true;
        const data = new client.db.invites({
            code: invite.code,
            authorId: invite.inviterId,
            guildId: invite.guild.id,
            fake,
            rawUses: invite.uses,
        });
        await data.save();
    } else {
        await client.db.invites.findOneAndUpdate({
            code: invite.code
        }, {
            code: invite.code,
            rawUses: invite.uses
        });
    }
};