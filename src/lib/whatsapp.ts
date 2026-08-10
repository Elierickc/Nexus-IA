export function openWhatsAppLink(rawPhone: string, message: string) {
  const phone = (rawPhone || '').replace(/\D/g, '');
  const encoded = encodeURIComponent((message || '').trim());
  const url = `https://wa.me/${phone}?text=${encoded}`;
  console.log('[WhatsApp] Abrindo URL:', url);
  window.open(url, '_blank');
}
