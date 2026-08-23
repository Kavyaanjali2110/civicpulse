import React from 'react';
import LoginForm from '../components/auth/LoginForm';

export default function GovernmentLogin() {
  return (
    <div className="py-8 sm:py-12">
      <LoginForm role="government" />
    </div>
  );
}
