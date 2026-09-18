import { NextResponse } from "next/server";
import { pool, initDatabase } from "@/lib/db";

export async function GET() {
  try {
    await initDatabase();
    const result = await pool.query(`
      SELECT l.id, l.title, l.role, 
             l.partner_name as "partnerName",
             l.linked_vault_id as "linkedVaultId",
             l.creditor_vault_id as "creditorVaultId",
             l.creditor_name as "creditorName",
             l.debtor_vault_id as "debtorVaultId",
             l.debtor_name as "debtorName",
             l.loan_context as "loanContext",
             vc.name as "creditorVaultName", vc.type as "creditorVaultType", vc.balance::float as "creditorVaultBalance",
             vd.name as "debtorVaultName", vd.type as "debtorVaultType", vd.balance::float as "debtorVaultBalance",
             v.name as "vaultName", v.type as "vaultType",
             TO_CHAR(l.start_date, 'YYYY-MM-DD') as "startDate",
             TO_CHAR(l.start_date, 'DD/MM/YYYY') as "startDateFormatted",
             TO_CHAR(l.due_date, 'YYYY-MM-DD') as "dueDate",
             TO_CHAR(l.due_date, 'DD/MM/YYYY') as "dueDateFormatted",
             l.amount::float as amount,
             l.paid_amount::float as "paidAmount",
             GREATEST(0, (l.amount - l.paid_amount))::float as "remainingAmount",
             l.interest_rate::float as "interestRate",
             l.interest_type as "interestType",
             l.interest_due_term as "interestDueTerm",
             l.confirmed_creditor as "confirmedCreditor",
             l.confirmed_debtor as "confirmedDebtor",
             l.status, l.notes,
             TO_CHAR(l.created_at, 'DD/MM/YYYY HH24:MI') as "createdAt"
      FROM loans l
      LEFT JOIN vaults v ON l.linked_vault_id = v.id
      LEFT JOIN vaults vc ON l.creditor_vault_id = vc.id
      LEFT JOIN vaults vd ON l.debtor_vault_id = vd.id
      ORDER BY 
        CASE WHEN l.status = 'active' THEN 0 ELSE 1 END,
        l.due_date ASC NULLS LAST,
        l.created_at DESC;
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
    const body = await request.json();
    let {
      title,
      role = "debtor", // 'creditor' (Chủ nợ) | 'debtor' (Con nợ)
      loanContext = "borrowing", // 'internal' | 'lending' | 'borrowing'
      creditorVaultId = null,
      creditorName = "",
      debtorVaultId = null,
      debtorName = "",
      partnerName = "",
      linkedVaultId = null,
      startDate = new Date().toISOString().split("T")[0],
      dueDate = null,
      amount,
      interestRate = 0,
      interestType = "none",
      interestDueTerm = "end_term",
      confirmedCreditor = false,
      confirmedDebtor = false,
      notes = "",
      syncMoBo = false,
    } = body;

    const numAmount = parseFloat(amount);
    if (!title || isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "Vui lòng nhập đầy đủ tiêu đề và số tiền hợp lệ (> 0)" },
        { status: 400 }
      );
    }

    // Tự động suy luận tên và ID dựa trên loanContext
    if (loanContext === "internal") {
      role = "creditor";
      if (!creditorVaultId || !debtorVaultId) {
        return NextResponse.json(
          { success: false, error: "Vui lòng chọn cả MoBo Chủ Nợ (xuất vốn) và MoBo Con Nợ (nhận vốn)" },
          { status: 400 }
        );
      }
      if (creditorVaultId === debtorVaultId) {
        return NextResponse.json(
          { success: false, error: "MoBo Chủ Nợ và MoBo Con Nợ không được trùng nhau" },
          { status: 400 }
        );
      }
      linkedVaultId = creditorVaultId;
      partnerName = debtorName;
    } else if (loanContext === "lending") {
      role = "creditor";
      if (!creditorVaultId) {
        return NextResponse.json(
          { success: false, error: "Vui lòng chọn MoBo Chủ Nợ của bạn trích tiền cho vay" },
          { status: 400 }
        );
      }
      if (!debtorName || !debtorName.trim()) {
        return NextResponse.json(
          { success: false, error: "Vui lòng nhập tên MoBo Con Nợ đối tác" },
          { status: 400 }
        );
      }
      debtorVaultId = null;
      linkedVaultId = creditorVaultId;
      partnerName = debtorName;
    } else {
      // borrowing
      role = "debtor";
      if (!debtorVaultId) {
        return NextResponse.json(
          { success: false, error: "Vui lòng chọn MoBo Con Nợ của bạn tiếp nhận tiền vay" },
          { status: 400 }
        );
      }
      if (!creditorName || !creditorName.trim()) {
        return NextResponse.json(
          { success: false, error: "Vui lòng nhập tên MoBo Chủ Nợ / Ngân hàng" },
          { status: 400 }
        );
      }
      creditorVaultId = null;
      linkedVaultId = debtorVaultId;
      partnerName = creditorName;
    }

    await client.query("BEGIN");

    const id = `loan_${Date.now()}`;
    const result = await client.query(
      `INSERT INTO loans (
        id, title, role, partner_name, linked_vault_id,
        creditor_vault_id, creditor_name, debtor_vault_id, debtor_name, loan_context,
        start_date, due_date,
        amount, paid_amount, interest_rate, interest_type, interest_due_term,
        confirmed_creditor, confirmed_debtor, status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 0, $14, $15, $16, $17, $18, 'active', $19)
      RETURNING *;`,
      [
        id,
        title,
        role,
        partnerName,
        linkedVaultId,
        creditorVaultId,
        creditorName,
        debtorVaultId,
        debtorName,
        loanContext,
        startDate,
        dueDate || null,
        numAmount,
        parseFloat(interestRate) || 0,
        interestType,
        interestDueTerm,
        Boolean(confirmedCreditor),
        Boolean(confirmedDebtor),
        notes,
      ]
    );

    // Đồng bộ số dư nếu user chọn syncMoBo
    if (syncMoBo) {
      const flowId = `f_loan_init_${Date.now()}`;
      if (loanContext === "internal" && creditorVaultId && debtorVaultId) {
        // Luân chuyển nội bộ: Trừ tiền ở MoBo Chủ Nợ, cộng tiền vào MoBo Con Nợ
        await client.query(`UPDATE vaults SET balance = balance - $1, last_recorded_at = NOW() WHERE id = $2`, [numAmount, creditorVaultId]);
        await client.query(`UPDATE vaults SET balance = balance + $1, last_recorded_at = NOW() WHERE id = $2`, [numAmount, debtorVaultId]);
        await client.query(
          `INSERT INTO flows (id, title, amount, type, from_vault_id, to_vault_id, from_title, to_title, tag, is_actual, flow_date)
           VALUES ($1, $2, $3, 'transfer', $4, $5, $6, $7, 'Nội bộ', true, $8)`,
          [flowId, `Vay vốn luân chuyển MoBo: ${title}`, numAmount, creditorVaultId, debtorVaultId, creditorName, debtorName, startDate]
        );
      } else if (loanContext === "lending" && creditorVaultId) {
        // Cho vay: Trừ tiền ở MoBo Chủ Nợ
        await client.query(`UPDATE vaults SET balance = balance - $1, last_recorded_at = NOW() WHERE id = $2`, [numAmount, creditorVaultId]);
        await client.query(
          `INSERT INTO flows (id, title, amount, type, from_vault_id, from_title, to_title, tag, is_actual, flow_date)
           VALUES ($1, $2, $3, 'expense', $4, $5, $6, 'Cho vay', true, $7)`,
          [flowId, `Xuất vốn cho vay: ${title} (${debtorName})`, numAmount, creditorVaultId, creditorName, debtorName, startDate]
        );
      } else if (loanContext === "borrowing" && debtorVaultId) {
        // Đi vay: Cộng tiền vào MoBo Con Nợ
        await client.query(`UPDATE vaults SET balance = balance + $1, last_recorded_at = NOW() WHERE id = $2`, [numAmount, debtorVaultId]);
        await client.query(
          `INSERT INTO flows (id, title, amount, type, to_vault_id, from_title, to_title, tag, is_actual, flow_date)
           VALUES ($1, $2, $3, 'income', $4, $5, $6, 'Đi vay', true, $7)`,
          [flowId, `Nhận tiền vay: ${title} (${creditorName})`, numAmount, debtorVaultId, creditorName, debtorName, startDate]
        );
      }
    }

    await client.query("COMMIT");
    return NextResponse.json({ success: true, data: result.rows[0] });
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
    const body = await request.json();
    const { id, action } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Thiếu mã khoản vay" }, { status: 400 });
    }

    await client.query("BEGIN");

    const lRes = await client.query(`SELECT * FROM loans WHERE id = $1`, [id]);
    if (lRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ success: false, error: "Không tìm thấy khoản vay" }, { status: 404 });
    }
    const currentLoan = lRes.rows[0];

    if (action === "toggle_confirm") {
      const { targetSide, confirmBoth } = body;
      let newCreditor = currentLoan.confirmed_creditor;
      let newDebtor = currentLoan.confirmed_debtor;

      if (confirmBoth) {
        newCreditor = true;
        newDebtor = true;
      } else if (targetSide === "creditor") {
        newCreditor = !newCreditor;
      } else if (targetSide === "debtor") {
        newDebtor = !newDebtor;
      }

      const updateRes = await client.query(
        `UPDATE loans 
         SET confirmed_creditor = $1, confirmed_debtor = $2 
         WHERE id = $3 
         RETURNING *;`,
        [newCreditor, newDebtor, id]
      );
      await client.query("COMMIT");
      return NextResponse.json({ success: true, data: updateRes.rows[0] });
    }

    if (action === "pay") {
      const { paymentAmount, payVaultId, note = "" } = body;
      const numPayment = parseFloat(paymentAmount);
      if (isNaN(numPayment) || numPayment <= 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ success: false, error: "Số tiền thanh toán không hợp lệ" }, { status: 400 });
      }

      const newPaidAmount = parseFloat(currentLoan.paid_amount) + numPayment;
      const totalAmount = parseFloat(currentLoan.amount);
      const isFullySettled = newPaidAmount >= totalAmount - 0.01;
      const newStatus = isFullySettled ? "settled" : "active";

      const updateLoanRes = await client.query(
        `UPDATE loans 
         SET paid_amount = $1, status = $2 
         WHERE id = $3 
         RETURNING *;`,
        [newPaidAmount, newStatus, id]
      );

      const loanContext = currentLoan.loan_context || (currentLoan.role === "creditor" ? "lending" : "borrowing");
      const flowId = `f_pay_${Date.now()}`;

      if (loanContext === "internal") {
        // Hoàn trả nội bộ: từ MoBo Con Nợ về MoBo Chủ Nợ
        const fromVId = payVaultId || currentLoan.debtor_vault_id;
        const toVId = currentLoan.creditor_vault_id;

        if (fromVId && toVId) {
          await client.query(`UPDATE vaults SET balance = balance - $1, last_recorded_at = NOW() WHERE id = $2`, [numPayment, fromVId]);
          await client.query(`UPDATE vaults SET balance = balance + $1, last_recorded_at = NOW() WHERE id = $2`, [numPayment, toVId]);
          await client.query(
            `INSERT INTO flows (id, title, amount, type, from_vault_id, to_vault_id, from_title, to_title, tag, is_actual, flow_date)
             VALUES ($1, $2, $3, 'transfer', $4, $5, $6, $7, 'Nội bộ', true, CURRENT_DATE)`,
            [
              flowId,
              `Hoàn trả vốn MoBo nội bộ: ${currentLoan.title}${note ? ` - ${note}` : ""}`,
              numPayment,
              fromVId,
              toVId,
              currentLoan.debtor_name || "MoBo Con Nợ",
              currentLoan.creditor_name || "MoBo Chủ Nợ",
            ]
          );
        }
      } else if (loanContext === "lending") {
        // Thu hồi nợ: Tiền vào MoBo của tôi (payVaultId hoặc creditor_vault_id)
        const targetVaultId = payVaultId || currentLoan.creditor_vault_id || currentLoan.linked_vault_id;
        if (targetVaultId) {
          const vRes = await client.query(`SELECT id, name FROM vaults WHERE id = $1 AND is_closed = false`, [targetVaultId]);
          if (vRes.rows.length > 0) {
            const vault = vRes.rows[0];
            await client.query(`UPDATE vaults SET balance = balance + $1, last_recorded_at = NOW() WHERE id = $2`, [numPayment, targetVaultId]);
            await client.query(
              `INSERT INTO flows (id, title, amount, type, to_vault_id, from_title, to_title, tag, is_actual, flow_date)
               VALUES ($1, $2, $3, 'income', $4, $5, $6, 'Thu nợ', true, CURRENT_DATE)`,
              [
                flowId,
                `Thu hồi nợ: ${currentLoan.title} (${currentLoan.debtor_name || currentLoan.partner_name})${note ? ` - ${note}` : ""}`,
                numPayment,
                targetVaultId,
                currentLoan.debtor_name || currentLoan.partner_name,
                vault.name,
              ]
            );
          }
        }
      } else {
        // borrowing: Thanh toán trả nợ: Tiền xuất từ MoBo của tôi (payVaultId hoặc debtor_vault_id)
        const targetVaultId = payVaultId || currentLoan.debtor_vault_id || currentLoan.linked_vault_id;
        if (targetVaultId) {
          const vRes = await client.query(`SELECT id, name FROM vaults WHERE id = $1 AND is_closed = false`, [targetVaultId]);
          if (vRes.rows.length > 0) {
            const vault = vRes.rows[0];
            await client.query(`UPDATE vaults SET balance = balance - $1, last_recorded_at = NOW() WHERE id = $2`, [numPayment, targetVaultId]);
            await client.query(
              `INSERT INTO flows (id, title, amount, type, from_vault_id, from_title, to_title, tag, is_actual, flow_date)
               VALUES ($1, $2, $3, 'expense', $4, $5, $6, 'Trả nợ', true, CURRENT_DATE)`,
              [
                flowId,
                `Thanh toán trả nợ: ${currentLoan.title} (${currentLoan.creditor_name || currentLoan.partner_name})${note ? ` - ${note}` : ""}`,
                numPayment,
                targetVaultId,
                vault.name,
                currentLoan.creditor_name || currentLoan.partner_name,
              ]
            );
          }
        }
      }

      await client.query("COMMIT");
      return NextResponse.json({ success: true, data: updateLoanRes.rows[0], message: "Đã ghi nhận thanh toán thành công" });
    }

    // Cập nhật thông tin khoản vay
    let {
      title,
      role,
      loanContext,
      creditorVaultId,
      creditorName,
      debtorVaultId,
      debtorName,
      partnerName,
      linkedVaultId,
      startDate,
      dueDate,
      amount,
      interestRate,
      interestType,
      interestDueTerm,
      status,
      notes,
    } = body;

    const numAmount = parseFloat(amount);
    const updateRes = await client.query(
      `UPDATE loans
       SET title = COALESCE($1, title),
           role = COALESCE($2, role),
           loan_context = COALESCE($3, loan_context),
           creditor_vault_id = $4,
           creditor_name = COALESCE($5, creditor_name),
           debtor_vault_id = $6,
           debtor_name = COALESCE($7, debtor_name),
           partner_name = COALESCE($8, partner_name),
           linked_vault_id = $9,
           start_date = COALESCE($10, start_date),
           due_date = $11,
           amount = COALESCE($12, amount),
           interest_rate = COALESCE($13, interest_rate),
           interest_type = COALESCE($14, interest_type),
           interest_due_term = COALESCE($15, interest_due_term),
           status = COALESCE($16, status),
           notes = COALESCE($17, notes)
       WHERE id = $18
       RETURNING *;`,
      [
        title,
        role,
        loanContext,
        creditorVaultId || null,
        creditorName,
        debtorVaultId || null,
        debtorName,
        partnerName || (role === "creditor" ? debtorName : creditorName),
        linkedVaultId || creditorVaultId || debtorVaultId || null,
        startDate,
        dueDate || null,
        isNaN(numAmount) ? null : numAmount,
        interestRate !== undefined ? parseFloat(interestRate) : null,
        interestType,
        interestDueTerm,
        status,
        notes,
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
  try {
    await initDatabase();
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Thiếu mã khoản vay" }, { status: 400 });
    }

    const result = await pool.query(`DELETE FROM loans WHERE id = $1 RETURNING id;`, [id]);
    if (result.rowCount === 0) {
      return NextResponse.json({ success: false, error: "Không tìm thấy khoản vay" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Đã xóa khoản vay thành công" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
