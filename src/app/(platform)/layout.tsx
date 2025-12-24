'use client';

import { Sidebar } from "@/components/sidebar";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
          router.push('/');
        } else {
          setLoading(false);
        }
      } catch (e) {
        console.error("Auth check failed", e);
        router.push('/');
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F2F2F2]">
        <Loader2 className="h-8 w-8 animate-spin text-stone-800" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F2F2F2]">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-8 overflow-y-auto h-screen">
        {children}
      </main>
    </div>
  );
}
