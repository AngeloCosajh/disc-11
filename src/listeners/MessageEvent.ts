import { DefineListener } from "../utils/decorators/DefineListener";
import { BaseListener } from "../structures/BaseListener";
import { createEmbed } from "../utils/createEmbed";
import { IMessage } from "../../typings";
import { User } from "discord.js";

@DefineListener("message")
export class MessageEvent extends BaseListener {
    public async execute(message: IMessage): Promise<any> {
        if (message.author.bot || message.channel.type !== "text") return message;

        if (message.content.toLowerCase().startsWith(this.client.config.prefix)) return this.client.commands.handle(message);

        if ((await this.getUserFromMention(message.content))?.id === message.client.user?.id) {
            return message.channel.send(
                createEmbed("info", `👋 Ciao, il mio nome è **${this.client.user!.username}** un semplice bot musicale Discord, usa **\`${this.client.config.prefix}help\`** per dare un'occhiata ai miei comandi`)
            );
        }
    }

    private getUserFromMention(mention: string): Promise<User | undefined> {
        const matches = /^<@!?(\d+)>$/.exec(mention);
        if (!matches) return Promise.resolve(undefined);

        const id = matches[1];
        return this.client.users.fetch(id);
    }
}
