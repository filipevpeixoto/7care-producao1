export const config = {
  // Remove.bg API key for background removal
  removeBgApiKey: process.env.REMOVE_BG_API_KEY || 'YOUR_REMOVE_BG_API_KEY',
  
  // File upload settings
  upload: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'],
    uploadPath: 'uploads/',
  },
  
  // System settings
  system: {
    logoPath: '/uploads/system-logo.png',
    defaultLogoPath: '',
  }
};
