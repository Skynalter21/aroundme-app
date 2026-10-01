import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { resolveMediaUrl } from "../services/config";
import { triggerImpact } from "../services/hapticsService";

export interface MessageData {
  id: string;
  userId?: string;
  nickname: string;
  district?: string | null;
  type?: "text" | "image" | "video";
  text?: string | null;
  mediaUrl?: string | null;
  distance?: number;
  latitude?: number;
  longitude?: number;
  s2Cell?: string | null;
  createdAt: string;
}

interface MessageCardProps {
  message: MessageData;
  currentUserId: string;
  onDelete: (message: MessageData) => void;
  onPressImage?: (url: string, sender: string) => void;
}

function VideoMessageItem({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });

  return (
    <View style={styles.videoWrapper}>
      <VideoView
        style={styles.video}
        player={player}
        nativeControls
        contentFit="cover"
      />
    </View>
  );
}

export default function MessageCard({
  message,
  currentUserId,
  onDelete,
  onPressImage,
}: MessageCardProps) {
  const isMine = message.userId === currentUserId;

  const resolvedUrl = useMemo(() => {
    return resolveMediaUrl(message.mediaUrl);
  }, [message.mediaUrl]);

  function formatMessageDate(dateString: string) {
    if (!dateString) return "";
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
      activeOpacity={0.85}
      onLongPress={() => {
        if (isMine) {
          triggerImpact("medium");
          onDelete(message);
        }
      }}
      style={[
        styles.wrapper,
        isMine ? styles.wrapperMine : styles.wrapperOther,
      ]}
    >
      {!isMine && (
        <View style={styles.senderRow}>
          <Text style={styles.sender}>{message.nickname}</Text>
          {message.district ? (
            <Text style={styles.districtBadge}>· 📍 {message.district}</Text>
          ) : null}
        </View>
      )}

      <View
        style={[
          styles.bubble,
          isMine ? styles.bubbleMine : styles.bubbleOther,
        ]}
      >
        {/* Renderização de Imagem com expo-image */}
        {message.type === "image" && resolvedUrl && (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onPressImage?.(resolvedUrl, message.nickname)}
            style={styles.mediaContainer}
          >
            <Image
              source={{ uri: resolvedUrl }}
              style={styles.image}
              contentFit="cover"
              transition={200}
            />
            <View style={styles.imageOverlayHint}>
              <Text style={styles.imageOverlayText}>🔍 Toque para ampliar</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Renderização de Vídeo com expo-video */}
        {message.type === "video" && resolvedUrl && (
          <VideoMessageItem uri={resolvedUrl} />
        )}

        {/* Texto da mensagem ou legenda */}
        {Boolean(message.text) && (
          <Text style={styles.messageText}>{message.text}</Text>
        )}

        {/* Rodapé do card: horário e distância */}
        <View style={styles.footerRow}>
          {!isMine && typeof message.distance === "number" && (
            <Text style={styles.distanceBadge}>
              📡 {message.distance.toFixed(1)} km
            </Text>
          )}
          <Text style={[styles.time, isMine ? styles.timeMine : styles.timeOther]}>
            {formatMessageDate(message.createdAt)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
    maxWidth: "85%",
  },
  wrapperMine: {
    alignSelf: "flex-end",
  },
  wrapperOther: {
    alignSelf: "flex-start",
  },
  senderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    marginLeft: 6,
    gap: 4,
  },
  sender: {
    color: "#93c5fd",
    fontSize: 12,
    fontWeight: "700",
  },
  districtBadge: {
    color: "#9ca3af",
    fontSize: 11,
  },
  bubble: {
    borderRadius: 20,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  bubbleMine: {
    backgroundColor: "#2563eb",
    borderTopRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: "#1f242d",
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#2d3748",
  },
  mediaContainer: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 6,
    position: "relative",
  },
  image: {
    width: 240,
    height: 240,
    backgroundColor: "#111827",
  },
  imageOverlayHint: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  imageOverlayText: {
    color: "#f3f4f6",
    fontSize: 10,
    fontWeight: "500",
  },
  videoWrapper: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 6,
    width: 240,
    height: 240,
    backgroundColor: "#000",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  messageText: {
    color: "#ffffff",
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
    gap: 8,
  },
  distanceBadge: {
    color: "#60a5fa",
    fontSize: 10,
    fontWeight: "600",
    backgroundColor: "rgba(37, 99, 235, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  time: {
    fontSize: 11,
  },
  timeMine: {
    color: "rgba(255, 255, 255, 0.75)",
  },
  timeOther: {
    color: "#9ca3af",
  },
});
