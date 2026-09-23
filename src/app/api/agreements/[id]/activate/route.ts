import { NextResponse } from "next/server";
import { pool, initDatabase } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    await initDatabase();
    const { id } = await params;

    await client.query("BEGIN");

    // Lấy thông tin thỏa thuận
    const aRes = await client.query(`SELECT * FROM agreements WHERE id = $1 FOR UPDATE;`, [id]);
    if (aRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ success: false, error: "Không tìm thấy thỏa thuận" }, { status: 404 });
    }

    const agr = aRes.rows[0];

    // 1. Cập nhật thỏa thuận thành 'completed'
    await client.query(`UPDATE agreements SET status = 'completed' WHERE id = $1;`, [id]);
    agr.status = "completed";

    // 2. Kiểm tra xem đã có bản ghi trong Sổ Nợ (loans) chưa
    let autoImportedLoan = null;
    const checkLoanRes = await client.query(`SELECT * FROM loans WHERE agreement_id = $1;`, [id]);
    if (checkLoanRes.rows.length === 0) {
      const loanId = `loan_agr_${id.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`;
      const loanRole = agr.creator_role || "creditor";
      const partnerName = loanRole === "creditor" ? agr.debtor_name : agr.creditor_name;

      const insertLoanRes = await client.query(
        `INSERT INTO loans (
          id, title, role, partner_name, linked_vault_id, start_date, due_date,
          amount, paid_amount, interest_rate, interest_type, interest_due_term,
          confirmed_creditor, confirmed_debtor, status, notes, agreement_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9, $10, $11, true, true, 'active', $12, $13)
        RETURNING *;`,
        [
          loanId,
          agr.title,
          loanRole,
          partnerName,
          agr.linked_vault_id || null,
          agr.start_date,
          agr.due_date || null,
          agr.amount,
          agr.interest_rate,
          agr.interest_type,
          agr.interest_due_term,
          `Kích hoạt trực tiếp vào Sổ Nợ (Không cần chờ ký 2 bên - Mã: ${id})`,
          id,
        ]
      );

      autoImportedLoan = insertLoanRes.rows[0];
      await client.query(`UPDATE agreements SET loan_id = $1 WHERE id = $2;`, [loanId, id]);
      agr.loan_id = loanId;
    } else {
      autoImportedLoan = checkLoanRes.rows[0];
    }

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      data: agr,
      autoImportedLoan,
      message: "Đã kích hoạt thỏa thuận và ghi nhận trực tiếp vào Sổ Vay & Mượn thành công!",
    });
  } catch (error: any) {
    await client.query("ROLLBACK");
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
