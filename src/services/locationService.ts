import * as Location from "expo-location";

export interface LocationResult {
  location: {
    latitude: number;
    longitude: number;
  };
  address: {
    city: string;
    district: string;
    region: string;
  };
}

function getDefaultLocation(): Location.LocationObject {
  return {
    coords: {
      latitude: -18.9186,
      longitude: -48.2772,
      altitude: null,
      accuracy: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: Date.now(),
  };
}

export async function getUserCurrentLocation(): Promise<LocationResult> {
  let hasPermission = false;

  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    hasPermission = status === "granted";
  } catch (err) {
    console.log("Erro ao pedir permissão de GPS:", err);
  }

  let currentLocation: Location.LocationObject;

  if (hasPermission) {
    try {
      currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
    } catch (error) {
      console.log("GPS indisponível, usando coordenadas padrão");
      currentLocation = getDefaultLocation();
    }
  } else {
    console.log("Sem permissão ou rodando na Web, usando localização padrão");
    currentLocation = getDefaultLocation();
  }

  const coords = {
    latitude: currentLocation.coords.latitude,
    longitude: currentLocation.coords.longitude,
  };

  let address = {
    city: "",
    district: "Local próximo",
    region: "",
  };

  try {
    const geo = await Location.reverseGeocodeAsync(coords);
    if (geo && geo.length > 0) {
      const place = geo[0];
      address = {
        city: place.city || place.subregion || "",
        district: place.district || place.name || "Local próximo",
        region: place.region || "",
      };
    }
  } catch (err) {
    console.log("Reverse geocode indisponível:", err);
  }

  return {
    location: coords,
    address,
  };
}
