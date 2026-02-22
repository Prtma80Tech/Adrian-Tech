'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LineChart, Mail, Lock, ArrowRight, ShieldCheck, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
    const router = useRouter();
    const [usePin, setUsePin] = useState(false);
    const [pin, setPin] = useState(['', '', '', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Check if user is already logged in to Auth
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // If logged in, check if they have a PIN set
                const { data } = await supabase.from('profiles').select('pin').eq('id', user.id).single();
                if (data?.pin) {
                    setUsePin(true);
                } else {
                    // No PIN, unlock session
                    sessionStorage.setItem('vantage_unlocked', 'true');
                    router.push('/dashboard');
                }
            }
        };
        checkAuth();
    }, []);

    const handlePinChange = (index: number, value: string) => {
        if (value.length > 1) value = value.slice(-1);
        if (!/^\d*$/.test(value)) return;

        const newPin = [...pin];
        newPin[index] = value;
        setPin(newPin);

        if (value && index < 5) {
            pinRefs.current[index + 1]?.focus();
        }

        if (newPin.every(digit => digit !== '')) {
            handlePinSubmit(newPin.join(''));
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !pin[index] && index > 0) {
            pinRefs.current[index - 1]?.focus();
        }
    };

    const handlePinSubmit = async (val: string) => {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('pin')
                    .eq('id', user.id)
                    .single();

                if (!error && data?.pin === val) {
                    sessionStorage.setItem('vantage_unlocked', 'true');
                    router.push('/dashboard');
                } else {
                    alert('Invalid PIN');
                    setPin(['', '', '', '', '', '']);
                    pinRefs.current[0]?.focus();
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            if (data?.user) {
                // Check if they need PIN verification
                const { data: profile } = await supabase.from('profiles').select('pin').eq('id', data.user.id).single();

                if (profile?.pin) {
                    setUsePin(true);
                } else {
                    sessionStorage.setItem('vantage_unlocked', 'true');
                    router.push('/dashboard');
                }
            }
        } catch (error: any) {
            alert(error.message || "Gagal login. Cek email dan password Anda.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
            <div className="w-full max-w-md space-y-8 rounded-2xl border border-border bg-card p-10 shadow-2xl">
                <div className="text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                        {usePin ? <ShieldCheck className="h-8 w-8 text-primary" /> : <LineChart className="h-8 w-8 text-primary" />}
                    </div>
                    <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                        {usePin ? 'Verify PIN' : 'Welcome back'}
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {usePin ? 'Enter your 6-digit access code' : 'Sign in to your VantageFlow account'}
                    </p>
                </div>

                {usePin ? (
                    <div className="mt-8 space-y-8">
                        <div className="flex justify-between gap-2">
                            {pin.map((digit, idx) => (
                                <input
                                    key={idx}
                                    ref={(el) => { pinRefs.current[idx] = el; }}
                                    type="text"
                                    inputMode="numeric"
                                    disabled={isLoading}
                                    value={digit}
                                    onChange={(e) => handlePinChange(idx, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(idx, e)}
                                    className="h-12 w-full rounded-xl border border-border bg-secondary/30 text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all disabled:opacity-50"
                                />
                            ))}
                        </div>

                        {isLoading && (
                            <div className="flex justify-center">
                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            </div>
                        )}

                        <button
                            onClick={() => setUsePin(false)}
                            className="w-full text-center text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                            Log in with Email instead
                        </button>
                    </div>
                ) : (
                    <form className="mt-8 space-y-6" onSubmit={handleEmailLogin}>
                        <div className="space-y-4">
                            <div className="relative">
                                <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Gmail Account</label>
                                <div className="relative mt-1">
                                    <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="your-email@gmail.com"
                                        className="w-full rounded-xl border border-border bg-secondary/30 py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-semibold"
                                    />
                                </div>
                            </div>

                            <div className="relative">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Password Gmail</label>
                                    <Link href="#" className="text-xs text-primary hover:underline">Forgot?</Link>
                                </div>
                                <div className="relative mt-1">
                                    <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full rounded-xl border border-border bg-secondary/30 py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-semibold"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative flex w-full justify-center rounded-xl bg-primary py-3 px-4 text-sm font-bold text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : (
                                <>
                                    Sign in
                                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                </>
                            )}
                        </button>
                    </form>
                )}

                <p className="text-center text-sm text-muted-foreground">
                    Don't have an account?{' '}
                    <Link href="/register" className="font-bold text-primary hover:underline">
                        Register now
                    </Link>
                </p>
            </div>
        </div>
    );
}
