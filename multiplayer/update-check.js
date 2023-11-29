// // Example update-check.js
// if ('serviceWorker' in navigator) {
//     navigator.serviceWorker.register('/service-worker.js').then(registration => {
//         registration.addEventListener('updatefound', () => {
//             const installingWorker = registration.installing;
//             installingWorker.addEventListener('statechange', () => {
//                 if (installingWorker.state === 'installed') {
//                     // A new service worker is installed
//                     navigator.serviceWorker.controller.postMessage({ action: 'skipWaiting' });
//                 }
//             });
//         });
//     });
// }
