import { NextResponse } from "next/server";
import { pool, initDatabase } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDatabase();
    const { id } = await params;

    const result = await pool.query(
      `SELECT a.*, 
              v.name as "vaultName",
              TO_CHAR(a.start_date, 'YYYY-MM-DD') as "startDateRaw",
              TO_CHAR(a.start_date, 'DD/MM/YYYY') as "startDateFormatted",
              TO_CHAR(a.due_date, 'YYYY-MM-DD') as "dueDateRaw",
              TO_CHAR(a.due_date, 'DD/MM/YYYY') as "dueDateFormatted",
              TO_CHAR(a.created_at, 'DD/MM/YYYY HH24:MI') as "createdAtFormatted",
              TO_CHAR(a.creditor_signed_at, 'DD/MM/YYYY HH24:MI') as "creditorSignedAtFormatted",
              TO_CHAR(a.debtor_signed_at, 'DD/MM/YYYY HH24:MI') as "debtorSignedAtFormatted"
       FROM agreements a
       LEFT JOIN vaults v ON a.linked_vault_id = v.id
       WHERE a.id = $1;`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Không tìm thấy thỏa thuận này" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
