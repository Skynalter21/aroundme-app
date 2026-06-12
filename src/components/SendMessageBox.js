import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function SendMessageBox({
  value,
  onChangeText,
  onSend,
  onPickMedia,
}) {
  return (
    <View style={styles.box}>
      <TouchableOpacity style={styles.mediaButton} onPress={onPickMedia}>
        <Text style={styles.mediaButtonText}>📎</Text>
      </TouchableOpacity>

      <TextInput
        placeholder="Digite uma mensagem..."
        placeholderTextColor="#777"
        value={value}
        onChangeText={onChangeText}
        style={styles.input}
        multiline
      />

      <TouchableOpacity style={styles.sendButton} onPress={onSend}>
        <Text style={styles.sendButtonText}>➤</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: "#1a1a1a",
    borderRadius: 999,
    padding: 8,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mediaButton: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  mediaButtonText: {
    fontSize: 22,
  },
  input: {
    flex: 1,
    color: "#fff",
    maxHeight: 90,
  },
  sendButton: {
    backgroundColor: "#2563eb",
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
});
