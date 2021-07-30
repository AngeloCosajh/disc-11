/* eslint-disable sort-keys */
import { isUserInTheVoiceChannel, isMusicPlaying, isSameVoiceChannel } from "../utils/decorators/MusicHelper";
import { DefineCommand } from "../utils/decorators/DefineCommand";
import { BaseCommand } from "../structures/BaseCommand";
import { createEmbed } from "../utils/createEmbed";
import { IMessage } from "../../typings";

@DefineCommand({
    aliases: ["loop", "music-repeat", "music-loop"],
    description: "Repeat current music or the queue",
    name: "ripeti",
    usage: "{prefix}ripeti [all | one | disable]"
})
export class RepeatCommand extends BaseCommand {
    @isUserInTheVoiceChannel()
    @isMusicPlaying()
    @isSameVoiceChannel()
    public execute(message: IMessage, args: string[]): any {
        const modes: Record<any, 0 | 1 | 2> = {
            // Repeat All Music in Queue
            all: 2,
            queue: 2,
            "*": 2,
            2: 2,
            // Repeat current music
            current: 1,
            this: 1,
            one: 1,
            music: 1,
            1: 1,
            // Disable repeat
            disable: 0,
            none: 0,
            off: 0,
            0: 0
        };
        const modeTypes = ["OFF", "ONE", "ALL"];
        const modeEmoji = ["▶", "🔂", "🔁"];
        const mode = args[0] as string | undefined;
        if (mode === undefined) {
            message.channel.send(createEmbed("info", `${modeEmoji[message.guild!.queue!.loopMode]} **|** La modalità di ripetizione corrente è impostata su **\`${modeTypes[message.guild!.queue!.loopMode]}\`**`))
                .catch(e => this.client.logger.error("REPEAT_CMD_ERR:", e));
        } else if (Object.keys(modes).includes(mode)) {
            message.guild!.queue!.loopMode = modes[mode];
            message.channel.send(createEmbed("info", `${modeEmoji[message.guild!.queue!.loopMode]} **|** La modalità di ripetizione è stata impostata su **\`${modeTypes[message.guild!.queue!.loopMode]}\`**`))
                .catch(e => this.client.logger.error("REPEAT_CMD_ERR:", e));
        } else {
            message.channel.send(createEmbed("error", `Utilizzo non valido, usa **\`${this.client.config.prefix}help ${this.meta.name}\`** per ottenere informazioni`))
                .catch(e => this.client.logger.error("REPEAT_CMD_ERR:", e));
        }
    }
}
