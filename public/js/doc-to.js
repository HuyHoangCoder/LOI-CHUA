(function () {
  'use strict';

  /* ===== Phần thuần logic: cắt bài thành mẩu ngắn =====
     Không đụng tới DOM nên chạy được cả trong Node để test. */

  // Giọng tải từ mạng (hoặc không rõ nguồn) hay bị bỏ dở khi câu quá dài nên cắt
  // ngắn hẳn. Giọng cài sẵn trong máy chịu được đoạn dài; tính theo byte vì tiếng
  // Việt có dấu tốn khoảng 1,5 byte mỗi chữ.
  var GIOI_HAN_MANG = 175;   // ký tự
  var GIOI_HAN_MAY = 3000;   // byte UTF-8

  function demByte(chuoi) {
    try {
      return new TextEncoder().encode(chuoi).length;
    } catch (e) {
      return chuoi.length * 3;   // thiếu TextEncoder thì ước lượng thừa cho an toàn
    }
  }

  // Tách thành câu. Intl.Segmenter hiểu dấu câu tiếng Việt tốt hơn regex nhưng có
  // thể ném lỗi với mã ngôn ngữ lạ, nên vẫn giữ hai đường lui.
  function tachCau(vanBan) {
    var cat = null;
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      try {
        cat = new Intl.Segmenter('vi', { granularity: 'sentence' });
      } catch (e) {
        try { cat = new Intl.Segmenter(undefined, { granularity: 'sentence' }); }
        catch (e2) { cat = null; }
      }
    }

    var ra = [];
    var i;
    if (cat) {
      var lap = cat.segment(vanBan)[Symbol.iterator]();
      var buoc;
      while (!(buoc = lap.next()).done) {
        var c = buoc.value.segment.trim();
        if (c) ra.push(c);
      }
    } else {
      var kho = vanBan.match(/[^.!?…]+[.!?…]*\s*/g) || [];
      for (i = 0; i < kho.length; i += 1) {
        var t = kho[i].trim();
        if (t) ra.push(t);
      }
    }
    return ra.length ? ra : [vanBan];
  }

  // Vị trí nên cắt một câu quá dài. Lùi dần: sau dấu phẩy → sau khoảng trắng →
  // cắt cứng. Luôn trả về số > 0 để vòng lặp gọi nó chắc chắn kết thúc.
  function viTriCat(con, gioiHan, do_) {
    var thap = 1;
    var cao = Math.min(con.length - 1, gioiHan);
    var toiDa = 1;
    while (thap <= cao) {                       // chuỗi dài thêm thì số đo cũng tăng,
      var giua = Math.floor((thap + cao) / 2);  // nên tìm nhị phân là hợp lệ
      if (do_(con.slice(0, giua)) <= gioiHan) { toiDa = giua; thap = giua + 1; }
      else cao = giua - 1;
    }

    var phay = con.lastIndexOf(', ', toiDa - 2);
    if (phay > 0) return phay + 2;
    var trong = con.lastIndexOf(' ', toiDa - 1);
    if (trong > 0) return trong + 1;
    return toiDa;
  }

  function catCauDai(cau, gioiHan, do_) {
    var ra = [];
    var con = cau;
    while (do_(con) > gioiHan) {
      var cho = viTriCat(con, gioiHan, do_);
      var mau = con.slice(0, cho).trim();
      if (mau) ra.push(mau);
      con = con.slice(cho).trim();
      if (!con) return ra;
    }
    if (con) ra.push(con);
    return ra;
  }

  function catMau(vanBan, gioiHan, theoByte) {
    var do_ = theoByte ? demByte : function (s) { return s.length; };
    var goc = String(vanBan == null ? '' : vanBan).replace(/\s+/g, ' ').trim();
    if (!goc) return [];

    var cau = tachCau(goc);
    var tho = [];
    var i;
    for (i = 0; i < cau.length; i += 1) {
      tho = tho.concat(catCauDai(cau[i], gioiHan, do_));
    }

    // Gộp các mẩu ngắn liền nhau lại: càng ít mẩu thì càng ít khoảng lặng giữa chừng.
    var ra = [];
    for (i = 0; i < tho.length; i += 1) {
      var cuoi = ra.length ? ra[ra.length - 1] : null;
      if (cuoi !== null && do_(cuoi + ' ' + tho[i]) <= gioiHan) {
        ra[ra.length - 1] = cuoi + ' ' + tho[i];
      } else {
        ra.push(tho[i]);
      }
    }
    return ra;
  }

  if (typeof module === 'object' && module.exports) {
    module.exports = {
      demByte: demByte,
      tachCau: tachCau,
      catMau: catMau,
      GIOI_HAN_MANG: GIOI_HAN_MANG,
      GIOI_HAN_MAY: GIOI_HAN_MAY,
    };
    return;
  }

  /* ===== Phần chạy trong trình duyệt ===== */

  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  var synth = window.speechSynthesis;
  var nut = document.getElementById('nut-doc');
  if (!nut || !synth) return;   // không đọc được thì cứ để nút ẩn

  var tenNut = document.getElementById('nut-doc-ten');
  var bao = document.getElementById('nut-doc-bao');
  var ghiChu = document.getElementById('nut-doc-ghi-chu');
  var baiDoc = document.querySelector('.reader');

  var TEN = { nghi: 'Nghe bài này', doc: 'Tạm dừng', dung: 'Đọc tiếp' };
  var LOI = { nghi: 'Đã dừng', doc: 'Đang đọc', dung: 'Đã tạm dừng' };

  /* --- Trạng thái ---
     Khai báo ở ngay đây, trước phần chọn giọng, vì việc dò giọng có gọi ngược lại
     chotGiaoDien() và nó cần đọc trangThai.

     Mọi cờ của API đều nói dối ở đâu đó: speaking vẫn true khi đang tạm dừng,
     cancel() không xoá paused, còn Firefox thì speaking dùng chung cho cả trình
     duyệt. Nên giao diện chỉ vẽ theo biến của mình. */
  var trangThai = 'nghi';
  var doi = 0;              // số thế hệ — handler của lần đọc cũ phải tự im
  var mau = [];
  var viTri = 0;
  var trongNhip = false;    // đang ở quãng lặng giữa hai mẩu
  var daBatDau = false;     // mẩu hiện tại đã kêu chưa
  var coTheDung = null;     // giọng này pause() có ăn không (null = chưa dò)
  var boQua = 0;
  var canhGio = null;
  var henNoi = null;
  var khoiSang = null;
  var honDen = 0;           // tạm ngưng bám theo tới mốc thời gian này

  /* --- Chọn giọng --- */

  // SpeechSynthesisVoice không có thuộc tính giới tính, chỉ còn cách dò tên. Đây là
  // thứ tự ưu tiên chứ không phải điều kiện bắt buộc: dò trượt hết thì vẫn dùng
  // giọng tiếng Việt đầu tiên tìm được.
  var UU_TIEN_NAM = [
    /NamMinh/i,                    // Edge, giọng nam neural — hay nhất
    /^Microsoft An\b/,             // Windows có gói tiếng Việt; neo đầu để khỏi trúng Ana, Anna…
    /Ti[eế]ng Vi[eệ]t\s*3\b/i,     // ChromeOS
    /Ti[eế]ng Vi[eệ]t\s*5\b/i,
    /vi-vn-x-vie/i,                // Android để thẳng mã giọng trong tên
    /vi-vn-x-gft/i,
  ];

  var dsGiong = [];
  var giong = null;
  var xongDoGiong = false;

  function tenGiong(v) {
    var s = v && v.name ? v.name : '';
    return s.normalize ? s.normalize('NFC') : s;
  }

  function khoaGiong(v) {
    return v ? tenGiong(v) + '|' + (v.lang || '') : '';
  }

  // Lọc theo mã ngôn ngữ chứ không theo tên: Chrome trên Android trả 'vi_VN'
  // (gạch dưới) nên so thẳng với 'vi-VN' là trượt sạch.
  function giongViet(ds) {
    var ra = [];
    for (var i = 0; i < ds.length; i += 1) {
      var ma = String(ds[i].lang || '').replace(/_/g, '-').toLowerCase().split('-')[0];
      if (ma === 'vi') ra.push(ds[i]);
    }
    return ra;
  }

  function chonGiong() {
    var viet = giongViet(dsGiong);
    if (!viet.length) return null;
    for (var i = 0; i < UU_TIEN_NAM.length; i += 1) {
      for (var j = 0; j < viet.length; j += 1) {
        if (UU_TIEN_NAM[i].test(tenGiong(viet[j]))) return viet[j];
      }
    }
    return viet[0];
  }

  // Chưa dò xong thì chưa cho bấm: nút mở sớm mà máy không có giọng Việt thì bài
  // sẽ được đọc bằng giọng mặc định (thường là giọng Anh). Và không bao giờ khoá
  // nút khi đang đọc dở — người dùng sẽ mất luôn đường dừng lại.
  function chotGiaoDien() {
    var thieu = !giong;
    var dangChay = trangThai !== 'nghi';
    nut.disabled = thieu && !dangChay;
    if (ghiChu) ghiChu.hidden = !(xongDoGiong && thieu);
  }

  function doGiong() {
    dsGiong = synth.getVoices() || [];
    var moi = chonGiong();
    if (khoaGiong(moi) !== khoaGiong(giong)) coTheDung = null;
    giong = moi;
    chotGiaoDien();
  }

  // getVoices() được phép trả mảng rỗng, và lần 'voiceschanged' đầu tiên của
  // Chromium thường vẫn rỗng vì tiến trình nền chưa dựng xong danh sách. Nên vừa
  // nghe sự kiện vừa hỏi lại, rồi chốt sau 2 giây với những gì đang có.
  doGiong();
  if (synth.addEventListener) synth.addEventListener('voiceschanged', doGiong);
  if (giong) {
    xongDoGiong = true;
    chotGiaoDien();
  } else {
    var lanDo = 0;
    var nhipDo = setInterval(function () {
      doGiong();
      lanDo += 1;
      if (giong || lanDo >= 20) {
        clearInterval(nhipDo);
        xongDoGiong = true;
        chotGiaoDien();
      }
    }, 100);
  }

  /* --- Tốc độ và cao độ --- */

  // Chromium trên Windows quy đổi rate sang thang cơ số 3 của SAPI rồi cắt phần
  // thập phân, nên mọi giá trị từ 0,80 đến 1,25 đều thành 0 — tức là không đổi gì.
  // Muốn chậm thật thì phải xuống 0,60.
  function nhipDoc(v) {
    var ten = tenGiong(v);
    var tuNhien = /Online \(Natural\)/i.test(ten);
    var microsoft = /^Microsoft /.test(ten) && !tuNhien;
    var chromium = !!window.chrome || /Edg\//.test(navigator.userAgent);
    if (tuNhien) return { rate: 0.85, pitch: 1 };      // giọng neural hay bỏ qua pitch
    if (microsoft && chromium) return { rate: 0.60, pitch: 0.9 };
    if (microsoft) return { rate: 0.85, pitch: 0.9 };  // Firefox quy đổi rate đúng
    return { rate: 0.80, pitch: 0.88 };
  }

  function gioiHanCua(v) {
    return (v && v.localService === true)
      ? { so: GIOI_HAN_MAY, theoByte: true }
      : { so: GIOI_HAN_MANG, theoByte: false };
  }

  /* --- Gom văn bản --- */

  function gomKhoi() {
    var khoi = [];
    var tieuDe = document.querySelector('.reader-head h1');
    if (tieuDe) khoi.push({ el: tieuDe, chu: tieuDe.textContent });

    var cauGoc = document.querySelector('.verse');
    if (cauGoc) {
      Array.prototype.forEach.call(cauGoc.querySelectorAll('p, cite'), function (n) {
        khoi.push({ el: n, chu: n.textContent.replace(/^\s*[—–-]\s*/, '') });
      });
    }
    Array.prototype.forEach.call(document.querySelectorAll('#prose p'), function (n) {
      khoi.push({ el: n, chu: n.textContent });
    });
    return khoi;
  }

  function domMau() {
    var gh = gioiHanCua(giong);
    var ra = [];
    gomKhoi().forEach(function (k) {
      catMau(k.chu, gh.so, gh.theoByte).forEach(function (m) {
        ra.push({ el: k.el, chu: m, daCatLai: false });
      });
    });
    return ra;
  }

  /* --- Vẽ nút --- */

  function ve() {
    nut.setAttribute('data-trang-thai', trangThai);
    nut.setAttribute('aria-label', TEN[trangThai]);
    if (tenNut) tenNut.textContent = TEN[trangThai];
    if (baiDoc) {
      if (trangThai === 'nghi') baiDoc.classList.remove('dang-doc');
      else baiDoc.classList.add('dang-doc');
    }
  }

  function datTrangThai(moi) {
    if (moi === trangThai) return;
    trangThai = moi;
    ve();
    // Đổi nhãn của nút đang được focus thì trình đọc màn hình không chắc đọc lại,
    // nên báo qua một vùng role="status" riêng, và chỉ báo khi đổi trạng thái thật.
    if (bao) bao.textContent = LOI[moi];
  }

  function xoaCanhGio() { if (canhGio) { clearTimeout(canhGio); canhGio = null; } }
  function xoaHen() { if (henNoi) { clearTimeout(henNoi); henNoi = null; } }

  /* --- Làm nổi đoạn đang đọc --- */

  function itChuyenDong() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function theoDoi(el) {
    if (Date.now() < honDen) return;                       // người dùng vừa tự cuộn
    var o = el.getBoundingClientRect();
    var cao = window.innerHeight || document.documentElement.clientHeight;
    if (o.top > cao * 0.2 && o.bottom < cao * 0.8) return; // đang nằm gọn trong tầm mắt
    try {
      el.scrollIntoView({ block: 'center', behavior: itChuyenDong() ? 'auto' : 'smooth' });
    } catch (e) {
      el.scrollIntoView();
    }
  }

  function sangKhoi(el) {
    if (khoiSang === el) return;
    if (khoiSang) khoiSang.classList.remove('khoi-dang-doc');
    khoiSang = el;
    if (!el) return;
    el.classList.add('khoi-dang-doc');
    theoDoi(el);
  }

  ['wheel', 'touchstart', 'keydown'].forEach(function (t) {
    document.addEventListener(t, function () { honDen = Date.now() + 4000; }, { passive: true });
  });

  /* --- Phát --- */

  function noiTu(i) {
    if (i >= mau.length) { dungHan(); return; }
    viTri = i;
    trongNhip = false;
    daBatDau = false;

    var toi = doi;
    var m = mau[i];
    var u = new SpeechSynthesisUtterance(m.chu);
    var nhip = nhipDoc(giong);
    if (giong) {
      u.voice = giong;
      u.lang = String(giong.lang || 'vi-VN').replace(/_/g, '-');
    } else {
      u.lang = 'vi-VN';
    }
    u.rate = nhip.rate;
    u.pitch = nhip.pitch;

    u.onstart = function () {
      if (toi !== doi) return;
      daBatDau = true;
      boQua = 0;
      xoaCanhGio();
      sangKhoi(m.el);
    };
    u.onend = function () {
      if (toi === doi) xong(toi);
    };
    u.onerror = function (e) {
      if (toi !== doi) return;
      var loi = e && e.error;
      if (loi === 'canceled' || loi === 'interrupted') return;   // do mình chủ động dừng
      xoaCanhGio();
      if (loi === 'not-allowed') { dungHan(); return; }          // trình duyệt đòi thao tác tay
      if (loi === 'text-too-long' && !m.daCatLai) { catLai(i); return; }
      xong(toi);
    };

    // Tab bị tắt tiếng, hoặc Safari trên iOS chặn vì thiếu thao tác tay, đều làm
    // speak() im lặng mà không báo gì. Không có đồng hồ này thì treo mãi.
    xoaCanhGio();
    canhGio = setTimeout(function () {
      if (toi !== doi || daBatDau) return;
      if (boQua >= 2) { dungHan(); return; }
      var ke = viTri + 1;
      if (ke >= mau.length) { dungHan(); return; }
      boQua += 1;

      // Mẩu câm này vẫn có thể còn nằm trong hàng đợi rồi kêu muộn. Bỏ mặc nó thì
      // handler cũ đẩy viTri thêm một nấc và mẩu cuối bài bị huỷ khi chưa kịp đọc.
      doi += 1;                 // tăng trước cancel: WebKit gọi onerror ngay trong cancel()
      var mai = doi;
      viTri = ke;
      trongNhip = true;         // bấm nút trong 120 ms này vẫn được xử lý đúng
      synth.cancel();
      xoaHen();
      henNoi = setTimeout(function () {
        if (mai === doi && trangThai === 'doc') noiTu(ke);
      }, 120);
    }, 10000);

    try { synth.speak(u); } catch (e) { xong(toi); }
  }

  // Engine kêu quá dài thì cắt lại đúng một lần theo mức chặt nhất rồi thử tiếp.
  function catLai(i) {
    var m = mau[i];
    var them = catMau(m.chu, GIOI_HAN_MANG, false).map(function (c) {
      return { el: m.el, chu: c, daCatLai: true };
    });
    if (them.length < 2) { xong(doi); return; }
    mau.splice.apply(mau, [i, 1].concat(them));
    noiTu(i);
  }

  function xong(toi) {
    if (toi !== doi || trangThai !== 'doc') return;
    xoaCanhGio();
    var ke = viTri + 1;
    if (ke >= mau.length) { dungHan(); return; }

    // Nghỉ một nhịp giữa hai đoạn cho thong thả. Cao độ trên Windows quá thô để
    // tạo cảm giác trang nghiêm; khoảng lặng thật mới là thứ chạy được ở mọi máy.
    var nghi = mau[ke].el !== mau[viTri].el ? 600 : 0;
    viTri = ke;
    if (!nghi) { noiTu(ke); return; }
    trongNhip = true;
    xoaHen();
    henNoi = setTimeout(function () {
      if (toi === doi && trangThai === 'doc') noiTu(ke);
    }, nghi);
  }

  function phat() {
    if (!giong) return;   // không có giọng Việt thì thà im còn hơn đọc bằng giọng Anh
    mau = domMau();
    if (!mau.length) return;
    doi += 1;
    viTri = 0;
    boQua = 0;
    trongNhip = false;
    datTrangThai('doc');
    sangKhoi(mau[0].el);   // làm nổi ngay, đừng để cả bài xám ngoét lúc chờ tiếng đầu

    var toi = doi;
    if (synth.speaking || synth.pending) {
      // Huỷ rồi nói ngay trong cùng một nhịp thì Firefox có thể bỏ rơi câu mới.
      synth.cancel();
      setTimeout(function () { if (toi === doi) noiTu(0); }, 120);
    } else {
      noiTu(0);   // iOS bắt buộc speak() đầu tiên nằm thẳng trong handler click
    }
  }

  // Chrome trên Android biến pause() thành stop() và resume() thành hàm rỗng, lại
  // không báo gì. Nên cứ dừng rồi dò xem có ăn không; không ăn thì cắt hẳn và lát
  // nữa đọc lại mẩu đó từ đầu.
  function tamDung() {
    xoaHen();
    xoaCanhGio();
    datTrangThai('dung');
    if (trongNhip) return;   // đang ở quãng lặng, chẳng có gì để dừng
    synth.pause();

    var toi = doi;
    setTimeout(function () {
      if (toi !== doi || trangThai !== 'dung' || !daBatDau) return;
      if (synth.paused) {
        coTheDung = true;
      } else {
        coTheDung = false;
        doi += 1;
        synth.cancel();
      }
    }, 300);
  }

  // Chưa dò xong thì cứ coi như pause() không ăn. Mất nhiều nhất là đọc lại một mẩu
  // từ đầu, đổi lại noiTu() dựng lại đồng hồ canh giờ nên không có đường nào treo
  // im lặng mà không ai biết.
  function docTiep() {
    datTrangThai('doc');
    if (coTheDung !== true || trongNhip) {
      doi += 1;
      trongNhip = false;
      var toi = doi;
      synth.cancel();
      setTimeout(function () { if (toi === doi) noiTu(viTri); }, 120);
      return;
    }
    synth.resume();
  }

  function dungHan() {
    doi += 1;
    trongNhip = false;
    xoaHen();
    xoaCanhGio();
    try { synth.cancel(); } catch (e) { /* bỏ qua */ }
    sangKhoi(null);
    datTrangThai('nghi');
  }

  nut.addEventListener('click', function () {
    if (trangThai === 'doc') tamDung();
    else if (trangThai === 'dung') docTiep();
    else phat();
  });

  /* --- Vòng đời trang --- */

  try { synth.cancel(); } catch (e) { /* bỏ qua */ }   // dọn hàng đợi còn sót lại

  // Dùng pagehide chứ không phải unload: unload làm trang mất quyền vào bộ nhớ đệm
  // quay lui. Không huỷ khi tab bị ẩn — Chrome vẫn đọc tiếp ở tab nền và đó là
  // điều người nghe muốn.
  window.addEventListener('pagehide', function () { dungHan(); });
  window.addEventListener('pageshow', function (e) { if (e.persisted) dungHan(); });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') return;
    if (trangThai === 'doc' && !trongNhip && !synth.speaking && !synth.pending) dungHan();
  });

  nut.hidden = false;
  ve();
})();
