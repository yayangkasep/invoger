import { NextResponse } from "next/server";
import admin, { verifyIdToken } from "@/lib/auth/admin";
import { AUTH_TOKEN_KEY } from "@/lib/auth/constants";
import { z } from "zod";

const TemplateSchema = z.object({
  outletId: z.string().min(1),
  outletLabel: z.string().optional().nullable(),
  headerBlocks: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        bold: z.boolean().optional(),
        italic: z.boolean().optional(),
        align: z.string().optional(),
      }),
    )
    .optional(),
  footerBlocks: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        bold: z.boolean().optional(),
        italic: z.boolean().optional(),
        align: z.string().optional(),
      }),
    )
    .optional(),
  footerTemplate: z.string().optional().nullable(),
});

async function getTokenFromRequest(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth && auth.toLowerCase().startsWith("bearer "))
    return auth.split(" ")[1];
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(new RegExp(`${AUTH_TOKEN_KEY}=([^;]+)`));
  if (m) return decodeURIComponent(m[1]);
  return null;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const outletId = url.searchParams.get("outletId");
    if (!outletId)
      return NextResponse.json({ error: "missing_outletId" }, { status: 400 });

    const db = admin.firestore();
    const snap = await db
      .collection("printsTemplates")
      .where("outletId", "==", outletId)
      .limit(1)
      .get();
    if (snap.empty) return NextResponse.json({ ok: true, template: null });
    const doc = snap.docs[0];
    return NextResponse.json({
      ok: true,
      template: { id: doc.id, ...doc.data() },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const token = await getTokenFromRequest(req);
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
      await verifyIdToken(token);
    } catch (e) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = TemplateSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { error: "invalid_payload", details: parsed.error.format() },
        { status: 400 },
      );

    const payload: any = {
      outletId: parsed.data.outletId,
      outletLabel: parsed.data.outletLabel ?? null,
      headerBlocks: parsed.data.headerBlocks ?? [],
      footerBlocks: parsed.data.footerBlocks ?? [],
      footerTemplate: parsed.data.footerTemplate ?? null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const db = admin.firestore();
    const existing = await db
      .collection("printsTemplates")
      .where("outletId", "==", parsed.data.outletId)
      .limit(1)
      .get();
    if (!existing.empty) {
      await existing.docs[0].ref.update(payload);
      const updated = await existing.docs[0].ref.get();
      return NextResponse.json({
        ok: true,
        template: { id: updated.id, ...updated.data() },
      });
    } else {
      payload.createdAt = admin.firestore.FieldValue.serverTimestamp();
      const docRef = await db.collection("printsTemplates").add(payload);
      const created = await docRef.get();
      return NextResponse.json({
        ok: true,
        template: { id: created.id, ...created.data() },
      });
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 500 },
    );
  }
}
