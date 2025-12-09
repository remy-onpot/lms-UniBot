import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { env } from '@/lib/env';
import { z } from "zod"; 
import { AppError, handleAPIError } from "@/lib/error-handler";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { BUSINESS_LOGIC } from "@/lib/constants";

const genAI = new GoogleGenerativeAI(env.GOOGLE_GENERATIVE_AI_API_KEY || "");
export const runtime = "edge";

const chatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().trim().min(1).max(10000),
  })).min(1),
  materialId: z.string().uuid(),
  pageRange: z.string().optional(),
  // ✅ REQUIRE topicId for security context (if accessing specific week)
  topicId: z.string().uuid().optional(), 
  topicContext: z.object({
    title: z.string(),
    description: z.string().optional().nullable()
  }).optional().nullable()
});

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // 1. Auth Check
    if (!user) throw new AppError("Unauthorized", 401);

    // 2. Rate Limit
    const isAllowed = await checkRateLimit(user.id, 'chat');
    if (!isAllowed) throw new AppError("Rate limit exceeded.", 429);

    const body = await req.json();
    const { messages, materialId, pageRange, topicId, topicContext } = chatRequestSchema.parse(body);

    // 3. Fetch Material & Course Context
    const { data: material } = await supabase
      .from('materials')
      .select('id, content_text, course:courses(id, class_id)')
      .eq('id', materialId)
      .single();

    if (!material?.content_text) throw new AppError("Material content missing", 404);

    // 4. 🛡️ SECURITY CORE: Determine Access Rights
    let hasAccess = false;
    const now = new Date().toISOString();

    // A. Check if Lecturer (Owner)
    const { data: isLecturer } = await supabase
        .from('classes')
        .select('id')
        // @ts-ignore
        .eq('id', material.course.class_id)
        .eq('lecturer_id', user.id)
        .maybeSingle();

    if (isLecturer) hasAccess = true;

    // B. Check Student Payment (Single or Bundle)
    if (!hasAccess) {
        const { data: access } = await supabase
          .from('student_course_access')
          .select('id')
          .eq('student_id', user.id)
          // @ts-ignore
          .or(`course_id.eq.${material.course.id},class_id.eq.${material.course.class_id}`)
          .gt('expires_at', now)
          .maybeSingle();
        
        if (access) hasAccess = true;
    }

    // C. Check "Free Week" Logic (The Loophole Closer)
    // If they haven't paid, we ONLY allow access if the Topic is Week 1 or 2.
    if (!hasAccess && topicId) {
        const { data: topic } = await supabase
            .from('course_topics')
            .select('week_number')
            .eq('id', topicId)
            .single();

        // Strict Check: Is this actually a free week?
        if (topic && topic.week_number <= BUSINESS_LOGIC.COHORT.free_weeks) {
            hasAccess = true; // ✅ Allow Trial Access
        }
    }

    // 🚨 FINAL VERDICT
    if (!hasAccess) {
        throw new AppError("🔒 Content Locked. Upgrade to access Week 3+.", 403);
    }

    // 5. RAG Logic: Context Slicing
    let contextText = material.content_text;

    if (pageRange) {
       const [start, end] = pageRange.split('-').map(Number);
       if (!isNaN(start) && !isNaN(end)) {
          const pages = material.content_text.split(/--- Page \d+ ---/);
          const selectedPages = pages.slice(start, end + 1);
          if (selectedPages.length > 0) {
              contextText = selectedPages.join("\n");
          }
       }
    }

    // 6. AI Persona & Generation
    let systemInstruction = `You are UniBot, an expert AI Teaching Assistant.`;
    
    if (topicContext?.title) {
      systemInstruction += `
      \nCURRENT LESSON: "${topicContext.title}"
      ${topicContext.description ? `Overview: "${topicContext.description}"` : ''}
      
      YOUR GOAL: Help the student understand THIS specific weekly topic using the provided text.
      `;
    }

    systemInstruction += `\n\nREFERENCE TEXT (${pageRange ? `Pages ${pageRange}` : 'Full Document'}):\n${contextText.slice(0, 80000)}`;

    const conversationContents = messages.map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
    }));

    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash", 
        systemInstruction: systemInstruction 
    });

    const result = await model.generateContentStream({ contents: conversationContents });

    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) controller.enqueue(new TextEncoder().encode(text));
        }
        controller.close();
      },
    });

    return new NextResponse(stream, { headers: { "Content-Type": "text/plain" } });

  } catch (error) {
    return handleAPIError(error);
  }
}