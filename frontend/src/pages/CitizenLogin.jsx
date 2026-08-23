import React from 'react';
import LoginForm from '../components/auth/LoginForm';

export default function CitizenLogin() {
  return (
    <div className="py-8 sm:py-12">
      <LoginForm role="citizen" />
    </div>
  );
}
