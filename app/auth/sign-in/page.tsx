import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function SignInPage() {
  const supabase = createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect('/');
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-4">Sign in</h1>
      <form
        className="space-y-4"
        action="/auth/callback"
        method="post"
      >
        <label className="block">
          <span className="text-sm text-gray-700">Email</span>
          <input
            type="email"
            name="email"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="you@example.com"
          />
        </label>
        <button
          type="submit"
          className="w-full inline-flex justify-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Send magic link
        </button>
      </form>
    </div>
  );
}


