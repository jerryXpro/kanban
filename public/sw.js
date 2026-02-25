// Service Worker - Minimal version, no aggressive caching
// This file intentionally left simple to prevent stale JS bundles from being served.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
// No caching - all requests go directly to network
