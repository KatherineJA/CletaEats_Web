import axios from 'axios';

const api = axios.create({
  baseURL: 'https://cletaeats-backend-rgn1.onrender.com/',
  headers: {
    'Content-Type': 'application/json'
  }
});

export default api;