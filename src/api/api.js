import axios from 'axios';

const api = axios.create({
  baseURL: 'https://cletaeats-backend-kprs.onrender.com',
  headers: {
    'Content-Type': 'application/json'
  }
});

export default api;