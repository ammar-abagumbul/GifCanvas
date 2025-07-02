import { Navigate, useRoutes } from 'react-router-dom';

import { Suspense } from 'react';
import Password from '@/pages/password';
import Stepper from '@/pages/stepper';
import { Navbar } from '@/components/navbar';

// ----------------------------------------------------------------------

export function Router() {
  return useRoutes([
    {
      path: '/',
      element: (
        /* TODO: Add fallback route */
        <Suspense>
          <Navbar />
          <Password />
        </Suspense>
      ),
    },

    {
      path: '/stepper',
      element: <Stepper />,
    },

    // No match
    { path: '*', element: <Navigate to="/404" replace /> },
  ]);
}
