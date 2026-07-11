import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { supabase } from '@/integrations/supabase/client'

const SIGN_IN_ROUTE = '/auth'

export const Route = createFileRoute('/_authenticated')({
  ssr: false,
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw redirect({ to: SIGN_IN_ROUTE })
    }
    return { user: session.user }
  },
  component: () => <Outlet />,
})
