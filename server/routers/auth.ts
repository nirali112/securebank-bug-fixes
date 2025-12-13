import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../trpc";
import { db } from "@/lib/db";
import { users, sessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { encryptSSN } from "@/utils/encryption";


export const authRouter = router({
  signup: publicProcedure
    .input(
      z.object({
        email: z.string()
              .email("Invalid email format")
              .toLowerCase()
              .refine(
                (email) => {
                  // Check for common typos
                  const commonTypos = ['.con', '.cmo', '.cm', '.co.', '.om', '.ner', '.ogr'];
                  return !commonTypos.some(typo => email.endsWith(typo));
                },
                { message: "Invalid domain extension. Check for typos (e.g., .con should be .com)" }
              ),
        password: z.string()
          .min(8, "Password must be at least 8 characters")
          .refine(
            (password) => /\d/.test(password),
            { message: "Password must contain at least one number" }
          )
          .refine(
            (password) => /[A-Z]/.test(password),
            { message: "Password must contain at least one uppercase letter" }
          )
          .refine(
            (password) => /[a-z]/.test(password),
            { message: "Password must contain at least one lowercase letter" }
          )
          .refine(
            (password) => /[!@#$%^&*(),.?":{}|<>]/.test(password),
            { message: "Password must contain at least one special character" }
          ),   
              
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        phoneNumber: z.string().refine(
          (phone) => {
            const cleaned = phone.replace(/[\s\-\(\)]/g, '');
            
            // US/Canada format (10 digits)
            if (/^\d{10}$/.test(cleaned)) {
              const areaCode = parseInt(cleaned.substring(0, 3));
              
              // Area code cannot start with 0 or 1
              if (areaCode < 200) {
                return false;
              }
              
              // Area code cannot be in 900-999 range
              if (areaCode >= 900) {
                return false;
              }
              
              return true;
            }
            
            // International format with country code
            if (/^\+\d{1,3}\d{7,14}$/.test(cleaned)) {
              return true;
            }
            
            return false;
          },
          { message: "Invalid phone number. Use valid 10-digit US/Canada number (area code 200-899) or international format with country code" }
        ),       
        dateOfBirth: z.string().refine(
              (date) => {
                const dob = new Date(date);
                const today = new Date();
                
                // Check if future date
                if (dob > today) {
                  return false;
                }
                
                // Check if at least 18 years old
                const age = today.getFullYear() - dob.getFullYear();
                const monthDiff = today.getMonth() - dob.getMonth();
                const dayDiff = today.getDate() - dob.getDate();
                
                let exactAge = age;
                if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
                  exactAge--;
                }
                
                // Must be at least 18
                if (exactAge < 18) {
                  return false;
                }
                
                // Reasonable age check
                if (age > 120) {
                  return false;
                }
                
                return true;
              },
              { message: "You must be at least 18 years old and date cannot be in the future" }
            ),
        ssn: z.string().regex(/^\d{9}$/),
        address: z.string().min(1),
        city: z.string().min(1),
        state: z.string()
          .length(2)
          .toUpperCase()
          .refine(
            (state) => {
              const validStates = [
                'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
                'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
                'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
                'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
                'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
                'DC', 'PR', 'VI', 'GU', 'AS', 'MP'
              ];
              return validStates.includes(state);
            },
            { message: "Invalid state code" }
          ),
        zipCode: z.string().regex(/^\d{5}$/),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const existingUser = await db.select().from(users).where(eq(users.email, input.email)).get();

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User already exists",
        });
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);

      await db.insert(users).values({
        ...input,
        password: hashedPassword,
        ssn: encryptSSN(input.ssn), // Encrypt SSN before storing
      });

      // Fetch the created user
      const user = await db.select().from(users).where(eq(users.email, input.email)).get();

      if (!user) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create user",
        });
      }

      // Create session
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || "temporary-secret-for-interview", {
        expiresIn: "7d",
      });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      // Invalidate all previous sessions for this user
      await db.delete(sessions).where(eq(sessions.userId, user.id));

      await db.insert(sessions).values({
        userId: user.id,
        token,
        expiresAt: expiresAt.toISOString(),
      });

      // Set cookie
      if ("setHeader" in ctx.res) {
        ctx.res.setHeader("Set-Cookie", `session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`);
      } else {
        (ctx.res as Headers).set("Set-Cookie", `session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`);
      }

      return { user: { ...user, password: undefined }, token };
    }),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = await db.select().from(users).where(eq(users.email, input.email)).get();

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid credentials",
        });
      }

      const validPassword = await bcrypt.compare(input.password, user.password);

      if (!validPassword) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid credentials",
        });
      }

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || "temporary-secret-for-interview", {
        expiresIn: "7d",
      });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Invalidate any existing sessions for this user
      await db.delete(sessions).where(eq(sessions.userId, user.id));

      await db.insert(sessions).values({
        userId: user.id,
        token,
        expiresAt: expiresAt.toISOString(),
      });

      if ("setHeader" in ctx.res) {
        ctx.res.setHeader("Set-Cookie", `session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`);
      } else {
        (ctx.res as Headers).set("Set-Cookie", `session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`);
      }

      return { user: { ...user, password: undefined }, token };
    }),

logout: publicProcedure.mutation(async ({ ctx }) => {
  let token: string | undefined;
  
  // Get token using the same logic as trpc.ts context
  let cookieHeader = "";
  if (ctx.req.headers.cookie) {
    cookieHeader = ctx.req.headers.cookie;
  } else if (ctx.req.headers.get) {
    cookieHeader = ctx.req.headers.get("cookie") || "";
  }
  
  const cookiesObj = Object.fromEntries(
    cookieHeader
      .split("; ")
      .filter(Boolean)
      .map((c: string) => {
        const [key, ...val] = c.split("=");
        return [key, val.join("=")];
      })
  );
  
  token = cookiesObj.session;
  
  if (ctx.user && token) {
    try {
      await db.delete(sessions).where(eq(sessions.token, token));
    } catch (error) {
      console.error("Error deleting session:", error);
    }
  }

  // Clear the cookie
  if ("setHeader" in ctx.res) {
    ctx.res.setHeader("Set-Cookie", `session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
  } else {
    (ctx.res as Headers).set("Set-Cookie", `session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
  }

  return { 
    success: true, 
    message: ctx.user ? "Logged out successfully" : "No active session" 
  };
}),
});
