import { NextResponse } from "next/server";
import { pool, initDatabase } from "@/lib/db";

export async function GET() {
  try {
    await initDatabase();
    const result = await pool.query(`
      SELECT a.*, 
             v.name as "vaultName",
             TO_CHAR(a.start_date, 'DD/MM/YYYY') as "startDateFormatted",
             TO_CHAR(a.due_date, 'DD/MM/YYYY') as "dueDateFormatted",
             TO_CHAR(a.created_at, 'DD/MM/YYYY HH24:MI') as "createdAtFormatted"
      FROM agreements a
      LEFT JOIN vaults v ON a.linked_vault_id = v.id
      ORDER BY a.created_at DESC;
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
      creatorRole = "creditor", // 'creditor' | 'debtor'
      creditorName,
      creditorContact = "",
      debtorName,
      debtorContact = "",
      amount,
      interestRate = 0,
      interestType = "none",
      interestDueTerm = "end_term",
      startDate = new Date().toISOString().split("T")[0],
      dueDate = null,
      linkedVaultId = null,
      terms = "",
      autoActivate = false, // boolean flag: Tự động ghi vào Sổ Nợ không cần chờ ký 2 bên
    } = body;

    const numAmount = parseFloat(amount);
    if (!title || !creditorName || !debtorName || isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "Vui lòng nhập đầy đủ tiêu đề, tên Chủ Nợ, tên Con Nợ và số tiền hợp lệ (> 0)" },
        { status: 400 }
      );
    }

    await client.query("BEGIN");

    // Sinh ID thỏa thuận ngắn gọn, dễ nhớ (VD: TT-892147)
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const id = `TT-${randomSuffix}`;
    const initialStatus = autoActivate ? "completed" : "pending";

    const result = await client.query(
      `INSERT INTO agreements (
        id, title, creator_role, creditor_name, creditor_contact, debtor_name, debtor_contact,
        amount, interest_rate, interest_type, interest_due_term,
        start_date, due_date, linked_vault_id, terms, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *;`,
      [
        id,
        title,
        creatorRole,
        creditorName,
        creditorContact,
        debtorName,
        debtorContact,
        numAmount,
        parseFloat(interestRate) || 0,
        interestType,
        interestDueTerm,
        startDate,
        dueDate || null,
        linkedVaultId || null,
        terms || "Hai bên cam kết tự nguyện thỏa thuận vay và cho vay đúng theo các điều khoản ghi trong thỏa thuận này.",
        initialStatus,
      ]
    );

    let agreementRow = result.rows[0];
    let autoImportedLoan = null;

    if (autoActivate) {
      const loanId = `loan_agr_${id.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`;
      const partnerName = creatorRole === "creditor" ? debtorName : creditorName;

      const insertLoanRes = await client.query(
        `INSERT INTO loans (
          id, title, role, partner_name, linked_vault_id, start_date, due_date,
          amount, paid_amount, interest_rate, interest_type, interest_due_term,
          confirmed_creditor, confirmed_debtor, status, notes, agreement_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9, $10, $11, true, true, 'active', $12, $13)
        RETURNING *;`,
        [
          loanId,
          title,
          creatorRole,
          partnerName,
          linkedVaultId || null,
          startDate,
          dueDate || null,
          numAmount,
          parseFloat(interestRate) || 0,
          interestType,
          interestDueTerm,
          `Thỏa thuận tạo trực tiếp (Không cần xác nhận 2 bên - Mã: ${id})`,
          id,
        ]
      );
      autoImportedLoan = insertLoanRes.rows[0];

      await client.query(`UPDATE agreements SET loan_id = $1 WHERE id = $2;`, [loanId, id]);
      agreementRow.loan_id = loanId;
    }

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      data: agreementRow,
      autoImportedLoan,
      message: autoActivate
        ? "Đã tạo thỏa thuận và kích hoạt trực tiếp vào Sổ Nợ thành công!"
        : "Đã tạo thỏa thuận thành công, vui lòng chia sẻ link để 2 bên cùng ký.",
    });
  } catch (error: any) {
    await client.query("ROLLBACK");
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
