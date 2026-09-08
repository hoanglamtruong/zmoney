import { NextResponse } from "next/server";
import { pool, initDatabase } from "@/lib/db";

export async function GET() {
  try {
    await initDatabase();
    const result = await pool.query(`
      SELECT id, name, type, balance::float as balance, description as desc
      FROM vaults
      ORDER BY created_at ASC;
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
    const { name, type, balance = 0, description = "" } = body;

    if (!name || !type) {
      return NextResponse.json({ success: false, error: "Tên và loại kho chứa là bắt buộc" }, { status: 400 });
    }

    const id = `v_${Date.now()}`;
    const result = await pool.query(
      `INSERT INTO vaults (id, name, type, balance, description) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, name, type, balance::float as balance, description as desc;`,
      [id, name, type, balance, description]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
