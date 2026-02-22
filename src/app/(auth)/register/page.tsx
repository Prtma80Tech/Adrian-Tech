'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LineChart, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function RegisterPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        gmail: '',
        password: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // 1. Sign up user in Supabase Auth
            const { data, error: signUpError } = await supabase.auth.signUp({
                email: formData.gmail,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.username,
                    }
                }
            });

            if (signUpError) throw signUpError;

            if (data?.user) {
                // 2. Create profile in 'profiles' table
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert([
                        {
                            id: data.user.id,
                            name: formData.username,
                            email: formData.gmail,
                            updated_at: new Date().toISOString()
                        }
                    ]);

                if (profileError) {
                    console.error("Profile creation error:", profileError);
                    // We don't throw here strictly as Auth succeeded, but it's bad
                }

                // 3. Set session unlock and redirect
                sessionStorage.setItem('vantage_unlocked', 'true');
                alert("Account created successfully! Welcome to VantageFlow.");
                router.push('/dashboard');
            }
        } catch (error: any) {
            console.error("Registration error:", error);
            alert(error.message || "Gagal membuat akun. Silakan coba lagi.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
            <div className="w-full max-w-md space-y-8 rounded-2xl border border-border bg-card p-10 shadow-2xl">
                <div className="text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                        <LineChart className="h-8 w-8 text-primary" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Create account</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Register with your Gmail account
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div className="relative">
                            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Username</label>
                            <div className="relative mt-1">
                                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="text"
                                    required
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    placeholder="Enter username"
                                    className="w-full rounded-xl border border-border bg-secondary/30 py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                />
                            </div>
                        </div>

                        <div className="relative">
                            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Gmail Account</label>
                            <div className="relative mt-1">
                                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="email"
                                    required
                                    value={formData.gmail}
                                    onChange={(e) => setFormData({ ...formData, gmail: e.target.value })}
                                    placeholder="your-email@gmail.com"
                                    className="w-full rounded-xl border border-border bg-secondary/30 py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                />
                            </div>
                        </div>

                        <div className="relative">
                            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Password Gmail</label>
                            <div className="relative mt-1">
                                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="password"
                                    required
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="••••••••"
                                    className="w-full rounded-xl border border-border bg-secondary/30 py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
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
                                Register Now
                                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </>
                        )}
                    </button>
                </form>

                <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <Link href="/login" className="font-bold text-primary hover:underline">
                        Login
                    </Link>
                </p>
            </div>
        </div>
    );
}
