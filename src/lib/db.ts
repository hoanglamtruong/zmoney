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
    // 1. Kho chứa (Pool)
    await client.query(`
      CREATE TABLE IF NOT EXISTS vaults (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        balance NUMERIC(18, 2) NOT NULL DEFAULT 0,
        description TEXT,
        is_locked BOOLEAN NOT NULL DEFAULT false,
        locked_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
        is_closed BOOLEAN NOT NULL DEFAULT false,
        last_recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Dòng chảy (Flow)
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
        parent_flow_id VARCHAR(50),
        is_reconcile BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Nghĩa vụ (Obligation - Nợ & Thuế)
    await client.query(`
      CREATE TABLE IF NOT EXISTS obligations (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL, -- 'receivable' (phải thu) | 'payable' (phải trả) | 'tax' (thuế)
        role VARCHAR(50) NOT NULL DEFAULT 'debtor', -- 'creditor' (chủ nợ - phải thu) | 'debtor' (con nợ - phải trả)
        amount NUMERIC(18, 2) NOT NULL,
        partner VARCHAR(255),
        formula VARCHAR(255),
        interest VARCHAR(100),
        due_date DATE,
        status VARCHAR(50) DEFAULT 'normal',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Đối chiếu số dư (Reconciliation audits)
    await client.query(`
      CREATE TABLE IF NOT EXISTS reconciliations (
        id VARCHAR(50) PRIMARY KEY,
        vault_id VARCHAR(50) NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
        system_balance NUMERIC(18, 2) NOT NULL,
        actual_balance NUMERIC(18, 2) NOT NULL,
        difference NUMERIC(18, 2) NOT NULL,
        reason TEXT,
        action_taken VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed data nếu bảng vaults trống
    const { rows: vaultCount } = await client.query(`SELECT COUNT(*) FROM vaults;`);
    if (parseInt(vaultCount[0].count, 10) === 0) {
      await client.query(`
        INSERT INTO vaults (id, name, type, balance, description, is_locked, locked_amount) VALUES
          ('v1', 'Ví Tiền Mặt', 'cash', 15400000, 'Tiền mặt két sắt', false, 0),
          ('v2', 'Tài Khoản MB Bank', 'bank', 142850000, 'TK kinh doanh chính', false, 0),
          ('v3', 'Quỹ Dự Phòng Thuế (Khóa)', 'reserve', 12000000, 'Quỹ dự phòng nộp thuế theo kỳ', true, 9600000),
          ('v4', 'Ví MoMo Kinh Doanh', 'ewallet', 6200000, 'Thanh toán đơn lẻ', false, 0);

        INSERT INTO flows (id, title, amount, type, from_vault_id, to_vault_id, from_title, to_title, tag, is_actual, flow_date) VALUES
          ('f1', 'Khách trả tiền hợp đồng quảng cáo', 25000000, 'income', NULL, 'v2', 'Khách hàng ZeeBee', 'Tài Khoản MB Bank', 'Doanh thu', true, '2026-09-08'),
          ('f2', 'Rút tiền mặt bổ sung quỹ két', 10000000, 'transfer', 'v2', 'v1', 'Tài Khoản MB Bank', 'Ví Tiền Mặt', 'Nội bộ', true, '2026-09-07'),
          ('f3', 'Chi phí máy chủ & dịch vụ cloud', 3500000, 'expense', 'v2', NULL, 'Tài Khoản MB Bank', 'Cloudflare/AWS', 'Vận hành', true, '2026-09-06'),
          ('f4', 'Thu hồi nợ đối tác vật tư', 12000000, 'income', NULL, 'v2', 'Công ty In Ấn ABC', 'Tài Khoản MB Bank', 'Thu nợ', true, '2026-09-05'),
          ('f5', 'Doanh thu khóa học Online (Dự kiến)', 15000000, 'income', NULL, 'v2', 'Học viên K12', 'Tài Khoản MB Bank', 'Doanh thu', false, '2026-09-15');

        INSERT INTO obligations (id, title, type, role, amount, partner, formula, interest, due_date, status) VALUES
          ('o1', 'Hợp đồng thiết kế Zlink (Phải thu)', 'receivable', 'creditor', 30000000, 'Công ty Cổ Phần X', NULL, '0%', '2026-09-15', 'normal'),
          ('o2', 'Nhà cung cấp thiết bị Dell (Phải trả)', 'payable', 'debtor', 18500000, 'Đại lý Phân Phối ICT', NULL, '1.2%/tháng', '2026-09-10', 'urgent'),
          ('o3', 'Thuế GTGT & TNCN Quý 3/2026', 'tax', 'debtor', 9600000, 'Chi cục Thuế khu vực', 'Khoán 1.5% doanh thu dòng chảy', NULL, '2026-09-30', 'normal');
      `);
    }
  } finally {
    client.release();
  }
}
