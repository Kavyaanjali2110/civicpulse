import React from 'react';
import LoginForm from '../components/auth/LoginForm';

export default function FieldCrewLogin() {
  return (
    <div className="py-8 sm:py-12">
      <LoginForm role="field_crew" />
    </div>
  );
}
