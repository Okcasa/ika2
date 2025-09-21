
'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { signIn, signUp } from '@/app/auth/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Logo } from '@/components/logo';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { useEffect, useRef } from 'react';

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Submitting...' : children}
    </Button>
  );
}

export default function LoginPage() {
  const [signInState, signInAction] = useFormState(signIn, { message: '' });
  const [signUpState, signUpAction] = useFormState(signUp, { message: '' });

  const signInFormRef = useRef<HTMLFormElement>(null);
  const signUpFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (signInState.message) {
      // Potentially handle form reset or other side effects
    }
  }, [signInState]);

    useEffect(() => {
    if (signUpState.message) {
      // Potentially handle form reset or other side effects
    }
  }, [signUpState]);


  return (
    <main className="flex items-center justify-center min-h-screen bg-background p-4">
        <div className="w-full max-w-md mx-auto">
            <div className="flex justify-center mb-6">
                <Logo className="h-10 w-10 text-primary" />
            </div>
            <Tabs defaultValue="sign-in" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="sign-in">Sign In</TabsTrigger>
                <TabsTrigger value="sign-up">Sign Up</TabsTrigger>
                </TabsList>
                <TabsContent value="sign-in">
                <Card>
                    <CardHeader>
                        <CardTitle>Sign In</CardTitle>
                        <CardDescription>Enter your credentials to access your dashboard.</CardDescription>
                    </CardHeader>
                    <form ref={signInFormRef} action={signInAction}>
                        <CardContent className="space-y-4">
                            {signInState?.message && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Error</AlertTitle>
                                    <AlertDescription>{signInState.message}</AlertDescription>
                                </Alert>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="email-signin">Email</Label>
                                <Input id="email-signin" name="email" type="email" placeholder="m@example.com" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password-signin">Password</Label>
                                <Input id="password-signin" name="password" type="password" required />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <SubmitButton>Sign In</SubmitButton>
                        </CardFooter>
                    </form>
                </Card>
                </TabsContent>
                <TabsContent value="sign-up">
                <Card>
                    <CardHeader>
                        <CardTitle>Sign Up</CardTitle>
                        <CardDescription>Create a new account to get started.</CardDescription>
                    </CardHeader>
                     <form ref={signUpFormRef} action={signUpAction}>
                        <CardContent className="space-y-4">
                            {signUpState?.message && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Error</AlertTitle>
                                    <AlertDescription>{signUpState.message}</AlertDescription>
                                </Alert>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="email-signup">Email</Label>
                                <Input id="email-signup" name="email" type="email" placeholder="m@example.com" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password-signup">Password</Label>
                                <Input id="password-signup" name="password" type="password" required />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <SubmitButton>Sign Up</SubmitButton>
                        </CardFooter>
                    </form>
                </Card>
                </TabsContent>
            </Tabs>
        </div>
    </main>
  );
}
