(function () {
  'use strict';
  var form = document.querySelector('.search-form');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    var o = form.querySelector('input[name="q"]');
    if (!o || !o.value.trim()) {
      e.preventDefault();   // ô trống thì không làm gì cả
      if (o) o.focus();
    }
  });
})();
