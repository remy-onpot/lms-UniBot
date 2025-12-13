import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod'; // Strict Schema Validation
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { syllabusText, mainHandoutTocText, courseId } = await req.json();

    if (!syllabusText || syllabusText.length < 50) {
      return NextResponse.json(
        { error: "Syllabus content is empty. This might be a scanned PDF. Please upload a text-based PDF." }, 
        { status: 400 }
      );
    }

    // 1. Define the Strict Schema (The AI cannot break this)
    const syllabusSchema = z.object({
      topics: z.array(z.object({
        week_number: z.number(),
        title: z.string(),
        description: z.string(),
        learning_objectives: z.array(z.string()).optional(), // Bonus feature
        start_page: z.number().default(0),
        end_page: z.number().default(0)
      }))
    });

    // 2. The Ghostwriter Prompt
    const { object } = await generateObject({
      model: google('gemini-2.5-pro-latest'), // Use Pro for better reasoning on "Messy" outlines
      schema: syllabusSchema,
      prompt: `
        You are an expert University Curriculum Designer.
        
        TASK:
        1. Extract the weekly schedule from the SYLLABUS TEXT.
        2. Cross-reference with the TEXTBOOK TOC to find page ranges.
        
        SYLLABUS:
        ${syllabusText.slice(0, 20000)}

        TEXTBOOK TOC:
        ${mainHandoutTocText ? mainHandoutTocText.slice(0, 10000) : "No textbook provided."}

        RULES:
        - If the syllabus lists dates instead of weeks, infer the week number (1, 2, 3...).
        - If you can't find the page range in the TOC, leave start_page/end_page as 0.
        - Ignore bibliography or grading policies.
      `,
    });

    // 3. Save to DB (Cleaner logic)
    const supabase = await createClient();
    
    // Get the textbook ID
    const { data: handout } = await supabase
        .from('materials')
        .select('id')
        .eq('course_id', courseId)
        .eq('is_main_handout', true)
        .single();

    const dbPayload = object.topics.map((t) => ({
      course_id: courseId,
      material_id: handout?.id || null,
      week_number: t.week_number,
      title: t.title,
      description: t.description,
      // Store learning objectives in description if you don't have a column for it
      // or simply omit them if your DB schema doesn't support it yet
      start_page: t.start_page,
      end_page: t.end_page
    }));

    const { error } = await supabase.from('course_topics').insert(dbPayload);

    if (error) throw error;

    return NextResponse.json({ success: true, count: object.topics.length });

  } catch (error: any) {
    console.error("Ghostwriter Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate syllabus" }, 
      { status: 500 }
    );
  }
}