import axios from "axios";

const axiosInstance = axios.create({
  baseURL:
    "https://api-inference.huggingface.co/models/ginpham614/wav2vec2-large-xlsr-53-demo-colab",
  validateStatus: (status) => true,
});

export default axiosInstance;
