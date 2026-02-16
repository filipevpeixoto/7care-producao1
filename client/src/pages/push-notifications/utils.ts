export const getDeviceInfo = (userAgent: string) => {
  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    return { icon: '📱', name: 'iOS' };
  }
  if (userAgent.includes('Android')) return { icon: '📱', name: 'Android' };
  if (userAgent.includes('Windows')) return { icon: '💻', name: 'Windows' };
  if (userAgent.includes('Macintosh') || userAgent.includes('Mac OS')) {
    return { icon: '💻', name: 'macOS' };
  }
  if (userAgent.includes('Linux')) return { icon: '💻', name: 'Linux' };
  if (userAgent.includes('Chrome')) return { icon: '🌐', name: 'Chrome' };
  if (userAgent.includes('Safari')) return { icon: '🌐', name: 'Safari' };
  if (userAgent.includes('Firefox')) return { icon: '🌐', name: 'Firefox' };
  if (userAgent.includes('Edge')) return { icon: '🌐', name: 'Edge' };
  return { icon: '📱', name: 'Dispositivo' };
};
