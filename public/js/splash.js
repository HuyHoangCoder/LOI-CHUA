(function () {
  'use strict';
  var splash = document.getElementById('splash');
  if (!splash) return;

  function thoiNghe() {
    document.removeEventListener('pointerdown', boQua);
    document.removeEventListener('keydown', boQua);
  }

  function boQua() {
    splash.classList.add('splash-tat');   // chạy lại hiệu ứng, lần này không chờ
    thoiNghe();
  }

  document.addEventListener('pointerdown', boQua);
  document.addEventListener('keydown', boQua);

  // Gỡ hẳn khỏi trang sau khi mờ xong, để chắc chắn không chắn thao tác.
  splash.addEventListener('animationend', function (e) {
    if (e.target !== splash) return;      // bỏ qua hiệu ứng của các phần bên trong
    thoiNghe();
    if (splash.parentNode) splash.parentNode.removeChild(splash);
  });
})();
