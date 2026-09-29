import axios from "axios";
import { getBaseUrl } from "./config";

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 15000,
});

export default api;
