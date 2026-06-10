import axios from 'axios';

const api = axios.create({
  baseURL: 'https://cletaeatsjk.up.railway.app',
  headers: {
    'Content-Type': 'application/json'
  }
});

export default api;