// vite.config.js
export default {
  server: {
    // Listen on all network interfaces
    host: '0.0.0.0',
    // Use the default port
    port: 5173,
    // Show the local network IP in the terminal
    open: false,
    // Allow connections from any origin
    cors: true,
    // Display the network URLs in the terminal
    hmr: {
      // Needed for HMR to work properly on other devices
      clientPort: 5173
    }
  }
};
