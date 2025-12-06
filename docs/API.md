UniBot LMS API DocumentationThis documentation outlines the backend API routes available in the UniBot Learning Management System. All routes are protected and require a valid Supabase session cookie.AuthenticationAll API routes are protected by Next.js Middleware.Headers: Requests must include the session cookie automatically handled by the browser.Error Response (401): { "error": "Unauthorized" }1. Chat CompletionStreams AI responses for the chat interface (Global or Document-specific).Endpoint: POST /api/chatRate Limit: 50 requests / hourRequest Body{
  "messages": [
    {
      "role": "user",
      "content": "Explain the concept of mitosis."
    },
    {
      "role": "assistant",
      "content": "Mitosis is a process..."
    }
  ],
  "documentContext": "Optional string containing PDF text content for RAG"
}
ResponseType: text/plain (Streaming)Content: The AI response streamed chunk by chunk.2. Generate QuizCreates a structured quiz based on provided text content.Endpoint: POST /api/generate-quizRate Limit: 10 requests / hourRequest Body{
  "documentText": "The full text content to generate quiz from...",
  "topic": "Cell Biology",
  "difficulty": "Medium", // Options: "Easy", "Medium", "Hard"
  "numQuestions": 5,
  "type": "Multiple Choice"
}
Response{
  "quiz": [
    {
      "question": "What is the powerhouse of the cell?",
      "options": ["Nucleus", "Mitochondria", "Ribosome", "Golgi"],
      "correct_answer": "Mitochondria",
      "explanation": "Mitochondria generate most of the chemical energy..."
    }
  ]
}
3. Grade AssignmentEvaluates a student's text submission against an assignment description.Endpoint: POST /api/grade-assignmentRate Limit: 20 requests / hourRequest Body{
  "assignmentTitle": "History Essay",
  "assignmentDescription": "Write about the causes of WW2...",
  "studentText": "The extracted text from the student's PDF submission...",
  "maxPoints": 100
}
Response{
  "score": 85,
  "feedback": "Good analysis of political factors...",
  "is_ai_generated": false,
  "breakdown": {
    "reasoning": "Detailed explanation of grading...",
    "strengths": ["Clear thesis", "Good citations"],
    "weaknesses": ["Conclusion was abrupt"]
  }
}
4. Process Manual QuestionsParses raw text questions into a structured quiz format, optionally improving them with AI.Endpoint: POST /api/process-manual-questionsRate Limit: Shared with Quiz GenerationRequest Body{
  "questions": "1. What is 2+2? a) 3 b) 4 ...",
  "action": "convert", // Options: "convert" (formatting only) or "enhance" (AI improvements)
  "topicId": "uuid-of-topic"
}
Response{
  "quiz": [
    {
      "question": "What is 2 + 2?",
      "options": ["3", "4", "5", "6"],
      "correct_answer": "4",
      "explanation": "Basic arithmetic."
    }
  ]
}
Error HandlingAll API routes follow a standard error format:{
  "error": "Description of the error",
  "details": "Optional validation details (Zod errors)"
}
Common Status Codes:200: Success400: Bad Request (Validation failed)401: Unauthorized (Not logged in)429: Too Many Requests (Rate limit exceeded)500: Internal Server Error (AI provider failure)