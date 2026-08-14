/**
 * 3-Category 18-Slot Hero Slideshow Manager Route Handler
 * Popular (6 Slots), Upcoming (6 Slots), Most Viewed (6 Slots)
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth } from "../../../../lib/auth";
import { tursoQuery, tursoQueryOne, tursoExecute } from "../../../../lib/db";

export async function GET(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth.isAdmin) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const categorySettings = await tursoQuery("SELECT * FROM hero_categories_settings");
  const allSlides = await tursoQuery("SELECT s.*, ser.slug as seriesSlug, ser.title as seriesTitle, ser.thumbnail as seriesThumbnail, ser.banner as seriesBanner FROM hero_slideshows s LEFT JOIN series ser ON s.seriesId = ser.id ORDER BY s.category ASC, s.slotIndex ASC");

  const categoriesObj: Record<string, boolean> = {
    popular: true,
    upcoming: true,
    most_viewed: true
  };

  categorySettings.forEach((cs) => {
    categoriesObj[cs.category] = Boolean(cs.isVisible);
  });

  const slidesByCategory: Record<string, any[]> = {
    popular: [],
    upcoming: [],
    most_viewed: []
  };

  allSlides.forEach((slide) => {
    const cat = slide.category || "popular";
    if (!slidesByCategory[cat]) slidesByCategory[cat] = [];
    slidesByCategory[cat].push({
      ...slide,
      _id: slide.id,
      isSlotVisible: Boolean(slide.isSlotVisible)
    });
  });

  ["popular", "upcoming", "most_viewed"].forEach((cat) => {
    const existing = slidesByCategory[cat] || [];
    const filled: any[] = [];
    for (let slot = 1; slot <= 6; slot++) {
      const found = existing.find((s) => Number(s.slotIndex) === slot);
      if (found) {
        filled.push(found);
      } else {
        filled.push({
          id: `slide_${cat}_${slot}`,
          category: cat,
          slotIndex: slot,
          seriesId: "",
          title: "",
          subtitle: "",
          description: "",
          heroImage: "",
          buttonText: "Watch Now",
          buttonLink: "",
          isSlotVisible: true
        });
      }
    }
    slidesByCategory[cat] = filled;
  });

  return NextResponse.json({
    categories: categoriesObj,
    slides: slidesByCategory
  });
}

export async function PUT(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth.isAdmin) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  try {
    const body = await req.json();

    if (body.action === "toggle_category") {
      const { category, isVisible } = z.object({
        category: z.string(),
        isVisible: z.boolean()
      }).parse(body);

      const now = new Date().toISOString();
      const existing = await tursoQueryOne("SELECT * FROM hero_categories_settings WHERE category = ?", [category]);
      if (existing) {
        await tursoExecute("UPDATE hero_categories_settings SET isVisible = ?, updatedAt = ? WHERE category = ?", [isVisible ? 1 : 0, now, category]);
      } else {
        await tursoExecute("INSERT INTO hero_categories_settings (category, isVisible, updatedAt) VALUES (?, ?, ?)", [category, isVisible ? 1 : 0, now]);
      }

      return NextResponse.json({ success: true, message: `Category '${category}' visibility updated!` });
    }

    const d = z.object({
      category: z.enum(["popular", "upcoming", "most_viewed"]),
      slotIndex: z.number().min(1).max(6),
      seriesId: z.string().optional().default(""),
      title: z.string().optional().default(""),
      subtitle: z.string().optional().default(""),
      description: z.string().optional().default(""),
      heroImage: z.string().optional().default(""),
      buttonText: z.string().optional().default("Watch Now"),
      buttonLink: z.string().optional().default(""),
      isSlotVisible: z.boolean().optional().default(true)
    }).parse(body);

    const slideId = `slide_${d.category}_${d.slotIndex}`;
    const now = new Date().toISOString();

    const existing = await tursoQueryOne("SELECT id FROM hero_slideshows WHERE category = ? AND slotIndex = ?", [d.category, d.slotIndex]);

    if (existing) {
      await tursoExecute(`
        UPDATE hero_slideshows
        SET seriesId = ?, title = ?, subtitle = ?, description = ?, heroImage = ?, buttonText = ?, buttonLink = ?, isSlotVisible = ?, updatedAt = ?
        WHERE category = ? AND slotIndex = ?
      `, [d.seriesId, d.title, d.subtitle, d.description, d.heroImage, d.buttonText, d.buttonLink, d.isSlotVisible ? 1 : 0, now, d.category, d.slotIndex]);
    } else {
      await tursoExecute(`
        INSERT INTO hero_slideshows (id, category, slotIndex, seriesId, title, subtitle, description, heroImage, buttonText, buttonLink, isSlotVisible, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [slideId, d.category, d.slotIndex, d.seriesId, d.title, d.subtitle, d.description, d.heroImage, d.buttonText, d.buttonLink, d.isSlotVisible ? 1 : 0, now]);
    }

    return NextResponse.json({ success: true, message: `Slide Slot ${d.slotIndex} in '${d.category}' updated!` });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Failed to update slideshow settings" }, { status: 400 });
  }
}
