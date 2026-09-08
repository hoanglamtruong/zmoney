import { NextResponse } from "next/server";
import { pool, initDatabase } from "@/lib/db";

export async function GET() {
  try {
    await initDatabase();
    const result = await pool.query(`
      SELECT r.id, r.vault_id as "vaultId", v.name as "vaultName",
             r.system_balance::float as "systemBalance",
             r.actual_balance::float as "actualBalance",
             r.difference::float as "difference",
             r.reason, r.action_taken as "actionTaken",
             TO_CHAR(r.created_at, 'DD/MM/YYYY HH24:MI') as "createdAt"
      FROM reconciliations r
      JOIN vaults v ON r.vault_id = v.id
      ORDER BY r.created_at DESC;
    `);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    await initDatabase();
    await client.query("BEGIN");

    const body = await request.json();
    const { vaultId, actualBalance, reason = "Điều chỉnh chưa rõ nguyên nhân", assignAsFlow = false, flowTag = "Chênh lệch" } = body;

    const numActual = parseFloat(actualBalance);
    if (!vaultId || isNaN(numActual)) {
      await client.query("ROLLBACK");
      return NextResponse.json({ success: false, error: "Dữ liệu đối chiếu không hợp lệ" }, { status: 400 });
    }

    // 1. Lấy số dư hiện tại của Kho trong hệ thống
    const vRes = await client.query(`SELECT id, name, balance::float as balance FROM vaults WHERE id = $1`, [vaultId]);
    if (vRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ success: false, error: "Kho chứa không tồn tại" }, { status: 404 });
    }

    const currentSystemBalance = vRes.rows[0].balance;
    const difference = numActual - currentSystemBalance; // > 0: thừa tiền, < 0: thiếu tiền

    const recId = `rec_${Date.now()}`;

    // 2. Không bao giờ ghi đè trực tiếp mà luôn sinh Flow điều chỉnh
    if (difference !== 0) {
      const flowId = `f_${Date.now()}`;
      const isPositive = difference > 0;
      const absDiff = Math.abs(difference);

      await client.query(
        `INSERT INTO flows (id, title, amount, type, from_vault_id, to_vault_id, from_title, to_title, tag, is_actual, is_reconcile)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, true)`,
        [
          flowId,
          assignAsFlow ? `Điều chỉnh đối chiếu: ${reason}` : `Điều chỉnh chưa rõ nguyên nhân (${vRes.rows[0].name})`,
          absDiff,
          isPositive ? "income" : "expense",
          isPositive ? null : vaultId,
          isPositive ? vaultId : null,
          isPositive ? "Chênh lệch đối chiếu" : vRes.rows[0].name,
          isPositive ? vRes.rows[0].name : "Chênh lệch đối chiếu",
          flowTag,
        ]
      );

      // Cập nhật số dư kho
      await client.query(
        `UPDATE vaults SET balance = $1, last_recorded_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [numActual, vaultId]
      );
    } else {
      // Dù số dư khớp, cập nhật thời điểm đối chiếu để ghi nhận kỷ luật ghi chép
      await client.query(
        `UPDATE vaults SET last_recorded_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [vaultId]
      );
    }

    // 3. Ghi nhật ký Reconciliation
    const recRes = await client.query(
      `INSERT INTO reconciliations (id, vault_id, system_balance, actual_balance, difference, reason, action_taken)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, vault_id as "vaultId", system_balance::float as "systemBalance", actual_balance::float as "actualBalance", difference::float as "difference", reason, action_taken as "actionTaken"`,
      [
        recId,
        vaultId,
        currentSystemBalance,
        numActual,
        difference,
        reason,
        difference === 0 ? "Khớp hoàn toàn" : (assignAsFlow ? "Tạo Dòng chảy cụ thể" : "Điều chỉnh chưa rõ nguyên nhân"),
      ]
    );

    await client.query("COMMIT");
    return NextResponse.json({ success: true, data: recRes.rows[0] });
  } catch (error: any) {
    await client.query("ROLLBACK");
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
