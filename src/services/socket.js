import { io } from "socket.io-client";
import { getBaseUrl } from "./config";

const socket = io(getBaseUrl(), {
  transports: ["websocket"],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

export default socket;
