import Slider from "@react-native-community/slider";
import React, { useMemo } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

interface RadiusModalProps {
  visible: boolean;
  radius: number;
  onSelectRadius: (radius: number) => void;
  onClose: () => void;
  totalMessagesCount?: number;
}

const PRESET_OPTIONS = [
  { label: "1 km", value: 1, desc: "Vizinhos" },
  { label: "5 km", value: 5, desc: "Bairro" },
  { label: "10 km", value: 10, desc: "Região" },
  { label: "25 km", value: 25, desc: "Cidade" },
  { label: "50 km", value: 50, desc: "Metrópole" },
];

export default function RadiusModal({
  visible,
  radius,
  onSelectRadius,
  onClose,
  totalMessagesCount,
}: RadiusModalProps) {
  const scopeDescription = useMemo(() => {
    if (radius <= 2) return "🚶 Raio a pé · Vizinhos e quarteirão";
    if (radius <= 5) return "🚲 Raio de bairro · Ruas próximas";
    if (radius <= 15) return "🚗 Raio da região · Bairros vizinhos";
    if (radius <= 30) return "🏙️ Raio municipal · Cidade";
    return "🗺️ Amplo alcance metropolitano";
  }, [radius]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modal}>
              {/* Radar visual estilo Tinder */}
              <View style={styles.radarContainer}>
                <View style={[styles.radarRing, styles.radarRing3]}>
                  <View style={[styles.radarRing, styles.radarRing2]}>
                    <View style={[styles.radarRing, styles.radarRing1]}>
                      <View style={styles.radarCenter}>
                        <Text style={styles.radarIcon}>📡</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              <Text style={styles.title}>Raio de Descoberta</Text>
              <Text style={styles.subtitle}>
                Mostrando mensagens e pessoas próximas a você
              </Text>

              {/* Valor do Raio em Destaque */}
              <View style={styles.radiusDisplay}>
                <Text style={styles.radiusNumber}>{radius}</Text>
                <Text style={styles.radiusUnit}>km</Text>
              </View>

              <Text style={styles.scopeDesc}>{scopeDescription}</Text>

              {/* Slider fluído */}
              <View style={styles.sliderContainer}>
                <Slider
                  minimumValue={1}
                  maximumValue={50}
                  step={1}
                  value={radius}
                  onValueChange={onSelectRadius}
                  minimumTrackTintColor="#2563eb"
                  maximumTrackTintColor="#374151"
                  thumbTintColor="#3b82f6"
                />
                <View style={styles.sliderLabels}>
                  <Text style={styles.sliderLabelText}>1 km</Text>
                  <Text style={styles.sliderLabelText}>25 km</Text>
                  <Text style={styles.sliderLabelText}>50 km</Text>
                </View>
              </View>

              {/* Atalhos Rápidos */}
              <View style={styles.presetsRow}>
                {PRESET_OPTIONS.map((item) => {
                  const isActive = radius === item.value;
                  return (
                    <TouchableOpacity
                      key={item.value}
                      style={[
                        styles.presetChip,
                        isActive && styles.presetChipActive,
                      ]}
                      onPress={() => onSelectRadius(item.value)}
                    >
                      <Text
                        style={[
                          styles.presetChipText,
                          isActive && styles.presetChipTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {typeof totalMessagesCount === "number" && (
                <Text style={styles.countText}>
                  💬 {totalMessagesCount} {totalMessagesCount === 1 ? "mensagem encontrada" : "mensagens encontradas"} neste raio
                </Text>
              )}

              {/* Botão de Fechar / Confirmar */}
              <TouchableOpacity style={styles.confirmButton} onPress={onClose}>
                <Text style={styles.confirmText}>Confirmar Raio</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: "#161b22",
    borderRadius: 28,
    padding: 24,
    width: "100%",
    maxWidth: 380,
    borderWidth: 1,
    borderColor: "#30363d",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  radarContainer: {
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  radarRing: {
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
  },
  radarRing3: {
    width: 120,
    height: 120,
    borderColor: "rgba(37, 99, 235, 0.15)",
    backgroundColor: "rgba(37, 99, 235, 0.04)",
  },
  radarRing2: {
    width: 88,
    height: 88,
    borderColor: "rgba(37, 99, 235, 0.3)",
    backgroundColor: "rgba(37, 99, 235, 0.08)",
  },
  radarRing1: {
    width: 58,
    height: 58,
    borderColor: "rgba(37, 99, 235, 0.5)",
    backgroundColor: "rgba(37, 99, 235, 0.15)",
  },
  radarCenter: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
  },
  radarIcon: {
    fontSize: 16,
  },
  title: {
    color: "#f0f6fc",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: {
    color: "#8b949e",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  radiusDisplay: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
  },
  radiusNumber: {
    color: "#60a5fa",
    fontSize: 44,
    fontWeight: "bold",
  },
  radiusUnit: {
    color: "#93c5fd",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 6,
  },
  scopeDesc: {
    color: "#e2e8f0",
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
    marginBottom: 20,
  },
  sliderContainer: {
    width: "100%",
    marginBottom: 16,
  },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    marginTop: 4,
  },
  sliderLabelText: {
    color: "#6b7280",
    fontSize: 11,
  },
  presetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
    width: "100%",
  },
  presetChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#21262d",
    borderWidth: 1,
    borderColor: "#30363d",
  },
  presetChipActive: {
    backgroundColor: "#2563eb",
    borderColor: "#3b82f6",
  },
  presetChipText: {
    color: "#9ca3af",
    fontSize: 12,
    fontWeight: "600",
  },
  presetChipTextActive: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  countText: {
    color: "#9ca3af",
    fontSize: 12,
    marginBottom: 16,
  },
  confirmButton: {
    backgroundColor: "#2563eb",
    width: "100%",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "bold",
  },
});
