import { Pool } from "pg";

const globalForPg = globalThis as unknown as {
  pgPool: Pool | undefined;
};

export const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString:
      process.env.DATABASE_URL ||
      "postgresql://zmoney:zmoney_secure_pass@localhost:5442/zmoney_db",
  });

if (process.env.NODE_ENV !== "production") globalForPg.pgPool = pool;

export async function initDatabase() {
  const client = await pool.connect();
  try {
    // 1. Kho chứa
    await client.query(`
      CREATE TABLE IF NOT EXISTS vaults (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        balance NUMERIC(18, 2) NOT NULL DEFAULT 0,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Dòng chảy
    await client.query(`
      CREATE TABLE IF NOT EXISTS flows (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        amount NUMERIC(18, 2) NOT NULL,
        type VARCHAR(50) NOT NULL,
        from_vault_id VARCHAR(50),
        to_vault_id VARCHAR(50),
        from_title VARCHAR(255),
        to_title VARCHAR(255),
        tag VARCHAR(100),
        is_actual BOOLEAN NOT NULL DEFAULT true,
        flow_date DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Nghĩa vụ
    await client.query(`
      CREATE TABLE IF NOT EXISTS obligations (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        amount NUMERIC(18, 2) NOT NULL,
        partner VARCHAR(255),
        formula VARCHAR(255),
        interest VARCHAR(100),
        due_date DATE,
        status VARCHAR(50) DEFAULT 'normal',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Kiểm tra và seed data ban đầu nếu bảng vaults trống
    const { rows: vaultCount } = await client.query(`SELECT COUNT(*) FROM vaults;`);
    if (parseInt(vaultCount[0].count, 10) === 0) {
      await client.query(`
        INSERT INTO vaults (id, name, type, balance, description) VALUES
          ('v1', 'Ví Tiền Mặt', 'cash', 15400000, 'Tiền mặt két sắt'),
          ('v2', 'Tài Khoản MB Bank', 'bank', 142850000, 'TK kinh doanh chính'),
          ('v3', 'Quỹ Dự Phòng Khẩn Cấp', 'reserve', 50000000, 'Gửi tiết kiệm linh hoạt'),
          ('v4', 'Ví MoMo Kinh Doanh', 'ewallet', 6200000, 'Thanh toán đơn lẻ');

        INSERT INTO flows (id, title, amount, type, from_vault_id, to_vault_id, from_title, to_title, tag, is_actual, flow_date) VALUES
          ('f1', 'Khách trả tiền hợp đồng quảng cáo', 25000000, 'income', NULL, 'v2', 'Khách hàng ZeeBee', 'Tài Khoản MB Bank', 'Doanh thu', true, '2026-09-08'),
          ('f2', 'Rút tiền mặt bổ sung quỹ két', 10000000, 'transfer', 'v2', 'v1', 'Tài Khoản MB Bank', 'Ví Tiền Mặt', 'Nội bộ', true, '2026-09-07'),
          ('f3', 'Chi phí máy chủ & dịch vụ cloud', 3500000, 'expense', 'v2', NULL, 'Tài Khoản MB Bank', 'Cloudflare/AWS', 'Vận hành', true, '2026-09-06'),
          ('f4', 'Thu hồi nợ đối tác vật tư', 12000000, 'income', NULL, 'v2', 'Công ty In Ấn ABC', 'Tài Khoản MB Bank', 'Thu nợ', true, '2026-09-05');

        INSERT INTO obligations (id, title, type, amount, partner, formula, interest, due_date, status) VALUES
          ('o1', 'Nợ phải thu: Hợp đồng thiết kế Zlink', 'receivable', 30000000, 'Công ty Cổ Phần X', NULL, '0%', '2026-09-15', 'normal'),
          ('o2', 'Nợ phải trả: Nhà cung cấp thiết bị Dell', 'payable', 18500000, 'Đại lý Phân Phối ICT', NULL, '1.2%/tháng', '2026-09-10', 'urgent'),
          ('o3', 'Thuế GTGT & TNCN Quý 3/2026', 'tax', 9600000, 'Chi cục Thuế khu vực', 'Khoán 1.5% doanh thu dòng chảy', NULL, '2026-09-30', 'normal');
      `);
    }
  } finally {
    client.release();
  }
}
