import * as Location from "expo-location";

export async function getUserCurrentLocation() {
  console.log("1 - Pedindo permissão");

  const { status } = await Location.requestForegroundPermissionsAsync();

  console.log("2 - Status:", status);

  if (status !== "granted") {
    throw new Error("LOCATION_PERMISSION_DENIED");
  }

  console.log("3 - Buscando GPS");

  let currentLocation;

  try {
    currentLocation = await Location.getCurrentPositionAsync({});
  } catch (error) {
    console.log("GPS indisponível, usando fallback Uberlândia");

    currentLocation = {
      coords: {
        latitude: -18.9186,
        longitude: -48.2772,
      },
    };
  }

  console.log("4 - GPS:", currentLocation);

  return {
    location: {
      latitude: currentLocation.coords.latitude,
      longitude: currentLocation.coords.longitude,
    },
    address: {
      city: "",
      district: "Local próximo",
      region: "",
    },
  };
}
