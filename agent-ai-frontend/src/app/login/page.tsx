'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { signInWithGoogle, signInWithMicrosoft, signInWithEmail, registerWithEmail } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { currentUser } = useAuth();
  const router = useRouter();

  // Redirect if already authenticated
  useEffect(() => {
    if (currentUser) {
      router.push('/dashboard');
    }
  }, [currentUser, router]);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();
      router.push('/dashboard');
    } catch (error) {
      console.error('Google sign-in error:', error);
      toast.error('Failed to sign in with Google');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicrosoftSignIn = async () => {
    try {
      setIsLoading(true);
      await signInWithMicrosoft();
      router.push('/dashboard');
    } catch (error) {
      console.error('Microsoft sign-in error:', error);
      toast.error('Failed to sign in with Microsoft');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await signInWithEmail(email, password);
      router.push('/dashboard');
    } catch (error) {
      console.error('Email sign-in error:', error);
      toast.error('Failed to sign in. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await registerWithEmail(email, password);
      router.push('/dashboard');
      toast.success('Account created successfully!');
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error?.message || 'Failed to register. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-background to-muted/20">
      <Card className="mx-auto max-w-md w-full shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Agent AI</CardTitle>
          <CardDescription>
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <Button 
              variant="outline" 
              type="button" 
              disabled={isLoading} 
              onClick={handleGoogleSignIn} 
              className="flex items-center justify-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 186.69 190.5"
              >
                <g transform="translate(1184.583 765.171)">
                  <path
                    d="M-1089.333-687.239v36.888h51.262c-2.251 11.863-9.006 21.908-19.137 28.662l30.913 23.986c18.011-16.625 28.402-41.044 28.402-70.052 0-6.754-.606-13.249-1.732-19.483z"
                    fill="#4285f4"
                  />
                  <path
                    d="M-1142.714-651.791l-6.972 5.337-24.679 19.223c15.673 31.086 47.796 52.561 85.03 52.561 25.717 0 47.278-8.486 63.038-23.033l-30.913-23.986c-8.486 5.715-19.31 9.179-32.125 9.179-24.765 0-45.806-16.712-53.34-39.226z"
                    fill="#34a853"
                  />
                  <path
                    d="M-1174.365-712.61c-6.494 12.815-10.217 27.276-10.217 42.689s3.723 29.874 10.217 42.689c0 .086 31.693-24.592 31.693-24.592-1.905-5.715-3.031-11.776-3.031-18.098s1.126-12.383 3.031-18.098z"
                    fill="#fbbc05"
                  />
                  <path
                    d="M-1089.333-727.244c14.028 0 26.497 4.849 36.455 14.201l27.276-27.276c-16.539-15.413-38.013-24.852-63.731-24.852-37.234 0-69.359 21.388-85.032 52.561l31.692 24.592c7.533-22.514 28.575-39.226 53.34-39.226z"
                    fill="#ea4335"
                  />
                </g>
              </svg>
              Sign in with Google
            </Button>

            <Button 
              variant="outline" 
              type="button" 
              disabled={isLoading} 
              onClick={handleMicrosoftSignIn}
              className="flex items-center justify-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 23 23"
              >
                <path fill="#f3f3f3" d="M0 0h23v23H0z" />
                <path fill="#f35325" d="M1 1h10v10H1z" />
                <path fill="#81bc06" d="M12 1h10v10H12z" />
                <path fill="#05a6f0" d="M1 12h10v10H1z" />
                <path fill="#ffba08" d="M12 12h10v10H12z" />
              </svg>
              Sign in with Microsoft
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <form onSubmit={handleEmailSignIn} className="space-y-4 mt-4">
                  <div className="grid gap-2">
                    <Input
                      id="email"
                      placeholder="Email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect="off"
                      disabled={isLoading}
                      required
                    />
                    <Input
                      id="password"
                      placeholder="Password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <Button disabled={isLoading} className="w-full" type="submit">
                    {isLoading ? 'Signing In...' : 'Sign In with Email'}
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="register">
                <form onSubmit={handleEmailRegister} className="space-y-4 mt-4">
                  <div className="grid gap-2">
                    <Input
                      id="register-email"
                      placeholder="Email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect="off"
                      disabled={isLoading}
                      required
                    />
                    <Input
                      id="register-password"
                      placeholder="Password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <Button disabled={isLoading} className="w-full" type="submit">
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-center text-sm text-muted-foreground mx-auto">
            By continuing, you agree to the terms of service and privacy policy
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
