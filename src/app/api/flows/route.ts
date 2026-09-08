import { NextResponse } from "next/server";
import { pool, initDatabase } from "@/lib/db";

export async function GET(request: Request) {
  try {
    await initDatabase();
    const { searchParams } = new URL(request.url);
    const vaultId = searchParams.get("vaultId");
    const tag = searchParams.get("tag");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let query = `
      SELECT id, title, amount::float as amount, type, 
             from_vault_id as "fromVaultId", to_vault_id as "toVaultId",
             from_title as "from", to_title as "to",
             tag, is_actual as "isActual",
             TO_CHAR(flow_date, 'DD/MM/YYYY') as date,
             flow_date as "rawDate"
      FROM flows
      WHERE 1=1
    `;
    const params: any[] = [];
    let pIdx = 1;

    if (vaultId) {
      query += ` AND (from_vault_id = $${pIdx} OR to_vault_id = $${pIdx})`;
      params.push(vaultId);
      pIdx++;
    }

    if (tag) {
      query += ` AND tag = $${pIdx}`;
      params.push(tag);
      pIdx++;
    }

    if (startDate) {
      query += ` AND flow_date >= $${pIdx}`;
      params.push(startDate);
      pIdx++;
    }

    if (endDate) {
      query += ` AND flow_date <= $${pIdx}`;
      params.push(endDate);
      pIdx++;
    }

    query += ` ORDER BY flow_date DESC, created_at DESC;`;

    const result = await pool.query(query, params);
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
    const {
      title,
      amount,
      type, // 'income' | 'expense' | 'transfer'
      fromVaultId = null,
      toVaultId = null,
      fromTitle = "",
      toTitle = "",
      tag = "Giao dịch",
      isActual = true,
      flowDate = new Date().toISOString().split("T")[0],
    } = body;

    const numAmount = parseFloat(amount);
    if (!title || isNaN(numAmount) || numAmount <= 0 || !type) {
      await client.query("ROLLBACK");
      return NextResponse.json({ success: false, error: "Dữ liệu giao dịch không hợp lệ" }, { status: 400 });
    }

    const id = `f_${Date.now()}`;

    // 1. Cập nhật số dư kho nếu là giao dịch thực tế (isActual = true)
    if (isActual) {
      if (type === "transfer") {
        if (!fromVaultId || !toVaultId) {
          await client.query("ROLLBACK");
          return NextResponse.json({ success: false, error: "Chuyển khoản cần chọn đủ Kho nguồn và Kho đích" }, { status: 400 });
        }
        await client.query(`UPDATE vaults SET balance = balance - $1 WHERE id = $2`, [numAmount, fromVaultId]);
        await client.query(`UPDATE vaults SET balance = balance + $1 WHERE id = $2`, [numAmount, toVaultId]);
      } else if (type === "expense") {
        if (fromVaultId) {
          await client.query(`UPDATE vaults SET balance = balance - $1 WHERE id = $2`, [numAmount, fromVaultId]);
        }
      } else if (type === "income") {
        if (toVaultId) {
          await client.query(`UPDATE vaults SET balance = balance + $1 WHERE id = $2`, [numAmount, toVaultId]);
        }
      }
    }

    // 2. Ghi bản ghi dòng chảy
    const flowRes = await client.query(
      `INSERT INTO flows (id, title, amount, type, from_vault_id, to_vault_id, from_title, to_title, tag, is_actual, flow_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, title, amount::float as amount, type, 
                 from_vault_id as "fromVaultId", to_vault_id as "toVaultId",
                 from_title as "from", to_title as "to",
                 tag, is_actual as "isActual",
                 TO_CHAR(flow_date, 'DD/MM/YYYY') as date;`,
      [id, title, numAmount, type, fromVaultId, toVaultId, fromTitle, toTitle, tag, isActual, flowDate]
    );

    await client.query("COMMIT");
    return NextResponse.json({ success: true, data: flowRes.rows[0] });
  } catch (error: any) {
    await client.query("ROLLBACK");
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
