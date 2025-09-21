
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const emailSchema = z.string().email();
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters long');

export async function signIn(prevState: any, formData: FormData) {
  const supabase = createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const emailValidation = emailSchema.safeParse(email);
  if (!emailValidation.success) {
    return {
      message: 'Invalid email address.',
    }
  }

  const passwordValidation = passwordSchema.safeParse(password);
  if (!passwordValidation.success) {
    return {
      message: passwordValidation.error.errors[0].message,
    }
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
     return {
        message: error.message,
     }
  }

  redirect('/dashboard')
}

export async function signUp(prevState: any, formData: FormData) {
  const supabase = createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const emailValidation = emailSchema.safeParse(email);
  if (!emailValidation.success) {
    return {
      message: 'Invalid email address.',
    }
  }

  const passwordValidation = passwordSchema.safeParse(password);
  if (!passwordValidation.success) {
    return {
      message: passwordValidation.error.errors[0].message,
    }
  }
  
  const { error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    return {
        message: error.message,
    }
  }
  
  // Supabase sends a confirmation email. For this app, we'll just sign them in.
  const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
  });

  if (signInError) {
      return {
          message: signInError.message,
      }
  }

  redirect('/dashboard')
}

export async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    redirect('/login');
}

