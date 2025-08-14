// --- HTTD Images Integration ---
// This script will fetch all images from the GitHub folder and inject them as selectable thumbnails WHEN an empty slot is selected.

const HTTD_IMAGE_PATH = "https://raw.githubusercontent.com/DeBuDDi/debuddi.github.io/d005673a24dfdbef5400400c1b4793a520a9dd9b/httd/";
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

let httdImages = httdImageFiles.map(filename => HTTD_IMAGE_PATH + filename);
let showingHTTD = false;

// Only show HTTD images when empty slot is selected
function showHTTDImages() {
  showingHTTD = true;
  renderHTTDOnly();
}

function hideHTTDImages() {
  showingHTTD = false;
  renderUploaded();
}

// Render only HTTD images in upload-list (don't affect uploadedImages array)
function renderHTTDOnly() {
  const list = document.getElementById('upload-list');
  list.innerHTML = '';
  httdImages.forEach((src, i) => {
    let img = document.createElement('img');
    img.src = src;
    img.className = 'upload-thumb';
    img.draggable = true;
    img.ondragstart = () => currentDragIndex = 'httd_' + i;
    img.title = 'Drag to lineup';

    // Touch support: select for assignment
    img.addEventListener('touchstart', function(e) {
      e.preventDefault();
      selectedUploadIndex = 'httd_' + i;
      renderHTTDOnly();
    });

    // Desktop: click to select also
    img.addEventListener('click', function(e) {
      selectedUploadIndex = 'httd_' + i;
      renderHTTDOnly();
    });

    list.appendChild(img);
  });
}

document.querySelectorAll('.drop-slot').forEach(slot => {
  slot.addEventListener('click', function(e) {
    const slotKey = slot.dataset.slot;
    // If slot is empty, show HTTD images
    if (!slotImages[slotKey]) {
      showHTTDImages();
    } else {
      hideHTTDImages();
    }
  });
  slot.addEventListener('touchstart', function(e) {
    const slotKey = slot.dataset.slot;
    if (!slotImages[slotKey]) {
      showHTTDImages();
    } else {
      hideHTTDImages();
    }
  });
});

// Patch setSlotImage to support HTTD images (do not add to uploadedImages array)
const _setSlotImage = window.setSlotImage;
window.setSlotImage = function(slot, imgSrc, label) {
  // Accept both normal and HTTD images
  _setSlotImage(slot, imgSrc, label);
  hideHTTDImages(); // Hide HTTD images after assignment
  selectedUploadIndex = null;
};

const _renderUploaded = window.renderUploaded;
window.renderUploaded = function() {
  if (showingHTTD) return; // Don't override HTTD-only view
  _renderUploaded();
};

// Patch drag/drop assignment for HTTD images
document.querySelectorAll('.drop-slot').forEach(slot => {
  slot.addEventListener('drop', function(e) {
    if (typeof currentDragIndex === 'string' && currentDragIndex.startsWith('httd_')) {
      let idx = Number(currentDragIndex.replace('httd_', ''));
      setSlotImage(slot, httdImages[idx]);
      hideHTTDImages();
      currentDragIndex = null;
      selectedUploadIndex = null;
    }
  });

  // Also patch touch assignment for HTTD images
  slot.addEventListener('click', function(e) {
    if (typeof selectedUploadIndex === 'string' && selectedUploadIndex.startsWith('httd_')) {
      let idx = Number(selectedUploadIndex.replace('httd_', ''));
      setSlotImage(slot, httdImages[idx]);
      hideHTTDImages();
      selectedUploadIndex = null;
    }
  });
  slot.addEventListener('touchstart', function(e) {
    if (typeof selectedUploadIndex === 'string' && selectedUploadIndex.startsWith('httd_')) {
      e.preventDefault();
      let idx = Number(selectedUploadIndex.replace('httd_', ''));
      setSlotImage(slot, httdImages[idx]);
      hideHTTDImages();
      selectedUploadIndex = null;
    }
  });
});

// On page load, do NOT load HTTD images until slot is selected
window.addEventListener('DOMContentLoaded', function() {
  hideHTTDImages();
});
