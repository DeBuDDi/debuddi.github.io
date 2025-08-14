// --- HTTD Images Integration ---
// This script will fetch all images from the GitHub folder and inject them as selectable thumbnails for the lineup builder.

const HTTD_IMAGE_PATH = "https://raw.githubusercontent.com/DeBuDDi/debuddi.github.io/d005673a24dfdbef5400400c1b4793a520a9dd9b/httd/";
let httdImages = [];

// List all image filenames here (add new images as needed):
const httdImageFiles = [
  "1.png",
  "2.png",
  "3.png",
  "4.png",
  "5.png",
  "6.png",
  "7.png",
  "8.png",
  "9.png",
  "10.png",
  // Add more if needed, e.g. "11.png"
];

// Preload HTTD images and add to uploadedImages list if not already present
function loadHTTDImages() {
  httdImages = httdImageFiles.map(filename => HTTD_IMAGE_PATH + filename);
  // Only add if not already present in uploadedImages
  httdImages.forEach(src => {
    if (!uploadedImages.includes(src)) {
      uploadedImages.push(src);
    }
  });
  renderUploaded();
  saveState();
}

// Optionally, you can call loadHTTDImages() on initial load or when user selects an empty slot
// For best UX, auto-load on startup:
window.addEventListener('DOMContentLoaded', function() {
  loadHTTDImages();
});

// If you want images to show only when empty slot selected, use this alternative:
// document.querySelectorAll('.drop-slot').forEach(slot => {
//   slot.addEventListener('click', function(e) {
//     const slotKey = slot.dataset.slot;
//     if (!slotImages[slotKey]) {
//       loadHTTDImages();
//     }
//   });
// });

// The rest of your code remains unchanged.
// This will make all HTTD characters available for drag/drop and assignment to lineup slots!
