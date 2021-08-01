import { DefineCommand } from "../utils/decorators/DefineCommand";
import { BaseCommand } from "../structures/BaseCommand";
import { createEmbed } from "../utils/createEmbed";
import { disableInviteCmd } from "../config";
import { IMessage } from "../../typings";

@DefineCommand({
    description: "Send the bot's invite link",
    disable: disableInviteCmd,
    name: "invita",
    usage: "{prefix}invita"
})
export class InviteCommand extends BaseCommand {
    public async execute(message: IMessage): Promise<void> {
        message.channel.send(
            createEmbed("info")
                .addField(`${this.client.user!.tag} - Link di invito`, `**[Clicca qui per invitare questo bot](${await this.client.generateInvite({ permissions: 53857345 })})**`)
        ).catch(e => this.client.logger.error("PLAY_CMD_ERR:", e));
    }
}
