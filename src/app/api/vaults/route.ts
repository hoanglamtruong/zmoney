import { NextResponse } from "next/server";
import { pool, initDatabase } from "@/lib/db";

export async function GET() {
  try {
    await initDatabase();
    const result = await pool.query(`
      SELECT id, name, type, balance::float as balance, description as desc,
             is_locked as "isLocked", locked_amount::float as "lockedAmount",
             is_closed as "isClosed",
             TO_CHAR(last_recorded_at, 'DD/MM/YYYY HH24:MI') as "lastRecordedAt",
             EXTRACT(DAY FROM (NOW() - last_recorded_at))::int as "daysInactive"
      FROM vaults
      WHERE is_closed = false
      ORDER BY created_at ASC;
    `);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDatabase();
    const body = await request.json();
    const { name, type, balance = 0, description = "", isLocked = false, lockedAmount = 0 } = body;

    if (!name || !type) {
      return NextResponse.json({ success: false, error: "Tên và loại BoMo là bắt buộc" }, { status: 400 });
    }

    const id = `v_${Date.now()}`;
    const result = await pool.query(
      `INSERT INTO vaults (id, name, type, balance, description, is_locked, locked_amount) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, name, type, balance::float as balance, description as desc,
                 is_locked as "isLocked", locked_amount::float as "lockedAmount";`,
      [id, name, type, balance, description, isLocked, lockedAmount]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await initDatabase();
    const body = await request.json();
    const { id, name, type, balance, description = "", isLocked = false, lockedAmount = 0 } = body;

    if (!id || !name || !type) {
      return NextResponse.json({ success: false, error: "Thiếu thông tin BoMo cần cập nhật" }, { status: 400 });
    }

    let query = "";
    let params: any[] = [];

    if (balance !== undefined && balance !== null) {
      query = `UPDATE vaults 
               SET name = $1, type = $2, balance = $3, description = $4, is_locked = $5, locked_amount = $6, last_recorded_at = NOW()
               WHERE id = $7
               RETURNING id, name, type, balance::float as balance, description as desc,
                         is_locked as "isLocked", locked_amount::float as "lockedAmount",
                         is_closed as "isClosed",
                         TO_CHAR(last_recorded_at, 'DD/MM/YYYY HH24:MI') as "lastRecordedAt";`;
      params = [name, type, balance, description, isLocked, lockedAmount, id];
    } else {
      query = `UPDATE vaults 
               SET name = $1, type = $2, description = $3, is_locked = $4, locked_amount = $5, last_recorded_at = NOW()
               WHERE id = $6
               RETURNING id, name, type, balance::float as balance, description as desc,
                         is_locked as "isLocked", locked_amount::float as "lockedAmount",
                         is_closed as "isClosed",
                         TO_CHAR(last_recorded_at, 'DD/MM/YYYY HH24:MI') as "lastRecordedAt";`;
      params = [name, type, description, isLocked, lockedAmount, id];
    }

    const result = await pool.query(query, params);

    if (result.rowCount === 0) {
      return NextResponse.json({ success: false, error: "Không tìm thấy BoMo" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const client = await pool.connect();
  try {
    await initDatabase();
    const body = await request.json();
    const { id, targetVaultId } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Thiếu mã BoMo cần xóa" }, { status: 400 });
    }

    await client.query("BEGIN");

    // Lấy thông tin BoMo cần xóa
    const vRes = await client.query(`SELECT * FROM vaults WHERE id = $1 AND is_closed = false`, [id]);
    if (vRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ success: false, error: "Không tìm thấy BoMo hoặc BoMo đã bị xóa" }, { status: 404 });
    }

    const currentVault = vRes.rows[0];
    const currentBalance = parseFloat(currentVault.balance) || 0;

    // Bắt buộc số dư phải bằng 0 đ để xóa
    if (Math.abs(currentBalance) > 0.001) {
      if (!targetVaultId) {
        await client.query("ROLLBACK");
        return NextResponse.json({ 
          success: false, 
          error: "BoMo có số dư khác 0 đ. Bắt buộc chuyển toàn bộ số dư (+/-) sang BoMo khác trước khi xóa." 
        }, { status: 400 });
      }

      if (targetVaultId === id) {
        await client.query("ROLLBACK");
        return NextResponse.json({ success: false, error: "Không thể kết chuyển sang chính BoMo cần xóa" }, { status: 400 });
      }

      const tRes = await client.query(`SELECT * FROM vaults WHERE id = $1 AND is_closed = false`, [targetVaultId]);
      if (tRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ success: false, error: "BoMo tiếp nhận không tồn tại hoặc đã bị đóng" }, { status: 404 });
      }
      const targetVault = tRes.rows[0];

      // Target vault nhận số dư (cộng currentBalance: nếu currentBalance < 0 thì nhận gánh nợ, nếu > 0 thì nhận tiền)
      await client.query(
        `UPDATE vaults SET balance = balance + $1, last_recorded_at = NOW() WHERE id = $2`,
        [currentBalance, targetVaultId]
      );

      // Tạo dòng chảy (Flow) chuyển giao
      const flowId = `f_close_${Date.now()}`;
      const flowAmount = Math.abs(currentBalance);
      const isPositive = currentBalance > 0;
      
      const flowTitle = isPositive 
        ? `Chuyển toàn bộ số dư (+${currentBalance.toLocaleString('vi-VN')}₫) khi đóng BoMo "${currentVault.name}"`
        : `Chuyển giao dư nợ (${currentBalance.toLocaleString('vi-VN')}₫) khi đóng BoMo "${currentVault.name}"`;

      await client.query(
        `INSERT INTO flows (id, title, amount, type, from_vault_id, to_vault_id, from_title, to_title, tag, is_actual, flow_date)
         VALUES ($1, $2, $3, 'transfer', $4, $5, $6, $7, 'Tất toán BoMo', true, CURRENT_DATE)`,
        [
          flowId,
          flowTitle,
          flowAmount,
          isPositive ? currentVault.id : targetVault.id,
          isPositive ? targetVault.id : currentVault.id,
          isPositive ? currentVault.name : targetVault.name,
          isPositive ? targetVault.name : currentVault.name
        ]
      );

      // Đưa số dư BoMo hiện tại về 0
      await client.query(`UPDATE vaults SET balance = 0 WHERE id = $1`, [id]);
    }

    // Đánh dấu BoMo đã đóng (is_closed = true)
    await client.query(`UPDATE vaults SET is_closed = true WHERE id = $1`, [id]);

    await client.query("COMMIT");
    return NextResponse.json({ success: true, message: "Đã tất toán và xóa BoMo thành công" });
  } catch (error: any) {
    await client.query("ROLLBACK");
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
