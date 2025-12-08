import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { env } from '@/lib/env';
import { createClient } from "@/lib/supabase/server";

const genAI = new GoogleGenerativeAI(env.GOOGLE_GENERATIVE_AI_API_KEY || "");

export async function POST(req: Request) {
  try {
    // 1. Get both contexts
    const { syllabusText, mainHandoutTocText, courseId } = await req.json();

    if (!syllabusText) throw new Error("Syllabus text missing");

    // 2. Prompt Gemini (The "Cross-Reference" Logic)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });
    
    const prompt = `
      You are an expert Curriculum Designer.
      
      TASK:
      1. Analyze the SYLLABUS below to identify the weekly topics.
      2. For each topic, look at the TEXTBOOK TABLE OF CONTENTS (TOC) to find the corresponding page range.
      
      SYLLABUS CONTEXT:
      ${syllabusText.slice(0, 15000)}

      TEXTBOOK TOC CONTEXT:
      ${mainHandoutTocText ? mainHandoutTocText.slice(0, 20000) : "No textbook provided."}

      INSTRUCTIONS:
      - If you find the topic in the Textbook TOC, use those page numbers.
      - If you cannot find the topic in the Textbook (or no textbook provided), set start_page and end_page to 0.
      - Ignore "Recommended Books" or bibliography lists in the syllabus; focus on the Schedule/Weekly Plan.

      Return JSON Array:
      [
        { 
          "week_number": 1, 
          "title": "Topic Title", 
          "description": "Brief summary",
          "start_page": number,
          "end_page": number
        }
      ]
    `;

    const result = await model.generateContent(prompt);
    const topics = JSON.parse(result.response.text());

    // 3. Save to DB
    const supabase = await createClient();
    
    // Fetch Main Handout ID to link
    const { data: handout } = await supabase
        .from('materials')
        .select('id')
        .eq('course_id', courseId)
        .eq('is_main_handout', true)
        .single();

    const { error } = await supabase.from('course_topics').insert(
      topics.map((t: any) => ({
        course_id: courseId,
        material_id: handout?.id || null, // Link to the textbook
        week_number: t.week_number,
        title: t.title,
        description: t.description,
        start_page: t.start_page,
        end_page: t.end_page
      }))
    );

    if (error) throw error;

    return NextResponse.json({ success: true, count: topics.length });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}