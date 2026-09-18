import { NextResponse } from "next/server";
import { pool, initDatabase } from "@/lib/db";

export async function GET() {
  try {
    await initDatabase();
    const result = await pool.query(`
      SELECT id, title, type, role, amount::float as amount, partner, formula, interest,
             TO_CHAR(due_date, 'DD/MM/YYYY') as "dueDate", status
      FROM obligations
      ORDER BY due_date ASC NULLS LAST;
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
    const {
      title,
      type, // 'receivable' | 'payable' | 'tax'
      role = type === "receivable" ? "creditor" : "debtor",
      amount,
      partner = "",
      formula = null,
      interest = "0%",
      dueDate = null,
      status = "normal",
    } = body;

    const numAmount = parseFloat(amount);
    if (!title || isNaN(numAmount) || numAmount <= 0 || !type) {
      return NextResponse.json({ success: false, error: "Dữ liệu nghĩa vụ không hợp lệ" }, { status: 400 });
    }

    const id = `o_${Date.now()}`;
    const result = await pool.query(
      `INSERT INTO obligations (id, title, type, role, amount, partner, formula, interest, due_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, title, type, role, amount::float as amount, partner, formula, interest,
                 TO_CHAR(due_date, 'DD/MM/YYYY') as "dueDate", status;`,
      [id, title, type, role, numAmount, partner, formula, interest, dueDate, status]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
