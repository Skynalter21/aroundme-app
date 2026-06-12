import { StyleSheet, Text, View } from "react-native";

export default function LocationBox({ location, address, radius }) {
  return (
    <View style={styles.box}>
      <Text style={styles.title}>Sua localização</Text>

      {location ? (
        <>
          <Text style={styles.text}>📍 {address.district}</Text>

          <Text style={styles.text}>
            {address.city} - {address.region}
          </Text>

          <Text style={styles.text}>Raio escolhido: {radius} km</Text>
        </>
      ) : (
        <Text style={styles.text}>Localização ainda não encontrada.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  text: {
    color: "#aaa",
    marginBottom: 5,
  },
});