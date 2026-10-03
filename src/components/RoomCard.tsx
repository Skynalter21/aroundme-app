import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { triggerImpact } from "../services/hapticsService";
import { RoomData } from "../types/room";

interface RoomCardProps {
  room: RoomData;
  currentUserId: string;
  onPress: (room: RoomData) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  Geral: "💬",
  Resenha: "🎉",
  Esportes: "⚽",
  Eventos: "📅",
  Ajuda: "🤝",
  Games: "🎮",
};

export default function RoomCard({
  room,
  currentUserId,
  onPress,
}: RoomCardProps) {
  const isOwner = room.ownerId === currentUserId;
  const icon = CATEGORY_ICONS[room.category] || "💬";
  const roomRadius = room.radiusKm || 5;
  const isOutside = room.distance > roomRadius;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.card, isOutside && styles.cardOutside]}
      onPress={() => {
        triggerImpact("light");
        onPress(room);
      }}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Text style={styles.roomIcon}>{icon}</Text>
          <View style={styles.nameBlock}>
            <View style={styles.nameAndBadge}>
              <Text style={styles.roomName} numberOfLines={1}>
                {room.name}
              </Text>
              {isOwner && <Text style={styles.ownerBadge}>👑 Dono</Text>}
            </View>
            <View style={styles.subMetaRow}>
              <Text style={styles.categoryBadge}>{room.category}</Text>
              <Text style={styles.radiusScopeBadge}>📍 Raio {roomRadius} km</Text>
            </View>
          </View>
        </View>

        {room.isProtected && (
          <View style={styles.lockBadge}>
            <Text style={styles.lockIcon}>🔒</Text>
            <Text style={styles.lockText}>Com senha</Text>
          </View>
        )}
      </View>

      {Boolean(room.description) && (
        <Text style={styles.description} numberOfLines={2}>
          {room.description}
        </Text>
      )}

      <View style={styles.footerRow}>
        <View style={styles.locationBlock}>
          <Text style={[styles.locationText, isOutside && styles.locationTextOutside]} numberOfLines={1}>
            {isOutside ? "🚫 Fora de alcance" : "📍"} {room.district || "Próximo"} ·{" "}
            {room.distance === 0
              ? "Aqui com você"
              : `${room.distance.toFixed(1)} km`}
          </Text>
        </View>

        <View style={styles.rightFooter}>
          <View style={styles.membersBadge}>
            <Text style={styles.membersText}>
              👥 {room.membersCount}/{room.maxMembers}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.enterButton, isOutside && styles.enterButtonOutside]}
            onPress={() => {
              triggerImpact("medium");
              onPress(room);
            }}
          >
            <Text style={[styles.enterButtonText, isOutside && styles.enterButtonTextOutside]}>
              {isOutside ? "🔒 Fora do raio" : "Entrar"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#161b22",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#30363d",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  roomIcon: {
    fontSize: 26,
    marginRight: 10,
  },
  nameBlock: {
    flex: 1,
  },
  nameAndBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  roomName: {
    color: "#f0f6fc",
    fontSize: 16,
    fontWeight: "700",
    flexShrink: 1,
  },
  ownerBadge: {
    backgroundColor: "#3b2d10",
    color: "#f59e0b",
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#f59e0b55",
  },
  categoryBadge: {
    color: "#8b949e",
    fontSize: 12,
    fontWeight: "500",
  },
  subMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  radiusScopeBadge: {
    color: "#38bdf8",
    fontSize: 11,
    fontWeight: "600",
    backgroundColor: "#0369a122",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  lockBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#21262d",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#30363d",
    gap: 4,
  },
  lockIcon: {
    fontSize: 11,
  },
  lockText: {
    color: "#9ca3af",
    fontSize: 11,
    fontWeight: "600",
  },
  description: {
    color: "#c9d1d9",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#21262d",
    paddingTop: 10,
    marginTop: 4,
  },
  locationBlock: {
    flex: 1,
    marginRight: 8,
  },
  locationText: {
    color: "#8b949e",
    fontSize: 12,
  },
  rightFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  membersBadge: {
    backgroundColor: "#0d1117",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#30363d",
  },
  membersText: {
    color: "#58a6ff",
    fontSize: 11,
    fontWeight: "600",
  },
  cardOutside: {
    borderColor: "#30363d88",
    opacity: 0.85,
  },
  locationTextOutside: {
    color: "#f87171",
    fontWeight: "600",
  },
  enterButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  enterButtonOutside: {
    backgroundColor: "#21262d",
    borderWidth: 1,
    borderColor: "#374151",
  },
  enterButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  enterButtonTextOutside: {
    color: "#9ca3af",
  },
});
