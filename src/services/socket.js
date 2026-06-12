import { io } from "socket.io-client";

const socket = io("http://10.0.2.2:3333", {
  transports: ["websocket"],
});

export default socket;
