/**
 * Dữ liệu mẫu khởi tạo ban đầu cho Hệ thống Quản lý Thư viện (Lab 02)
 * Tự động neo theo ngày hiện tại để luôn có đủ 4 kịch bản kiểm thử:
 * 1. Đang mượn trong hạn (chưa gia hạn)
 * 2. Đang mượn đã gia hạn 1 lần (+3 ngày)
 * 3. Đã quá hạn (chặn gia hạn)
 * 4. Đã trả về (cột Ngày trả có dữ liệu, badge xanh lá #16a34a "Đã trả về")
 */

(function (global) {
  'use strict';

  /**
   * Tiện ích xử lý ngày lịch không lệch múi giờ (Location-agnostic PlainDate).
   * Ưu tiên dùng Temporal.PlainDate nếu trình duyệt hỗ trợ, có fallback lịch cục bộ.
   */
  const CalendarDate = {
    todayISO() {
      if (typeof Temporal !== 'undefined' && Temporal.Now) {
        return Temporal.Now.plainDateISO().toString();
      }
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    },

    addDays(isoDate, days) {
      if (typeof Temporal !== 'undefined' && Temporal.PlainDate) {
        return Temporal.PlainDate.from(isoDate).add({ days }).toString();
      }
      const [y, m, d] = isoDate.split('-').map(Number);
      const dt = new Date(y, m - 1, d + days);
      const ry = dt.getFullYear();
      const rm = String(dt.getMonth() + 1).padStart(2, '0');
      const rd = String(dt.getDate()).padStart(2, '0');
      return `${ry}-${rm}-${rd}`;
    },

    compare(isoA, isoB) {
      if (typeof Temporal !== 'undefined' && Temporal.PlainDate) {
        return Temporal.PlainDate.compare(
          Temporal.PlainDate.from(isoA),
          Temporal.PlainDate.from(isoB)
        );
      }
      if (isoA === isoB) return 0;
      return isoA < isoB ? -1 : 1;
    },

    formatVN(isoDate) {
      if (!isoDate) return '-';
      const [y, m, d] = isoDate.split('-');
      if (!y || !m || !d) return isoDate;
      return `${d}/${m}/${y}`;
    }
  };

  function createInitialLibraryData() {
    const today = CalendarDate.todayISO();

    const docGia = [
      {
        ma_dg: 'DG001',
        ho_ten: 'Đoàn Văn Thiên Hoàng',
        lop_sdt: 'K28-TPM1 · 0905 112 233',
        trang_thai_the: 'Hoạt động'
      },
      {
        ma_dg: 'DG002',
        ho_ten: 'Nguyễn Thị Minh Thư',
        lop_sdt: 'K28-CNTT2 · 0914 456 789',
        trang_thai_the: 'Hoạt động'
      },
      {
        ma_dg: 'DG003',
        ho_ten: 'Trần Quốc Bảo',
        lop_sdt: 'K27-HTTT1 · 0987 654 321',
        trang_thai_the: 'Hoạt động'
      },
      {
        ma_dg: 'DG004',
        ho_ten: 'Lê Hoàng Phương Vy',
        lop_sdt: 'K29-KTPM3 · 0935 889 900',
        trang_thai_the: 'Hoạt động'
      },
      {
        ma_dg: 'DG005',
        ho_ten: 'Phạm Đức Anh',
        lop_sdt: 'K27-MMT1 · 0972 334 455',
        trang_thai_the: 'Tạm khóa'
      }
    ];

    const sach = [
      {
        ma_sach: 'S001',
        ten_sach: 'Clean Code — Mã sạch và con đường nghệ nhân',
        tac_gia: 'Robert C. Martin',
        the_loai: 'Công nghệ thông tin',
        tong_so_luong: 5,
        so_luong_ton: 4, // 1 đang mượn (PM001)
        tinh_trang: 'Còn kho'
      },
      {
        ma_sach: 'S002',
        ten_sach: 'Cấu trúc dữ liệu và Giải thuật',
        tac_gia: 'Lê Minh Hoàng',
        the_loai: 'Khoa học máy tính',
        tong_so_luong: 4,
        so_luong_ton: 3, // 1 đang mượn (PM002)
        tinh_trang: 'Còn kho'
      },
      {
        ma_sach: 'S003',
        ten_sach: 'Cơ sở dữ liệu Quan hệ & SQL Thực chiến',
        tac_gia: 'Nguyễn Bá Tường',
        the_loai: 'Cơ sở dữ liệu',
        tong_so_luong: 3,
        so_luong_ton: 2, // 1 quá hạn (PM003)
        tinh_trang: 'Còn kho'
      },
      {
        ma_sach: 'S004',
        ten_sach: 'Thiết kế Giao diện UI/UX Hiện đại',
        tac_gia: 'Don Norman',
        the_loai: 'Thiết kế sản phẩm',
        tong_so_luong: 4,
        so_luong_ton: 4, // PM004 đã trả về
        tinh_trang: 'Còn kho'
      },
      {
        ma_sach: 'S005',
        ten_sach: 'Lập trình JavaScript Nâng cao (ES2025)',
        tac_gia: 'Kyle Simpson',
        the_loai: 'Lập trình Web',
        tong_so_luong: 1,
        so_luong_ton: 0, // 1 đang mượn (PM005) -> dùng để test chặn mượn khi tồn kho = 0
        tinh_trang: 'Đang mượn'
      },
      {
        ma_sach: 'S006',
        ten_sach: 'Mạng máy tính và An toàn Thông tin',
        tac_gia: 'Andrew S. Tanenbaum',
        the_loai: 'Mạng & Bảo mật',
        tong_so_luong: 2,
        so_luong_ton: 2,
        tinh_trang: 'Còn kho'
      }
    ];

    const phieuMuon = [
      // Kịch bản 1: Đang mượn trong hạn, chưa gia hạn (so_lan_gia_han = 0)
      {
        ma_phieu: 'PM001',
        ma_dg: 'DG001',
        ma_sach: 'S001',
        ngay_muon: CalendarDate.addDays(today, -2),
        han_tra: CalendarDate.addDays(today, 5), // ngay_muon + 7 ngày
        so_lan_gia_han: 0,
        ngay_tra: '',
        trang_thai: 'Đang mượn'
      },
      // Kịch bản 2: Đang mượn đã gia hạn 1 lần (+3 ngày => tổng 10 ngày)
      {
        ma_phieu: 'PM002',
        ma_dg: 'DG002',
        ma_sach: 'S002',
        ngay_muon: CalendarDate.addDays(today, -5),
        han_tra: CalendarDate.addDays(today, 5), // ngay_muon + 7 + 3 ngày
        so_lan_gia_han: 1,
        ngay_tra: '',
        trang_thai: 'Đang mượn'
      },
      // Kịch bản 3: Đã quá hạn (han_tra < today => chặn gia hạn, badge đỏ Quá hạn)
      {
        ma_phieu: 'PM003',
        ma_dg: 'DG003',
        ma_sach: 'S003',
        ngay_muon: CalendarDate.addDays(today, -12),
        han_tra: CalendarDate.addDays(today, -5),
        so_lan_gia_han: 0,
        ngay_tra: '',
        trang_thai: 'Quá hạn'
      },
      // Kịch bản 4: Đã trả về (cột Ngày trả có dữ liệu, badge xanh lá #16a34a "Đã trả về")
      {
        ma_phieu: 'PM004',
        ma_dg: 'DG004',
        ma_sach: 'S004',
        ngay_muon: CalendarDate.addDays(today, -10),
        han_tra: CalendarDate.addDays(today, -3),
        so_lan_gia_han: 0,
        ngay_tra: CalendarDate.addDays(today, -4),
        trang_thai: 'Đã trả về'
      },
      // Kịch bản 5: Đang mượn cuốn S005 (hết tồn kho = 0) để test chặn mượn & hoàn kho khi trả
      {
        ma_phieu: 'PM005',
        ma_dg: 'DG001',
        ma_sach: 'S005',
        ngay_muon: CalendarDate.addDays(today, -1),
        han_tra: CalendarDate.addDays(today, 6),
        so_lan_gia_han: 0,
        ngay_tra: '',
        trang_thai: 'Đang mượn'
      }
    ];

    return { docGia, sach, phieuMuon };
  }

  global.CalendarDate = CalendarDate;
  global.createInitialLibraryData = createInitialLibraryData;
})(window);
