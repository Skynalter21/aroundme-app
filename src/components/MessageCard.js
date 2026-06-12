import { VideoView, useVideoPlayer } from "expo-video";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

function VideoMessage({ uri }) {
  const player = useVideoPlayer(uri, (player) => {
    player.loop = false;
  });

  return <VideoView style={styles.video} player={player} allowsFullscreen />;
}

export default function MessageCard({ message, currentUserId, onDelete }) {
  const isMine = message.userId === currentUserId;

  function formatMessageDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();

    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffMinutes < 1) return "Agora";
    if (diffMinutes < 60) return `${diffMinutes} min`;

    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onLongPress={() => {
        if (isMine) onDelete(message);
      }}
      style={[
        styles.wrapper,
        isMine ? styles.wrapperMine : styles.wrapperOther,
      ]}
    >
      {!isMine && (
        <Text style={styles.sender}>
          {message.nickname} · 📍 {message.district}
        </Text>
      )}

      <View
        style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}
      >
        {message.type === "image" && message.mediaUrl && (
          <Image source={{ uri: message.mediaUrl }} style={styles.image} />
        )}

        {message.type === "video" && message.mediaUrl && (
          <VideoMessage uri={message.mediaUrl} />
        )}

        {message.text && <Text style={styles.messageText}>{message.text}</Text>}

        <Text style={styles.time}>
          {formatMessageDate(message.createdAt)}
          {!isMine && ` · ${message.distance} km`}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
    maxWidth: "82%",
  },
  wrapperMine: {
    alignSelf: "flex-end",
  },
  wrapperOther: {
    alignSelf: "flex-start",
  },
  sender: {
    color: "#888",
    fontSize: 12,
    marginBottom: 4,
    marginLeft: 4,
  },
  bubble: {
    borderRadius: 18,
    padding: 8,
  },
  bubbleMine: {
    backgroundColor: "#2563eb",
    borderTopRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: "#1f1f1f",
    borderTopLeftRadius: 4,
  },
  messageText: {
    color: "#fff",
    fontSize: 15,
    lineHeight: 21,
    padding: 4,
  },
  image: {
    width: 220,
    height: 220,
    borderRadius: 14,
    marginBottom: 6,
  },
  video: {
    width: 220,
    height: 220,
    borderRadius: 14,
    marginBottom: 6,
  },
  time: {
    color: "#cfcfcf",
    fontSize: 11,
    marginTop: 6,
    alignSelf: "flex-end",
  },
});
