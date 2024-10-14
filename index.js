require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, getVoiceConnection } = require('@discordjs/voice');
const ytdl = require('ytdl-core');

// Création du client Discord avec les intentions appropriées
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// Quand le bot est prêt
client.once('ready', () => {
  console.log('Bot connecté et prêt à jouer des vidéos YouTube !');
});

// Commande pour jouer une vidéo YouTube dans un canal vocal
client.on('messageCreate', async message => {
  if (message.content.startsWith('!play')) {
    const args = message.content.split(' ');
    const url = args[1];

    // Vérifier que l'utilisateur est dans un canal vocal
    if (!message.member.voice.channel) {
      return message.reply('Tu dois être dans un canal vocal pour utiliser cette commande.');
    }

    // Vérifier que l'URL fournie est une URL YouTube valide
    if (!ytdl.validateURL(url)) {
      return message.reply('Tu dois fournir une URL YouTube valide.');
    }

    try {
      // Rejoindre le canal vocal de l'utilisateur
      const voiceChannel = message.member.voice.channel;
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
      });

      console.log('Connecté au canal vocal.');

      // Créer un player audio
      const player = createAudioPlayer();

      // Téléchargement du flux YouTube
      console.log('Téléchargement du flux audio à partir de YouTube...');
      const stream = ytdl(url, {
        filter: 'audioonly',
        highWaterMark: 1 << 25, // Forcer un gros tampon pour éviter les interruptions
        quality: 'highestaudio',
      });

      const resource = createAudioResource(stream);
      player.play(resource);
      connection.subscribe(player);

      // Gérer les événements du lecteur
      player.on(AudioPlayerStatus.Playing, () => {
        console.log('Lecture en cours...');
        message.channel.send(`🎶 Lecture de la vidéo : ${url}`);
      });

      player.on(AudioPlayerStatus.Idle, () => {
        console.log('Fin de la lecture.');
        // Vérifier que la connexion n'a pas déjà été détruite
        if (connection.state.status !== 'destroyed') {
          console.log('Déconnexion du canal vocal...');
          connection.destroy(); // Quitter le canal vocal lorsque la vidéo se termine
          message.channel.send('La lecture est terminée, je quitte le canal vocal.');
        }
      });

      player.on('error', error => {
        console.error('Erreur du lecteur audio:', error);
        if (connection.state.status !== 'destroyed') {
          connection.destroy();
        }
        message.channel.send('Une erreur est survenue lors de la lecture audio.');
      });

    } catch (error) {
      console.error('Erreur lors du streaming YouTube:', error);
      message.channel.send('Une erreur est survenue lors de la lecture de la vidéo YouTube.');
    }
  }

  // Commande pour arrêter la lecture et quitter le canal vocal
  if (message.content === '!stop') {
    const connection = getVoiceConnection(message.guild.id);
    if (connection) {
      connection.destroy();
      message.channel.send('Arrêt de la lecture et déconnexion du canal vocal.');
    } else {
      message.reply('Le bot n\'est connecté à aucun canal vocal.');
    }
  }
});

// Connexion du bot avec le token Discord
client.login(process.env.DISCORD_TOKEN);
