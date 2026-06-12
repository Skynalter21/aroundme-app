import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const radiusOptions = [1, 5, 10, 25, 50];

export default function RadiusSelector({ radius, onChangeRadius }) {
  return (
    <View style={styles.container}>
      {radiusOptions.map((option) => (
        <TouchableOpacity
          key={option}
          style={[
            styles.button,
            radius === option && styles.buttonActive,
          ]}
          onPress={() => onChangeRadius(option)}
        >
          <Text
            style={[
              styles.text,
              radius === option && styles.textActive,
            ]}
          >
            {option} km
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#1a1a1a",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  buttonActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  text: {
    color: "#aaa",
    fontWeight: "bold",
  },
  textActive: {
    color: "#fff",
  },
});