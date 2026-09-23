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
    const body = await request.json();
    const { role, signature, signerName } = body;

    if (!role || (role !== "creditor" && role !== "debtor")) {
      return NextResponse.json({ success: false, error: "Vai trò ký không hợp lệ ('creditor' hoặc 'debtor')" }, { status: 400 });
    }
    if (!signature || !signature.startsWith("data:image/")) {
      return NextResponse.json({ success: false, error: "Chữ ký không hợp lệ (yêu cầu hình ảnh canvas base64)" }, { status: 400 });
    }

    await client.query("BEGIN");

    // Lấy thông tin hiện tại của thỏa thuận
    const aRes = await client.query(`SELECT * FROM agreements WHERE id = $1 FOR UPDATE;`, [id]);
    if (aRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ success: false, error: "Không tìm thấy thỏa thuận" }, { status: 404 });
    }

    const currentAgr = aRes.rows[0];

    // Cập nhật chữ ký tương ứng
    let updateQuery = "";
    let updateParams: any[] = [];

    if (role === "creditor") {
      updateQuery = `
        UPDATE agreements
        SET creditor_signature = $1,
            creditor_signed_at = CURRENT_TIMESTAMP,
            creditor_name = COALESCE($2, creditor_name)
        WHERE id = $3
        RETURNING *;
      `;
      updateParams = [signature, signerName || null, id];
    } else {
      updateQuery = `
        UPDATE agreements
        SET debtor_signature = $1,
            debtor_signed_at = CURRENT_TIMESTAMP,
            debtor_name = COALESCE($2, debtor_name)
        WHERE id = $3
        RETURNING *;
      `;
      updateParams = [signature, signerName || null, id];
    }

    const updatedAgrRes = await client.query(updateQuery, updateParams);
    const updatedAgr = updatedAgrRes.rows[0];

    // Kiểm tra xem cả 2 bên đã ký chưa
    const hasCreditorSigned = Boolean(updatedAgr.creditor_signature);
    const hasDebtorSigned = Boolean(updatedAgr.debtor_signature);

    let autoImportedLoan = null;

    if (hasCreditorSigned && hasDebtorSigned) {
      // 1. Cập nhật trạng thái thỏa thuận thành 'completed'
      await client.query(`UPDATE agreements SET status = 'completed' WHERE id = $1;`, [id]);
      updatedAgr.status = "completed";

      // 2. TỰ ĐỘNG IMPORT VÀO BẢNG LOANS (SỔ VAY & MƯỢN)
      // Kiểm tra xem đã có loan gắn với agreement_id này chưa
      const checkLoanRes = await client.query(`SELECT id FROM loans WHERE agreement_id = $1;`, [id]);
      if (checkLoanRes.rows.length === 0) {
        const loanId = `loan_agr_${id.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`;
        const loanRole = updatedAgr.creator_role || "creditor";
        const partnerName = loanRole === "creditor" ? updatedAgr.debtor_name : updatedAgr.creditor_name;

        const insertLoanRes = await client.query(
          `INSERT INTO loans (
            id, title, role, partner_name, linked_vault_id, start_date, due_date,
            amount, paid_amount, interest_rate, interest_type, interest_due_term,
            confirmed_creditor, confirmed_debtor, status, notes, agreement_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9, $10, $11, true, true, 'active', $12, $13)
          RETURNING *;`,
          [
            loanId,
            updatedAgr.title,
            loanRole,
            partnerName,
            updatedAgr.linked_vault_id || null,
            updatedAgr.start_date,
            updatedAgr.due_date || null,
            updatedAgr.amount,
            updatedAgr.interest_rate,
            updatedAgr.interest_type,
            updatedAgr.interest_due_term,
            `Hợp đồng thỏa thuận điện tử đã ký 2 phía (Mã thỏa thuận: ${id})`,
            id,
          ]
        );

        autoImportedLoan = insertLoanRes.rows[0];

        // Cập nhật loan_id vào thỏa thuận
        await client.query(`UPDATE agreements SET loan_id = $1 WHERE id = $2;`, [loanId, id]);
        updatedAgr.loan_id = loanId;
      } else {
        autoImportedLoan = checkLoanRes.rows[0];
      }
    } else {
      // Trạng thái một bên đã ký
      await client.query(`UPDATE agreements SET status = 'partially_signed' WHERE id = $1;`, [id]);
      updatedAgr.status = "partially_signed";
    }

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      data: updatedAgr,
      autoImportedLoan,
      isFullyCompleted: hasCreditorSigned && hasDebtorSigned,
      message: hasCreditorSigned && hasDebtorSigned 
        ? "Cả 2 bên đã hoàn tất ký tên! Thỏa thuận đã tự động được import vào Sổ Vay & Mượn."
        : "Đã lưu chữ ký thành công, đang chờ bên còn lại ký.",
    });
  } catch (error: any) {
    await client.query("ROLLBACK");
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
