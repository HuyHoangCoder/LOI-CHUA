(function () {
  'use strict';
  var KEY = 'loichua-font-size';
  var MIN = 16, MAX = 26, BUOC = 2;
  var prose = document.getElementById('prose');
  if (!prose) return;

  function apDung(size) {
    prose.style.fontSize = size + 'px';
    try { localStorage.setItem(KEY, String(size)); } catch (e) { /* bỏ qua */ }
  }

  var hienTai = 19;
  try {
    var luu = parseInt(localStorage.getItem(KEY), 10);
    if (luu >= MIN && luu <= MAX) hienTai = luu;
  } catch (e) { /* bỏ qua */ }
  apDung(hienTai);

  document.getElementById('font-smaller').addEventListener('click', function () {
    hienTai = Math.max(MIN, hienTai - BUOC);
    apDung(hienTai);
  });
  document.getElementById('font-larger').addEventListener('click', function () {
    hienTai = Math.min(MAX, hienTai + BUOC);
    apDung(hienTai);
  });
})();
