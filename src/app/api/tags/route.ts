import { NextResponse } from "next/server";
import { pool, initDatabase } from "@/lib/db";

// GET: Lấy danh sách nhãn giao dịch kèm thống kê giao dịch
export async function GET(request: Request) {
  try {
    await initDatabase();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // income | expense | both | null

    let query = `
      SELECT 
        t.id, 
        t.name, 
        t.type, 
        t.color, 
        t.created_at as "createdAt",
        COUNT(f.id)::int as "flowCount",
        COALESCE(SUM(CASE WHEN f.type = 'income' THEN f.amount ELSE 0 END), 0)::numeric as "incomeSum",
        COALESCE(SUM(CASE WHEN f.type = 'expense' THEN f.amount ELSE 0 END), 0)::numeric as "expenseSum"
      FROM tags t
      LEFT JOIN flows f ON f.tag = t.name
    `;

    const params: any[] = [];
    if (type && type !== "all") {
      query += ` WHERE t.type = $1 OR t.type = 'both'`;
      params.push(type);
    }

    query += ` GROUP BY t.id, t.name, t.type, t.color, t.created_at ORDER BY t.created_at ASC;`;

    const { rows } = await pool.query(query, params);
    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    console.error("GET /api/tags error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Tạo nhãn giao dịch mới
export async function POST(request: Request) {
  try {
    await initDatabase();
    const body = await request.json();
    const { name, type = "both", color = "blue" } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: "Tên nhãn không được để trống" }, { status: 400 });
    }

    const trimmedName = name.trim();
    const id = "tag_" + Date.now();

    // Kiểm tra tên nhãn trùng
    const { rows: existing } = await pool.query(`SELECT id FROM tags WHERE LOWER(name) = LOWER($1);`, [trimmedName]);
    if (existing.length > 0) {
      return NextResponse.json({ success: false, error: `Nhãn "${trimmedName}" đã tồn tại trong hệ thống` }, { status: 400 });
    }

    const { rows } = await pool.query(
      `INSERT INTO tags (id, name, type, color) VALUES ($1, $2, $3, $4) RETURNING id, name, type, color, created_at as "createdAt";`,
      [id, trimmedName, type, color]
    );

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error: any) {
    console.error("POST /api/tags error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Cập nhật thông tin nhãn (Tên, Loại, Màu sắc). Nếu đổi tên thì đồng bộ vào các dòng flows cũ!
export async function PUT(request: Request) {
  try {
    await initDatabase();
    const body = await request.json();
    const { id, name, type, color } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Thiếu ID nhãn cần sửa" }, { status: 400 });
    }

    // Lấy thông tin nhãn hiện tại
    const { rows: currentRows } = await pool.query(`SELECT id, name FROM tags WHERE id = $1;`, [id]);
    if (currentRows.length === 0) {
      return NextResponse.json({ success: false, error: "Không tìm thấy nhãn" }, { status: 404 });
    }
    const oldName = currentRows[0].name;
    const newName = name ? name.trim() : oldName;

    // Kiểm tra trùng tên với nhãn khác nếu đổi tên
    if (newName.toLowerCase() !== oldName.toLowerCase()) {
      const { rows: duplicate } = await pool.query(
        `SELECT id FROM tags WHERE LOWER(name) = LOWER($1) AND id != $2;`,
        [newName, id]
      );
      if (duplicate.length > 0) {
        return NextResponse.json({ success: false, error: `Tên nhãn "${newName}" đã được dùng bởi nhãn khác` }, { status: 400 });
      }
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Cập nhật tag
      const { rows: updatedRows } = await client.query(
        `UPDATE tags 
         SET name = COALESCE($2, name), 
             type = COALESCE($3, type), 
             color = COALESCE($4, color) 
         WHERE id = $1 
         RETURNING id, name, type, color, created_at as "createdAt";`,
        [id, newName, type, color]
      );

      // Nếu tên nhãn thay đổi, đồng bộ đổi tên trên các flows đang sử dụng nhãn này
      if (newName !== oldName) {
        await client.query(`UPDATE flows SET tag = $1 WHERE tag = $2;`, [newName, oldName]);
      }

      await client.query("COMMIT");
      return NextResponse.json({ success: true, data: updatedRows[0] });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("PUT /api/tags error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Xóa nhãn giao dịch
export async function DELETE(request: Request) {
  try {
    await initDatabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Thiếu ID nhãn cần xóa" }, { status: 400 });
    }

    const { rows: currentRows } = await pool.query(`SELECT id, name FROM tags WHERE id = $1;`, [id]);
    if (currentRows.length === 0) {
      return NextResponse.json({ success: false, error: "Không tìm thấy nhãn" }, { status: 404 });
    }
    const tagName = currentRows[0].name;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Chuyển các giao dịch có tag này về nhãn 'Khác' để đảm bảo an toàn dữ liệu
      await client.query(`UPDATE flows SET tag = 'Khác' WHERE tag = $1;`, [tagName]);

      // Xóa tag
      await client.query(`DELETE FROM tags WHERE id = $1;`, [id]);

      await client.query("COMMIT");
      return NextResponse.json({ success: true, message: `Đã xóa nhãn "${tagName}" thành công` });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("DELETE /api/tags error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
