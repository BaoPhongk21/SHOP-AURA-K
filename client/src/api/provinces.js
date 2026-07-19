import axios from 'axios';

const API_BASE = 'https://provinces.open-api.vn/api';

export const getProvinces = async () => {
  try {
    const response = await axios.get(`${API_BASE}/p/`);
    return response.data;
  } catch (error) {
    console.error("Error fetching provinces:", error);
    return [];
  }
};

export const getDistricts = async (provinceCode) => {
  try {
    const response = await axios.get(`${API_BASE}/p/${provinceCode}?depth=2`);
    return response.data.districts || [];
  } catch (error) {
    console.error("Error fetching districts:", error);
    return [];
  }
};

export const getWards = async (districtCode) => {
  try {
    const response = await axios.get(`${API_BASE}/d/${districtCode}?depth=2`);
    return response.data.wards || [];
  } catch (error) {
    console.error("Error fetching wards:", error);
    return [];
  }
};

export default {
  getProvinces,
  getDistricts,
  getWards
};

