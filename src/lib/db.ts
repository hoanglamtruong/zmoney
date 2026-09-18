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

    // 5. Khoản Vay & Cho Vay (Chủ Nợ & Con Nợ)
    await client.query(`
      CREATE TABLE IF NOT EXISTS loans (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL, -- 'creditor' (Tôi là Chủ Nợ) | 'debtor' (Tôi là Con Nợ)
        partner_name VARCHAR(255),
        linked_vault_id VARCHAR(50) REFERENCES vaults(id) ON DELETE SET NULL,
        creditor_vault_id VARCHAR(50) REFERENCES vaults(id) ON DELETE SET NULL,
        creditor_name VARCHAR(255),
        debtor_vault_id VARCHAR(50) REFERENCES vaults(id) ON DELETE SET NULL,
        debtor_name VARCHAR(255),
        loan_context VARCHAR(50) DEFAULT 'internal', -- 'internal' | 'lending' | 'borrowing'
        start_date DATE NOT NULL DEFAULT CURRENT_DATE,
        due_date DATE,
        amount NUMERIC(18, 2) NOT NULL,
        paid_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
        interest_rate NUMERIC(6, 2) DEFAULT 0,
        interest_type VARCHAR(50) DEFAULT 'none',
        interest_due_term VARCHAR(100) DEFAULT 'end_term',
        confirmed_creditor BOOLEAN NOT NULL DEFAULT true,
        confirmed_debtor BOOLEAN NOT NULL DEFAULT false,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE loans ADD COLUMN IF NOT EXISTS creditor_vault_id VARCHAR(50) REFERENCES vaults(id) ON DELETE SET NULL;
      ALTER TABLE loans ADD COLUMN IF NOT EXISTS creditor_name VARCHAR(255);
      ALTER TABLE loans ADD COLUMN IF NOT EXISTS debtor_vault_id VARCHAR(50) REFERENCES vaults(id) ON DELETE SET NULL;
      ALTER TABLE loans ADD COLUMN IF NOT EXISTS debtor_name VARCHAR(255);
      ALTER TABLE loans ADD COLUMN IF NOT EXISTS loan_context VARCHAR(50) DEFAULT 'internal';
    `);

    // Đồng bộ creditor_name và debtor_name cho các bản ghi cũ nếu bị null
    await client.query(`
      UPDATE loans SET
        creditor_name = CASE 
          WHEN role = 'creditor' THEN COALESCE((SELECT name FROM vaults WHERE id = linked_vault_id), 'MoBo Của Tôi')
          ELSE COALESCE(partner_name, 'MoBo Chủ Nợ')
        END,
        debtor_name = CASE 
          WHEN role = 'debtor' THEN COALESCE((SELECT name FROM vaults WHERE id = linked_vault_id), 'MoBo Của Tôi')
          ELSE COALESCE(partner_name, 'MoBo Con Nợ')
        END,
        loan_context = CASE 
          WHEN role = 'creditor' THEN 'lending'
          ELSE 'borrowing'
        END
      WHERE creditor_name IS NULL OR debtor_name IS NULL;
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

    // Seed data nếu bảng loans trống
    const { rows: loanCount } = await client.query(`SELECT COUNT(*) FROM loans;`);
    if (parseInt(loanCount[0].count, 10) === 0) {
      // Lấy id các vault có sẵn nếu có
      const vQuery = await client.query(`SELECT id, name FROM vaults WHERE is_closed = false ORDER BY id ASC LIMIT 2;`);
      const v1 = vQuery.rows[0];
      const v2 = vQuery.rows[1] || vQuery.rows[0];

      await client.query(`
        INSERT INTO loans (
          id, title, role, partner_name, linked_vault_id,
          creditor_vault_id, creditor_name, debtor_vault_id, debtor_name, loan_context,
          start_date, due_date, amount, paid_amount, interest_rate, interest_type, interest_due_term,
          confirmed_creditor, confirmed_debtor, status, notes
        ) VALUES
          ('loan_1', 'Cho MoBo Đối tác Nam mượn vốn nhập hàng', 'creditor', 'MoBo Anh Nam (Hải Phòng)', $1,
           $1, $2, NULL, 'MoBo Anh Nam (Hải Phòng)', 'lending',
           CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '45 days', 30000000, 10000000, 1.0, 'monthly', 'Hàng tháng ngày 15',
           true, true, 'active', 'Cam kết hoàn trả qua MoBo liên kết'),
          ('loan_2', 'Vay vốn hạn mức từ MoBo Ngân Hàng Techcombank', 'debtor', 'MoBo Techcombank', $3,
           NULL, 'MoBo Techcombank (Hội sở)', $3, $4, 'borrowing',
           CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '60 days', 50000000, 0, 8.5, 'yearly', 'Cuối kỳ cùng gốc',
           true, false, 'active', 'Hạn mức kinh doanh ngắn hạn');
      `, [v1 ? v1.id : null, v1 ? v1.name : 'MoBo Ví Tiền Mặt', v2 ? v2.id : null, v2 ? v2.name : 'MoBo Tài Khoản MB Bank']);
    }
  } finally {
    client.release();
  }
}
