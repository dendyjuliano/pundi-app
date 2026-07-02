export const WHATSAPP_NUMBER = "6287797824107";

const WHATSAPP_DEFAULT_MESSAGE =
  "Halo, saya mau tanya soal penggunaan aplikasi Pundi.";

export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  WHATSAPP_DEFAULT_MESSAGE
)}`;
