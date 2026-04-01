import axios from "axios";
import { getSomethingXUrl } from "../config/redirectUrls";

const getHomeApiBaseUrl = () => {
  const base = getSomethingXUrl().replace(/\/$/, "");
  return `${base}/api`;
};

const homeApiClient = axios.create({
  baseURL: getHomeApiBaseUrl(),
  timeout: 15000,
});

homeApiClient.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("token") || localStorage.getItem("somethingx_auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default homeApiClient;
