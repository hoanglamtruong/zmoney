import { NextResponse } from "next/server";
import { pool, initDatabase } from "@/lib/db";

export async function GET(request: Request) {
  try {
    await initDatabase();
    const { searchParams } = new URL(request.url);
    const vaultId = searchParams.get("vaultId");
    const tag = searchParams.get("tag");
    const status = searchParams.get("status"); // 'actual' | 'planned' | 'all'
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let query = `
      SELECT id, title, amount::float as amount, type, 
             from_vault_id as "fromVaultId", to_vault_id as "toVaultId",
             from_title as "from", to_title as "to",
             tag, is_actual as "isActual", is_reconcile as "isReconcile",
             COALESCE(priority, 'medium') as priority,
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

    if (status === "actual") {
      query += ` AND is_actual = true`;
    } else if (status === "planned") {
      query += ` AND is_actual = false`;
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
      priority = "medium", // 'high' | 'medium' | 'low'
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
        await client.query(`UPDATE vaults SET balance = balance - $1, last_recorded_at = CURRENT_TIMESTAMP WHERE id = $2`, [numAmount, fromVaultId]);
        await client.query(`UPDATE vaults SET balance = balance + $1, last_recorded_at = CURRENT_TIMESTAMP WHERE id = $2`, [numAmount, toVaultId]);
      } else if (type === "expense") {
        if (fromVaultId) {
          await client.query(`UPDATE vaults SET balance = balance - $1, last_recorded_at = CURRENT_TIMESTAMP WHERE id = $2`, [numAmount, fromVaultId]);
        }
      } else if (type === "income") {
        if (toVaultId) {
          await client.query(`UPDATE vaults SET balance = balance + $1, last_recorded_at = CURRENT_TIMESTAMP WHERE id = $2`, [numAmount, toVaultId]);
        }
      }
    }

    // 2. Ghi bản ghi dòng chảy
    const flowRes = await client.query(
      `INSERT INTO flows (id, title, amount, type, from_vault_id, to_vault_id, from_title, to_title, tag, is_actual, flow_date, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id, title, amount::float as amount, type, 
                 from_vault_id as "fromVaultId", to_vault_id as "toVaultId",
                 from_title as "from", to_title as "to",
                 tag, is_actual as "isActual",
                 COALESCE(priority, 'medium') as priority,
                 TO_CHAR(flow_date, 'DD/MM/YYYY') as date;`,
      [id, title, numAmount, type, fromVaultId, toVaultId, fromTitle, toTitle, tag, isActual, flowDate, priority || "medium"]
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

export async function PUT(request: Request) {
  const client = await pool.connect();
  try {
    await initDatabase();
    await client.query("BEGIN");

    const body = await request.json();
    const {
      id,
      title,
      amount,
      tag,
      flowDate,
      fromVaultId,
      toVaultId,
      fromTitle,
      toTitle,
      isActual,
      priority,
    } = body;

    if (!id) {
      await client.query("ROLLBACK");
      return NextResponse.json({ success: false, error: "Thiếu mã id giao dịch" }, { status: 400 });
    }

    // Lấy flow hiện tại để tính hoàn lại số dư nếu là actual
    const oldFlowRes = await client.query("SELECT * FROM flows WHERE id = $1", [id]);
    if (oldFlowRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ success: false, error: "Không tìm thấy giao dịch" }, { status: 404 });
    }
    const oldFlow = oldFlowRes.rows[0];
    const oldAmount = parseFloat(oldFlow.amount);
    const newAmount = amount !== undefined ? parseFloat(amount) : oldAmount;

    if (isNaN(newAmount) || newAmount <= 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ success: false, error: "Số tiền không hợp lệ" }, { status: 400 });
    }

    const finalIsActual = isActual !== undefined ? Boolean(isActual) : Boolean(oldFlow.is_actual);

    // Xử lý biến động số dư MoBo
    if (!oldFlow.is_actual && finalIsActual) {
      // Chuyển từ Kế hoạch dự kiến sang Thực tế -> trừ/cộng MoBo ngay
      const finalFromVaultId = fromVaultId !== undefined ? fromVaultId : oldFlow.from_vault_id;
      const finalToVaultId = toVaultId !== undefined ? toVaultId : oldFlow.to_vault_id;
      if (oldFlow.type === "expense" && finalFromVaultId) {
        await client.query("UPDATE vaults SET balance = balance - $1 WHERE id = $2", [newAmount, finalFromVaultId]);
      } else if (oldFlow.type === "income" && finalToVaultId) {
        await client.query("UPDATE vaults SET balance = balance + $1 WHERE id = $2", [newAmount, finalToVaultId]);
      } else if (oldFlow.type === "transfer") {
        if (finalFromVaultId) await client.query("UPDATE vaults SET balance = balance - $1 WHERE id = $2", [newAmount, finalFromVaultId]);
        if (finalToVaultId) await client.query("UPDATE vaults SET balance = balance + $1 WHERE id = $2", [newAmount, finalToVaultId]);
      }
    } else if (oldFlow.is_actual && !finalIsActual) {
      // Chuyển từ Thực tế về Kế hoạch dự kiến -> hoàn trả số dư MoBo
      if (oldFlow.type === "expense" && oldFlow.from_vault_id) {
        await client.query("UPDATE vaults SET balance = balance + $1 WHERE id = $2", [oldAmount, oldFlow.from_vault_id]);
      } else if (oldFlow.type === "income" && oldFlow.to_vault_id) {
        await client.query("UPDATE vaults SET balance = balance - $1 WHERE id = $2", [oldAmount, oldFlow.to_vault_id]);
      } else if (oldFlow.type === "transfer") {
        if (oldFlow.from_vault_id) await client.query("UPDATE vaults SET balance = balance + $1 WHERE id = $2", [oldAmount, oldFlow.from_vault_id]);
        if (oldFlow.to_vault_id) await client.query("UPDATE vaults SET balance = balance - $1 WHERE id = $2", [oldAmount, oldFlow.to_vault_id]);
      }
    } else if (oldFlow.is_actual && finalIsActual) {
      // Đã là thực tế, cập nhật chênh lệch số dư
      // 1. Hoàn lại số dư cũ
      if (oldFlow.type === "expense" && oldFlow.from_vault_id) {
        await client.query("UPDATE vaults SET balance = balance + $1 WHERE id = $2", [oldAmount, oldFlow.from_vault_id]);
      } else if (oldFlow.type === "income" && oldFlow.to_vault_id) {
        await client.query("UPDATE vaults SET balance = balance - $1 WHERE id = $2", [oldAmount, oldFlow.to_vault_id]);
      } else if (oldFlow.type === "transfer") {
        if (oldFlow.from_vault_id) await client.query("UPDATE vaults SET balance = balance + $1 WHERE id = $2", [oldAmount, oldFlow.from_vault_id]);
        if (oldFlow.to_vault_id) await client.query("UPDATE vaults SET balance = balance - $1 WHERE id = $2", [oldAmount, oldFlow.to_vault_id]);
      }

      // 2. Áp dụng số dư mới
      const finalFromVaultId = fromVaultId !== undefined ? fromVaultId : oldFlow.from_vault_id;
      const finalToVaultId = toVaultId !== undefined ? toVaultId : oldFlow.to_vault_id;
      if (oldFlow.type === "expense" && finalFromVaultId) {
        await client.query("UPDATE vaults SET balance = balance - $1 WHERE id = $2", [newAmount, finalFromVaultId]);
      } else if (oldFlow.type === "income" && finalToVaultId) {
        await client.query("UPDATE vaults SET balance = balance + $1 WHERE id = $2", [newAmount, finalToVaultId]);
      } else if (oldFlow.type === "transfer") {
        if (finalFromVaultId) await client.query("UPDATE vaults SET balance = balance - $1 WHERE id = $2", [newAmount, finalFromVaultId]);
        if (finalToVaultId) await client.query("UPDATE vaults SET balance = balance + $1 WHERE id = $2", [newAmount, finalToVaultId]);
      }
    }

    // Cập nhật flow
    const updateRes = await client.query(
      `UPDATE flows 
       SET title = COALESCE($1, title),
           amount = $2,
           tag = COALESCE($3, tag),
           flow_date = COALESCE($4, flow_date),
           from_vault_id = COALESCE($5, from_vault_id),
           to_vault_id = COALESCE($6, to_vault_id),
           from_title = COALESCE($7, from_title),
           to_title = COALESCE($8, to_title),
           is_actual = $9,
           priority = COALESCE($10, priority)
       WHERE id = $11
       RETURNING id, title, amount::float as amount, type,
                 from_vault_id as "fromVaultId", to_vault_id as "toVaultId",
                 from_title as "from", to_title as "to",
                 tag, is_actual as "isActual",
                 COALESCE(priority, 'medium') as priority,
                 TO_CHAR(flow_date, 'DD/MM/YYYY') as date,
                 flow_date as "rawDate"`,
      [
        title !== undefined ? title : null,
        newAmount,
        tag !== undefined ? tag : null,
        flowDate !== undefined ? flowDate : null,
        fromVaultId !== undefined ? fromVaultId : null,
        toVaultId !== undefined ? toVaultId : null,
        fromTitle !== undefined ? fromTitle : null,
        toTitle !== undefined ? toTitle : null,
        finalIsActual,
        priority !== undefined ? priority : null,
        id,
      ]
    );

    await client.query("COMMIT");
    return NextResponse.json({ success: true, data: updateRes.rows[0] });
  } catch (error: any) {
    await client.query("ROLLBACK");
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(request: Request) {
  const client = await pool.connect();
  try {
    await initDatabase();
    await client.query("BEGIN");

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      await client.query("ROLLBACK");
      return NextResponse.json({ success: false, error: "Thiếu mã id giao dịch" }, { status: 400 });
    }

    const flowRes = await client.query("SELECT * FROM flows WHERE id = $1", [id]);
    if (flowRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ success: false, error: "Không tìm thấy giao dịch để xóa" }, { status: 404 });
    }
    const flow = flowRes.rows[0];
    const amount = parseFloat(flow.amount);

    // Nếu là giao dịch thực tế, hoàn lại tiền vào kho
    if (flow.is_actual) {
      if (flow.type === "expense" && flow.from_vault_id) {
        await client.query("UPDATE vaults SET balance = balance + $1 WHERE id = $2", [amount, flow.from_vault_id]);
      } else if (flow.type === "income" && flow.to_vault_id) {
        await client.query("UPDATE vaults SET balance = balance - $1 WHERE id = $2", [amount, flow.to_vault_id]);
      } else if (flow.type === "transfer") {
        if (flow.from_vault_id) await client.query("UPDATE vaults SET balance = balance + $1 WHERE id = $2", [amount, flow.from_vault_id]);
        if (flow.to_vault_id) await client.query("UPDATE vaults SET balance = balance - $1 WHERE id = $2", [amount, flow.to_vault_id]);
      }
    }

    await client.query("DELETE FROM flows WHERE id = $1", [id]);
    await client.query("COMMIT");
    return NextResponse.json({ success: true, message: "Đã xóa giao dịch thành công" });
  } catch (error: any) {
    await client.query("ROLLBACK");
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
