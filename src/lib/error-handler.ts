import { NextResponse } from "next/server";
import { z } from "zod";

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function handleAPIError(error: unknown) {
  console.error("API Error:", error);

  // Handle custom AppError
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode }
    );
  }

  // Handle Zod validation errors
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: "Validation failed", details: error.issues },
      { status: 400 }
    );
  }

  // Handle unknown error safely
  const message =
    error instanceof Error ? error.message : "Internal server error";

  return NextResponse.json({ error: message }, { status: 500 });
}
