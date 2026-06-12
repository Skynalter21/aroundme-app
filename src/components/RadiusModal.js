import Slider from "@react-native-community/slider";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function RadiusModal({
  visible,
  radius,
  onSelectRadius,
  onClose,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Escolha o raio</Text>

          <Text style={styles.radiusText}>{radius} km</Text>

          <Slider
            minimumValue={1}
            maximumValue={50}
            step={1}
            value={radius}
            onValueChange={onSelectRadius}
            minimumTrackTintColor="#2563eb"
            maximumTrackTintColor="#333"
            thumbTintColor="#2563eb"
          />

          <View style={styles.labels}>
            <Text style={styles.label}>1 km</Text>
            <Text style={styles.label}>50 km</Text>
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>Confirmar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    padding: 24,
  },
  modal: {
    backgroundColor: "#171717",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
  },
  radiusText: {
    color: "#60a5fa",
    fontSize: 34,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
  },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  label: {
    color: "#777",
  },
  closeButton: {
    backgroundColor: "#2563eb",
    marginTop: 22,
    padding: 14,
    borderRadius: 12,
  },
  closeText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
  },
});