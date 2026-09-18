import { NextResponse } from "next/server";
import { pool, initDatabase } from "@/lib/db";

export async function GET() {
  try {
    await initDatabase();
    const result = await pool.query(`
      SELECT l.id, l.title, l.role, l.partner_name as "partnerName",
             l.linked_vault_id as "linkedVaultId",
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
             l.agreement_id as "agreementId",
             TO_CHAR(l.created_at, 'DD/MM/YYYY HH24:MI') as "createdAt"
      FROM loans l
      LEFT JOIN vaults v ON l.linked_vault_id = v.id
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
    const {
      title,
      role = "debtor", // 'creditor' (Chủ nợ) | 'debtor' (Con nợ)
      partnerName,
      linkedVaultId = null,
      startDate = new Date().toISOString().split("T")[0],
      dueDate = null,
      amount,
      interestRate = 0,
      interestType = "none",
      interestDueTerm = "end_term",
      confirmedCreditor = role === "creditor",
      confirmedDebtor = role === "debtor",
      notes = "",
      syncMoBo = false,
    } = body;

    const numAmount = parseFloat(amount);
    if (!title || !partnerName || isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "Vui lòng nhập đầy đủ tiêu đề, tên đối tác và số tiền hợp lệ" },
        { status: 400 }
      );
    }

    await client.query("BEGIN");

    const id = `loan_${Date.now()}`;
    const result = await client.query(
      `INSERT INTO loans (
        id, title, role, partner_name, linked_vault_id, start_date, due_date,
        amount, paid_amount, interest_rate, interest_type, interest_due_term,
        confirmed_creditor, confirmed_debtor, status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9, $10, $11, $12, $13, 'active', $14)
      RETURNING *;`,
      [
        id,
        title,
        role,
        partnerName,
        linkedVaultId || null,
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

    if (syncMoBo && linkedVaultId) {
      const vRes = await client.query(`SELECT id, name FROM vaults WHERE id = $1 AND is_closed = false`, [linkedVaultId]);
      if (vRes.rows.length > 0) {
        const vault = vRes.rows[0];
        const flowId = `f_loan_init_${Date.now()}`;
        if (role === "creditor") {
          await client.query(`UPDATE vaults SET balance = balance - $1, last_recorded_at = NOW() WHERE id = $2`, [numAmount, linkedVaultId]);
          await client.query(
            `INSERT INTO flows (id, title, amount, type, from_vault_id, from_title, to_title, tag, is_actual, flow_date)
             VALUES ($1, $2, $3, 'expense', $4, $5, $6, 'Cho vay', true, $7)`,
            [flowId, `Giải ngân cho vay: ${title} (${partnerName})`, numAmount, linkedVaultId, vault.name, partnerName, startDate]
          );
        } else {
          await client.query(`UPDATE vaults SET balance = balance + $1, last_recorded_at = NOW() WHERE id = $2`, [numAmount, linkedVaultId]);
          await client.query(
            `INSERT INTO flows (id, title, amount, type, to_vault_id, from_title, to_title, tag, is_actual, flow_date)
             VALUES ($1, $2, $3, 'income', $4, $5, $6, 'Đi vay', true, $7)`,
            [flowId, `Nhận tiền vay: ${title} (${partnerName})`, numAmount, linkedVaultId, partnerName, vault.name, startDate]
          );
        }
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

      const targetVaultId = payVaultId || currentLoan.linked_vault_id;
      if (targetVaultId) {
        const vRes = await client.query(`SELECT id, name FROM vaults WHERE id = $1 AND is_closed = false`, [targetVaultId]);
        if (vRes.rows.length > 0) {
          const vault = vRes.rows[0];
          const flowId = `f_pay_${Date.now()}`;
          const isCreditor = currentLoan.role === "creditor";

          if (isCreditor) {
            await client.query(`UPDATE vaults SET balance = balance + $1, last_recorded_at = NOW() WHERE id = $2`, [numPayment, targetVaultId]);
            await client.query(
              `INSERT INTO flows (id, title, amount, type, to_vault_id, from_title, to_title, tag, is_actual, flow_date)
               VALUES ($1, $2, $3, 'income', $4, $5, $6, 'Thu nợ', true, CURRENT_DATE)`,
              [
                flowId,
                `Thu hồi nợ: ${currentLoan.title} (${currentLoan.partner_name})${note ? ` - ${note}` : ""}`,
                numPayment,
                targetVaultId,
                currentLoan.partner_name,
                vault.name,
              ]
            );
          } else {
            await client.query(`UPDATE vaults SET balance = balance - $1, last_recorded_at = NOW() WHERE id = $2`, [numPayment, targetVaultId]);
            await client.query(
              `INSERT INTO flows (id, title, amount, type, from_vault_id, from_title, to_title, tag, is_actual, flow_date)
              VALUES ($1, $2, $3, 'expense', $4, $5, $6, 'Trả nợ', true, CURRENT_DATE)`,
              [
                flowId,
                `Thanh toán trả nợ: ${currentLoan.title} (${currentLoan.partner_name})${note ? ` - ${note}` : ""}`,
                numPayment,
                targetVaultId,
                vault.name,
                currentLoan.partner_name,
              ]
            );
          }
        }
      }

      await client.query("COMMIT");
      return NextResponse.json({ success: true, data: updateLoanRes.rows[0], message: "Đã ghi nhận thanh toán thành công" });
    }

    const {
      title,
      role,
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
           partner_name = COALESCE($3, partner_name),
           linked_vault_id = $4,
           start_date = COALESCE($5, start_date),
           due_date = $6,
           amount = COALESCE($7, amount),
           interest_rate = COALESCE($8, interest_rate),
           interest_type = COALESCE($9, interest_type),
           interest_due_term = COALESCE($10, interest_due_term),
           status = COALESCE($11, status),
           notes = COALESCE($12, notes)
       WHERE id = $13
       RETURNING *;`,
      [
        title,
        role,
        partnerName,
        linkedVaultId || null,
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
