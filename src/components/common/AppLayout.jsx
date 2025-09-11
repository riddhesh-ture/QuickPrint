import React from 'react';
import { Outlet } from 'react-router-dom';

const AppLayout = () => {
  return (
    <div>
      {/* A navbar could go here */}
      <main>
        <Outlet />
      </main>
      {/* A footer could go here */}
    </div>
  );
};

export default AppLayout;