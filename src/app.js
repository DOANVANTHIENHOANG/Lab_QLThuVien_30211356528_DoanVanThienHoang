/**
 * Ứng dụng Web Quản lý Thư viện — Lab 02
 * Vanilla JavaScript + localStorage
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'ql_thuvien_lab02_v1';
  const DEFAULT_BORROW_DAYS = 7;
  const RENEW_EXTRA_DAYS = 3;
  const MAX_RENEW_COUNT = 1;

  // ==================== STATE ====================
  let state = {
    docGia: [],
    sach: [],
    phieuMuon: []
  };

  let ui = {
    activeTab: 'loans',
    loanFilter: 'all',
    loanSearch: '',
    bookSearch: '',
    bookStatusFilter: 'all',
    readerSearch: ''
  };

  // ==================== STORAGE ====================
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          Array.isArray(parsed.docGia) &&
          Array.isArray(parsed.sach) &&
          Array.isArray(parsed.phieuMuon)
        ) {
          state = parsed;
          syncAllLoanStatuses();
          return;
        }
      }
    } catch (err) {
      console.warn('Không thể đọc localStorage, khởi tạo dữ liệu mẫu:', err);
    }
    state = window.createInitialLibraryData();
    saveState();
  }

  function saveState() {
    syncAllLoanStatuses();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      showToast('Không thể lưu dữ liệu vào localStorage.', 'error');
    }
  }

  // ==================== BUSINESS LOGIC HELPERS ====================
  function getLoanComputedStatus(loan) {
    if (loan.ngay_tra && loan.ngay_tra.trim() !== '') {
      return 'Đã trả về';
    }
    const today = window.CalendarDate.todayISO();
    return window.CalendarDate.compare(today, loan.han_tra) > 0
      ? 'Quá hạn'
      : 'Đang mượn';
  }

  function syncAllLoanStatuses() {
    for (const loan of state.phieuMuon) {
      loan.trang_thai = getLoanComputedStatus(loan);
    }
  }

  function canRenewLoan(loan) {
    const status = getLoanComputedStatus(loan);
    return (
      (!loan.ngay_tra || loan.ngay_tra.trim() === '') &&
      status === 'Đang mượn' &&
      Number(loan.so_lan_gia_han) < MAX_RENEW_COUNT
    );
  }

  function findReader(maDg) {
    return state.docGia.find((dg) => dg.ma_dg === maDg);
  }

  function findBook(maSach) {
    return state.sach.find((s) => s.ma_sach === maSach);
  }

  function generateNextCode(prefix, list, field) {
    let maxNum = 0;
    const regex = new RegExp(`^${prefix}(\\d+)$`, 'i');
    for (const item of list) {
      const match = String(item[field] || '').match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    return `${prefix}${String(maxNum + 1).padStart(3, '0')}`;
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ==================== CORE OPERATIONS ====================
  function createLoan({ ma_dg, ma_sach, ngay_muon }) {
    const reader = findReader(ma_dg);
    if (!reader) {
      return { ok: false, message: 'Không tìm thấy độc giả đã chọn.' };
    }
    if (reader.trang_thai_the !== 'Hoạt động') {
      return {
        ok: false,
        message: `Thẻ độc giả "${reader.ho_ten}" (${reader.ma_dg}) hiện đang bị tạm khóa, không thể mượn sách.`
      };
    }

    const book = findBook(ma_sach);
    if (!book) {
      return { ok: false, message: 'Không tìm thấy đầu sách đã chọn.' };
    }
    if (book.tinh_trang === 'Hư hỏng' || book.tinh_trang === 'Thất lạc') {
      return {
        ok: false,
        message: `Sách "${book.ten_sach}" đang ở tình trạng "${book.tinh_trang}", không thể cho mượn.`
      };
    }
    if (Number(book.so_luong_ton) <= 0) {
      return {
        ok: false,
        message: `Sách "${book.ten_sach}" (${book.ma_sach}) đã hết tồn kho (số lượng tồn = 0). Không thể tạo phiếu mượn!`
      };
    }

    const han_tra = window.CalendarDate.addDays(ngay_muon, DEFAULT_BORROW_DAYS);
    const ma_phieu = generateNextCode('PM', state.phieuMuon, 'ma_phieu');

    const newLoan = {
      ma_phieu,
      ma_dg,
      ma_sach,
      ngay_muon,
      han_tra,
      so_lan_gia_han: 0,
      ngay_tra: '',
      trang_thai: 'Đang mượn'
    };
    newLoan.trang_thai = getLoanComputedStatus(newLoan);

    // Giảm số lượng tồn kho đi 1
    book.so_luong_ton = Number(book.so_luong_ton) - 1;
    if (book.so_luong_ton === 0 && book.tinh_trang === 'Còn kho') {
      book.tinh_trang = 'Đang mượn';
    }

    state.phieuMuon.unshift(newLoan);
    saveState();
    renderAll();

    return {
      ok: true,
      message: `Tạo phiếu mượn ${ma_phieu} thành công! Hạn trả: ${window.CalendarDate.formatVN(han_tra)}.`
    };
  }

  function renewLoan(maPhieu) {
    const loan = state.phieuMuon.find((p) => p.ma_phieu === maPhieu);
    if (!loan) return;

    if (loan.ngay_tra) {
      showToast('Phiếu này đã được trả sách, không thể gia hạn.', 'error');
      return;
    }

    const status = getLoanComputedStatus(loan);
    if (status === 'Quá hạn') {
      showToast(`Phiếu ${maPhieu} đã quá hạn trả — không được phép gia hạn!`, 'error');
      return;
    }

    if (Number(loan.so_lan_gia_han) >= MAX_RENEW_COUNT) {
      showToast(`Phiếu ${maPhieu} đã sử dụng hết lượt gia hạn (tối đa 1 lần).`, 'error');
      return;
    }

    loan.han_tra = window.CalendarDate.addDays(loan.han_tra, RENEW_EXTRA_DAYS);
    loan.so_lan_gia_han = Number(loan.so_lan_gia_han) + 1;
    loan.trang_thai = getLoanComputedStatus(loan);

    saveState();
    renderAll();
    showToast(
      `Đã gia hạn phiếu ${maPhieu} thêm ${RENEW_EXTRA_DAYS} ngày. Hạn trả mới: ${window.CalendarDate.formatVN(loan.han_tra)}.`,
      'info'
    );
  }

  function returnLoan(maPhieu) {
    const loan = state.phieuMuon.find((p) => p.ma_phieu === maPhieu);
    if (!loan || loan.ngay_tra) return;

    const today = window.CalendarDate.todayISO();
    loan.ngay_tra = today;
    loan.trang_thai = 'Đã trả về';

    // Cộng lại 1 vào số lượng tồn kho của sách
    const book = findBook(loan.ma_sach);
    if (book) {
      book.so_luong_ton = Math.min(Number(book.tong_so_luong), Number(book.so_luong_ton) + 1);
      if (book.so_luong_ton > 0 && book.tinh_trang === 'Đang mượn') {
        book.tinh_trang = 'Còn kho';
      }
    }

    saveState();
    renderAll();
    showToast(
      `Phiếu ${maPhieu} đã trả về kho (${window.CalendarDate.formatVN(today)}). Tồn kho đã được cập nhật +1.`,
      'success'
    );
  }

  // ==================== RENDERING ====================
  function renderDashboard() {
    const totalBooks = state.sach.length;
    const totalCopies = state.sach.reduce((sum, s) => sum + Number(s.tong_so_luong || 0), 0);
    const totalStock = state.sach.reduce((sum, s) => sum + Number(s.so_luong_ton || 0), 0);

    let borrowingCount = 0;
    let overdueCount = 0;
    let returnedCount = 0;

    for (const loan of state.phieuMuon) {
      const st = getLoanComputedStatus(loan);
      if (st === 'Đang mượn') borrowingCount++;
      else if (st === 'Quá hạn') overdueCount++;
      else if (st === 'Đã trả về') returnedCount++;
    }

    document.getElementById('stat-total-books').textContent = totalBooks;
    document.getElementById('stat-books-meta').textContent = `${totalStock} bản tồn kho / ${totalCopies} tổng bản`;
    document.getElementById('stat-borrowing').textContent = borrowingCount;
    document.getElementById('stat-overdue').textContent = overdueCount;
    document.getElementById('stat-returned').textContent = returnedCount;

    document.getElementById('count-loans').textContent = state.phieuMuon.length;
    document.getElementById('count-books').textContent = state.sach.length;
    document.getElementById('count-readers').textContent = state.docGia.length;
  }

  function renderLoansTable() {
    const tbody = document.getElementById('loans-tbody');
    const keyword = ui.loanSearch.trim().toLowerCase();

    const filtered = state.phieuMuon.filter((loan) => {
      const status = getLoanComputedStatus(loan);
      if (ui.loanFilter === 'borrowing' && status !== 'Đang mượn') return false;
      if (ui.loanFilter === 'overdue' && status !== 'Quá hạn') return false;
      if (ui.loanFilter === 'returned' && status !== 'Đã trả về') return false;

      if (keyword) {
        const reader = findReader(loan.ma_dg);
        const book = findBook(loan.ma_sach);
        const haystack = [
          loan.ma_phieu,
          loan.ma_dg,
          reader ? reader.ho_ten : '',
          loan.ma_sach,
          book ? book.ten_sach : ''
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(keyword)) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="empty-state">
            Không tìm thấy phiếu mượn nào phù hợp với bộ lọc hiện tại.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered
      .map((loan) => {
        const reader = findReader(loan.ma_dg);
        const book = findBook(loan.ma_sach);
        const status = getLoanComputedStatus(loan);
        const isReturned = status === 'Đã trả về';
        const isOverdue = status === 'Quá hạn';
        const allowRenew = canRenewLoan(loan);

        let statusBadge = '';
        if (isReturned) {
          statusBadge = `<span class="badge badge-returned">✓ Đã trả về</span>`;
        } else if (isOverdue) {
          statusBadge = `<span class="badge badge-overdue">● Quá hạn</span>`;
        } else {
          statusBadge = `<span class="badge badge-borrowing">● Đang mượn</span>`;
        }

        const returnDateCell = isReturned
          ? `<strong>${escapeHtml(window.CalendarDate.formatVN(loan.ngay_tra))}</strong>`
          : `<span class="date-empty">-</span>`;

        const renewCell =
          Number(loan.so_lan_gia_han) > 0
            ? `<span class="renew-info renewed">1 / 1 (+3 ngày)</span>`
            : `<span class="renew-info">0 / 1</span>`;

        let actionButtons = '';
        if (isReturned) {
          actionButtons = `<span class="action-note">Hoàn tất</span>`;
        } else {
          if (allowRenew) {
            actionButtons += `
              <button type="button" class="btn btn-sm btn-warning" data-action="renew" data-id="${escapeHtml(loan.ma_phieu)}">
                Gia hạn (+3 ngày)
              </button>
            `;
          }
          actionButtons += `
            <button type="button" class="btn btn-sm btn-success" data-action="return" data-id="${escapeHtml(loan.ma_phieu)}">
              Trả sách
            </button>
          `;
        }

        return `
          <tr>
            <th scope="row">${escapeHtml(loan.ma_phieu)}</th>
            <td>
              <div class="cell-main">${escapeHtml(reader ? reader.ho_ten : loan.ma_dg)}</div>
              <div class="cell-sub">${escapeHtml(loan.ma_dg)}</div>
            </td>
            <td>
              <div class="cell-main">${escapeHtml(book ? book.ten_sach : loan.ma_sach)}</div>
              <div class="cell-sub">${escapeHtml(loan.ma_sach)}</div>
            </td>
            <td>${escapeHtml(window.CalendarDate.formatVN(loan.ngay_muon))}</td>
            <td><strong>${escapeHtml(window.CalendarDate.formatVN(loan.han_tra))}</strong></td>
            <td>${renewCell}</td>
            <td>${returnDateCell}</td>
            <td>${statusBadge}</td>
            <td><div class="actions-group">${actionButtons}</div></td>
          </tr>
        `;
      })
      .join('');
  }

  function renderBooksTable() {
    const tbody = document.getElementById('books-tbody');
    const keyword = ui.bookSearch.trim().toLowerCase();

    const filtered = state.sach.filter((book) => {
      if (ui.bookStatusFilter !== 'all' && book.tinh_trang !== ui.bookStatusFilter) {
        return false;
      }
      if (keyword) {
        const haystack = [book.ma_sach, book.ten_sach, book.tac_gia, book.the_loai]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(keyword)) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="empty-state">
            Không tìm thấy đầu sách nào khớp với từ khóa hoặc bộ lọc.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered
      .map((book) => {
        const stock = Number(book.so_luong_ton);
        const stockClass = stock > 0 ? 'stock-ok' : 'stock-zero';

        let statusClass = 'badge-available';
        if (book.tinh_trang === 'Đang mượn') statusClass = 'badge-borrowing';
        else if (book.tinh_trang === 'Hư hỏng') statusClass = 'badge-damaged';
        else if (book.tinh_trang === 'Thất lạc') statusClass = 'badge-lost';

        return `
          <tr>
            <th scope="row">${escapeHtml(book.ma_sach)}</th>
            <td><div class="cell-main">${escapeHtml(book.ten_sach)}</div></td>
            <td>${escapeHtml(book.tac_gia)}</td>
            <td>${escapeHtml(book.the_loai)}</td>
            <td>${escapeHtml(book.tong_so_luong)}</td>
            <td><span class="stock-pill ${stockClass}">${stock}</span></td>
            <td><span class="badge ${statusClass}">${escapeHtml(book.tinh_trang)}</span></td>
            <td>
              <div class="actions-group">
                <button type="button" class="btn btn-sm btn-primary" data-action="quick-borrow" data-id="${escapeHtml(book.ma_sach)}">
                  Mượn
                </button>
                <button type="button" class="btn btn-sm btn-secondary" data-action="edit-book" data-id="${escapeHtml(book.ma_sach)}">
                  Sửa
                </button>
                <button type="button" class="btn btn-sm btn-outline-danger" data-action="delete-book" data-id="${escapeHtml(book.ma_sach)}">
                  Xóa
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  function renderReadersTable() {
    const tbody = document.getElementById('readers-tbody');
    const keyword = ui.readerSearch.trim().toLowerCase();

    const filtered = state.docGia.filter((dg) => {
      if (!keyword) return true;
      const haystack = [dg.ma_dg, dg.ho_ten, dg.lop_sdt, dg.trang_thai_the]
        .join(' ')
        .toLowerCase();
      return haystack.includes(keyword);
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">
            Không tìm thấy độc giả nào phù hợp.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered
      .map((dg) => {
        const activeLoans = state.phieuMuon.filter(
          (p) => p.ma_dg === dg.ma_dg && (!p.ngay_tra || p.ngay_tra.trim() === '')
        ).length;
        const badgeClass =
          dg.trang_thai_the === 'Hoạt động' ? 'badge-available' : 'badge-locked';

        return `
          <tr>
            <th scope="row">${escapeHtml(dg.ma_dg)}</th>
            <td><div class="cell-main">${escapeHtml(dg.ho_ten)}</div></td>
            <td>${escapeHtml(dg.lop_sdt)}</td>
            <td><strong>${activeLoans}</strong> cuốn</td>
            <td><span class="badge ${badgeClass}">${escapeHtml(dg.trang_thai_the)}</span></td>
            <td>
              <div class="actions-group">
                <button type="button" class="btn btn-sm btn-secondary" data-action="edit-reader" data-id="${escapeHtml(dg.ma_dg)}">
                  Sửa
                </button>
                <button type="button" class="btn btn-sm btn-outline-danger" data-action="delete-reader" data-id="${escapeHtml(dg.ma_dg)}">
                  Xóa
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  function renderAll() {
    syncAllLoanStatuses();
    renderDashboard();
    renderLoansTable();
    renderBooksTable();
    renderReadersTable();
  }

  // ==================== DIALOG HELPERS ====================
  function openBorrowDialog(preselectedBookCode = '') {
    const dialog = document.getElementById('borrow-dialog');
    const form = document.getElementById('borrow-form');
    const alertBox = document.getElementById('borrow-form-alert');
    const readerSelect = document.getElementById('borrow-reader');
    const bookSelect = document.getElementById('borrow-book');
    const dateInput = document.getElementById('borrow-date');
    const dueInput = document.getElementById('borrow-due-date');

    form.reset();
    alertBox.hidden = true;
    alertBox.textContent = '';

    readerSelect.innerHTML =
      `<option value="">-- Chọn độc giả --</option>` +
      state.docGia
        .map((dg) => {
          const lockTag = dg.trang_thai_the !== 'Hoạt động' ? ' [Tạm khóa]' : '';
          return `<option value="${escapeHtml(dg.ma_dg)}">${escapeHtml(dg.ma_dg)} — ${escapeHtml(dg.ho_ten)}${lockTag}</option>`;
        })
        .join('');

    bookSelect.innerHTML =
      `<option value="">-- Chọn đầu sách --</option>` +
      state.sach
        .map((s) => {
          const stockLabel =
            Number(s.so_luong_ton) > 0
              ? `Tồn: ${s.so_luong_ton}`
              : `HẾT SÁCH (Tồn: 0)`;
          return `<option value="${escapeHtml(s.ma_sach)}">${escapeHtml(s.ma_sach)} — ${escapeHtml(s.ten_sach)} (${stockLabel})</option>`;
        })
        .join('');

    if (preselectedBookCode) {
      bookSelect.value = preselectedBookCode;
    }

    const today = window.CalendarDate.todayISO();
    dateInput.value = today;
    dueInput.value = window.CalendarDate.addDays(today, DEFAULT_BORROW_DAYS);

    dialog.showModal();
  }

  function openBookDialog(book = null) {
    const dialog = document.getElementById('book-dialog');
    const form = document.getElementById('book-form');
    const alertBox = document.getElementById('book-form-alert');
    const titleEl = document.getElementById('book-dialog-title');
    const editMode = document.getElementById('book-edit-mode');
    const codeInput = document.getElementById('book-code');

    form.reset();
    alertBox.hidden = true;
    alertBox.textContent = '';

    if (book) {
      titleEl.textContent = `Cập nhật thông tin sách (${book.ma_sach})`;
      editMode.value = book.ma_sach;
      codeInput.value = book.ma_sach;
      codeInput.readOnly = true;
      document.getElementById('book-title').value = book.ten_sach;
      document.getElementById('book-author').value = book.tac_gia;
      document.getElementById('book-category').value = book.the_loai;
      document.getElementById('book-total').value = book.tong_so_luong;
      document.getElementById('book-stock').value = book.so_luong_ton;
      document.getElementById('book-status').value = book.tinh_trang;
    } else {
      titleEl.textContent = 'Thêm sách mới vào kho';
      editMode.value = '';
      codeInput.readOnly = false;
      codeInput.value = generateNextCode('S', state.sach, 'ma_sach');
      document.getElementById('book-total').value = 3;
      document.getElementById('book-stock').value = 3;
      document.getElementById('book-status').value = 'Còn kho';
    }

    dialog.showModal();
  }

  function openReaderDialog(reader = null) {
    const dialog = document.getElementById('reader-dialog');
    const form = document.getElementById('reader-form');
    const alertBox = document.getElementById('reader-form-alert');
    const titleEl = document.getElementById('reader-dialog-title');
    const editMode = document.getElementById('reader-edit-mode');
    const codeInput = document.getElementById('reader-code');

    form.reset();
    alertBox.hidden = true;
    alertBox.textContent = '';

    if (reader) {
      titleEl.textContent = `Cập nhật độc giả (${reader.ma_dg})`;
      editMode.value = reader.ma_dg;
      codeInput.value = reader.ma_dg;
      codeInput.readOnly = true;
      document.getElementById('reader-name').value = reader.ho_ten;
      document.getElementById('reader-contact').value = reader.lop_sdt;
      document.getElementById('reader-status').value = reader.trang_thai_the;
    } else {
      titleEl.textContent = 'Thêm độc giả mới';
      editMode.value = '';
      codeInput.readOnly = false;
      codeInput.value = generateNextCode('DG', state.docGia, 'ma_dg');
      document.getElementById('reader-status').value = 'Hoạt động';
    }

    dialog.showModal();
  }

  // ==================== TOAST ====================
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? '✅' : type === 'error' ? '⛔' : 'ℹ️';
    toast.innerHTML = `<span aria-hidden="true">${icon}</span><span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.25s ease';
      setTimeout(() => toast.remove(), 260);
    }, 3600);
  }

  // ==================== PROGRESSIVE ENHANCEMENTS ====================
  // Light-dismiss fallback cho trình duyệt chưa hỗ trợ <dialog closedby="any">
  function setupDialogLightDismissFallback() {
    if ('closedBy' in HTMLDialogElement.prototype) return;

    const isOutside = (e, dialog) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };

    for (const dialog of document.querySelectorAll('dialog[closedby="any"]')) {
      let pressedOutside = false;
      dialog.addEventListener('pointerdown', (e) => {
        pressedOutside = isOutside(e, dialog);
      });
      dialog.addEventListener('pointerup', (e) => {
        if (pressedOutside && isOutside(e, dialog)) {
          dialog.close();
        }
      });
    }
  }

  // Đồng bộ aria-invalid và aria-describedby với :user-invalid
  function setupAccessibleValidationSync() {
    const supportsUserInvalid = CSS.supports('selector(:user-invalid)');
    const dirtyState = new WeakMap();

    const linkError = (el, shown) => {
      const errorId = el.dataset?.error;
      if (!errorId) return;
      const ids = (el.getAttribute('aria-describedby') || '')
        .split(/\s+/)
        .filter((id) => id && id !== errorId);
      if (shown) ids.push(errorId);
      if (ids.length) el.setAttribute('aria-describedby', ids.join(' '));
      else el.removeAttribute('aria-describedby');
    };

    const syncAria = (el) => {
      if (!el.matches?.('input, select, textarea')) return;
      const invalid = supportsUserInvalid
        ? el.matches(':user-invalid')
        : el.classList.contains('user-invalid-fallback');
      el.setAttribute('aria-invalid', invalid ? 'true' : 'false');
      linkError(el, invalid);
    };

    document.querySelectorAll('input, select, textarea').forEach((el) => {
      el.setAttribute('aria-invalid', 'false');
    });

    document.addEventListener(
      'blur',
      (e) => {
        const el = e.target;
        if (!el.matches?.('input, select, textarea')) return;
        if (!supportsUserInvalid) {
          const st = dirtyState.get(el) || { interacted: false, blurred: false };
          st.blurred = true;
          dirtyState.set(el, st);
          if (st.interacted) el.classList.toggle('user-invalid-fallback', !el.validity.valid);
        }
        syncAria(el);
      },
      true
    );

    document.addEventListener('input', (e) => {
      const el = e.target;
      if (!el.matches?.('input, select, textarea')) return;
      if (!supportsUserInvalid) {
        const st = dirtyState.get(el) || { interacted: false, blurred: false };
        st.interacted = true;
        dirtyState.set(el, st);
        if (st.blurred) el.classList.toggle('user-invalid-fallback', !el.validity.valid);
      }
      syncAria(el);
    });

    document.addEventListener(
      'invalid',
      (e) => {
        const el = e.target;
        if (!supportsUserInvalid && el.matches?.('input, select, textarea')) {
          dirtyState.set(el, { interacted: true, blurred: true });
          el.classList.add('user-invalid-fallback');
        }
        syncAria(el);
      },
      true
    );

    document.addEventListener(
      'reset',
      (e) => {
        setTimeout(() => {
          for (const el of e.target.elements || []) {
            dirtyState.delete(el);
            el.classList?.remove('user-invalid-fallback');
            if (el.matches?.('input, select, textarea')) {
              el.setAttribute('aria-invalid', 'false');
              linkError(el, false);
            }
          }
        });
      },
      true
    );
  }

  // ==================== EVENT BINDING ====================
  function bindEvents() {
    // Chuyển Tab
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        ui.activeTab = target;

        document.querySelectorAll('.tab-btn').forEach((b) => {
          const active = b.dataset.tab === target;
          b.classList.toggle('active', active);
          b.setAttribute('aria-selected', String(active));
        });

        document.querySelectorAll('.tab-panel').forEach((panel) => {
          const active = panel.id === `panel-${target}`;
          panel.classList.toggle('active', active);
          panel.hidden = !active;
        });
      });
    });

    // Bộ lọc trạng thái phiếu mượn
    document.querySelectorAll('[data-loan-filter]').forEach((pill) => {
      pill.addEventListener('click', () => {
        ui.loanFilter = pill.dataset.loanFilter;
        document.querySelectorAll('[data-loan-filter]').forEach((p) => {
          p.classList.toggle('active', p === pill);
        });
        renderLoansTable();
      });
    });

    // Tìm kiếm & lọc
    document.getElementById('loan-search').addEventListener('input', (e) => {
      ui.loanSearch = e.target.value;
      renderLoansTable();
    });

    document.getElementById('book-search').addEventListener('input', (e) => {
      ui.bookSearch = e.target.value;
      renderBooksTable();
    });

    document.getElementById('book-status-filter').addEventListener('change', (e) => {
      ui.bookStatusFilter = e.target.value;
      renderBooksTable();
    });

    document.getElementById('reader-search').addEventListener('input', (e) => {
      ui.readerSearch = e.target.value;
      renderReadersTable();
    });

    // Nút mở Dialog
    document.getElementById('btn-open-borrow').addEventListener('click', () => openBorrowDialog());
    document.getElementById('btn-open-book-modal').addEventListener('click', () => openBookDialog());
    document.getElementById('btn-open-reader-modal').addEventListener('click', () => openReaderDialog());

    // Nút đóng Dialog
    document.querySelectorAll('[data-close-dialog]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const dialog = document.getElementById(btn.dataset.closeDialog);
        if (dialog) dialog.close();
      });
    });

    // Reset dữ liệu mẫu với Confirm Dialog
    const confirmDialog = document.getElementById('confirm-dialog');
    document.getElementById('btn-reset-data').addEventListener('click', () => {
      confirmDialog.showModal();
    });

    confirmDialog.addEventListener('close', () => {
      const choice = confirmDialog.returnValue;
      confirmDialog.returnValue = '';
      if (choice === 'confirm') {
        state = window.createInitialLibraryData();
        saveState();
        renderAll();
        showToast('Đã khôi phục toàn bộ dữ liệu mẫu ban đầu!', 'success');
      }
    });

    // Tự động tính hạn trả (+7 ngày) khi đổi ngày mượn
    document.getElementById('borrow-date').addEventListener('change', (e) => {
      const val = e.target.value;
      if (val) {
        document.getElementById('borrow-due-date').value = window.CalendarDate.addDays(
          val,
          DEFAULT_BORROW_DAYS
        );
      }
    });

    // Submit Form tạo phiếu mượn
    document.getElementById('borrow-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const form = e.target;
      const alertBox = document.getElementById('borrow-form-alert');
      alertBox.hidden = true;

      if (!form.reportValidity()) return;

      const result = createLoan({
        ma_dg: document.getElementById('borrow-reader').value,
        ma_sach: document.getElementById('borrow-book').value,
        ngay_muon: document.getElementById('borrow-date').value
      });

      if (!result.ok) {
        alertBox.textContent = result.message;
        alertBox.hidden = false;
        showToast(result.message, 'error');
        return;
      }

      document.getElementById('borrow-dialog').close();
      showToast(result.message, 'success');
    });

    // Submit Form Thêm / Sửa Sách
    document.getElementById('book-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const form = e.target;
      const alertBox = document.getElementById('book-form-alert');
      alertBox.hidden = true;

      if (!form.reportValidity()) return;

      const editCode = document.getElementById('book-edit-mode').value;
      const ma_sach = document.getElementById('book-code').value.trim().toUpperCase();
      const ten_sach = document.getElementById('book-title').value.trim();
      const tac_gia = document.getElementById('book-author').value.trim();
      const the_loai = document.getElementById('book-category').value.trim();
      const tong_so_luong = parseInt(document.getElementById('book-total').value, 10);
      const so_luong_ton = parseInt(document.getElementById('book-stock').value, 10);
      const tinh_trang = document.getElementById('book-status').value;

      if (so_luong_ton > tong_so_luong) {
        alertBox.textContent = 'Số lượng tồn kho không thể lớn hơn tổng số lượng sách.';
        alertBox.hidden = false;
        return;
      }

      if (editCode) {
        const book = findBook(editCode);
        if (book) {
          book.ten_sach = ten_sach;
          book.tac_gia = tac_gia;
          book.the_loai = the_loai;
          book.tong_so_luong = tong_so_luong;
          book.so_luong_ton = so_luong_ton;
          book.tinh_trang = tinh_trang;
        }
        showToast(`Đã cập nhật sách ${editCode}.`, 'success');
      } else {
        if (findBook(ma_sach)) {
          alertBox.textContent = `Mã sách "${ma_sach}" đã tồn tại. Vui lòng chọn mã khác.`;
          alertBox.hidden = false;
          return;
        }
        state.sach.push({
          ma_sach,
          ten_sach,
          tac_gia,
          the_loai,
          tong_so_luong,
          so_luong_ton,
          tinh_trang
        });
        showToast(`Đã thêm sách "${ten_sach}" (${ma_sach}).`, 'success');
      }

      saveState();
      renderAll();
      document.getElementById('book-dialog').close();
    });

    // Submit Form Thêm / Sửa Độc giả
    document.getElementById('reader-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const form = e.target;
      const alertBox = document.getElementById('reader-form-alert');
      alertBox.hidden = true;

      if (!form.reportValidity()) return;

      const editCode = document.getElementById('reader-edit-mode').value;
      const ma_dg = document.getElementById('reader-code').value.trim().toUpperCase();
      const ho_ten = document.getElementById('reader-name').value.trim();
      const lop_sdt = document.getElementById('reader-contact').value.trim();
      const trang_thai_the = document.getElementById('reader-status').value;

      if (editCode) {
        const reader = findReader(editCode);
        if (reader) {
          reader.ho_ten = ho_ten;
          reader.lop_sdt = lop_sdt;
          reader.trang_thai_the = trang_thai_the;
        }
        showToast(`Đã cập nhật thông tin độc giả ${editCode}.`, 'success');
      } else {
        if (findReader(ma_dg)) {
          alertBox.textContent = `Mã độc giả "${ma_dg}" đã tồn tại. Vui lòng chọn mã khác.`;
          alertBox.hidden = false;
          return;
        }
        state.docGia.push({
          ma_dg,
          ho_ten,
          lop_sdt,
          trang_thai_the
        });
        showToast(`Đã thêm độc giả "${ho_ten}" (${ma_dg}).`, 'success');
      }

      saveState();
      renderAll();
      document.getElementById('reader-dialog').close();
    });

    // Event Delegation cho các nút thao tác trong bảng Phiếu mượn
    document.getElementById('loans-tbody').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const { action, id } = btn.dataset;
      if (action === 'renew') renewLoan(id);
      else if (action === 'return') returnLoan(id);
    });

    // Event Delegation cho bảng Kho sách
    document.getElementById('books-tbody').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const { action, id } = btn.dataset;
      const book = findBook(id);
      if (!book) return;

      if (action === 'quick-borrow') {
        openBorrowDialog(book.ma_sach);
      } else if (action === 'edit-book') {
        openBookDialog(book);
      } else if (action === 'delete-book') {
        const hasActiveLoan = state.phieuMuon.some(
          (p) => p.ma_sach === id && (!p.ngay_tra || p.ngay_tra.trim() === '')
        );
        if (hasActiveLoan) {
          showToast(`Không thể xóa sách ${id} vì vẫn đang có phiếu mượn chưa trả.`, 'error');
          return;
        }
        state.sach = state.sach.filter((s) => s.ma_sach !== id);
        saveState();
        renderAll();
        showToast(`Đã xóa sách ${id} khỏi kho.`, 'info');
      }
    });

    // Event Delegation cho bảng Độc giả
    document.getElementById('readers-tbody').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const { action, id } = btn.dataset;
      const reader = findReader(id);
      if (!reader) return;

      if (action === 'edit-reader') {
        openReaderDialog(reader);
      } else if (action === 'delete-reader') {
        const hasActiveLoan = state.phieuMuon.some(
          (p) => p.ma_dg === id && (!p.ngay_tra || p.ngay_tra.trim() === '')
        );
        if (hasActiveLoan) {
          showToast(`Không thể xóa độc giả ${id} vì vẫn còn sách đang mượn chưa trả.`, 'error');
          return;
        }
        state.docGia = state.docGia.filter((dg) => dg.ma_dg !== id);
        saveState();
        renderAll();
        showToast(`Đã xóa độc giả ${id}.`, 'info');
      }
    });
  }

  // ==================== INIT ====================
  function init() {
    const today = window.CalendarDate.todayISO();
    document.getElementById('today-display').textContent =
      `📅 Hôm nay: ${window.CalendarDate.formatVN(today)}`;

    setupDialogLightDismissFallback();
    setupAccessibleValidationSync();
    loadState();
    bindEvents();
    renderAll();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
